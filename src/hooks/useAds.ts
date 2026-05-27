import { usePathname } from "expo-router";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { INTERSTITIAL_FOREGROUND_INTERVAL_MS } from "@/src/services/ads/ad-units";
import { canShowInterstitial } from "@/src/services/ads/ad-policy";
import { initializeGoogleMobileAds } from "@/src/services/ads/google-mobile-ads";
import { interstitialAdManager } from "@/src/services/ads/interstitial-manager";
import { isPremiumAtom, timerRunningAtom } from "@/src/state/atoms";

const TICK_MS = 1_000;

export function useAds(): void {
  const isPremium = useAtomValue(isPremiumAtom);
  const timerRunning = useAtomValue(timerRunningAtom);
  const pathname = usePathname();

  const foregroundMsRef = useRef(0);
  const lastTickAtRef = useRef<number | null>(null);
  const showingRef = useRef(false);

  useEffect(() => {
    if (isPremium) {
      interstitialAdManager.reset();
      return;
    }

    let cancelled = false;

    void (async () => {
      const ready = await initializeGoogleMobileAds();
      if (!cancelled && ready) {
        interstitialAdManager.preload();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPremium]);

  useEffect(() => {
    if (isPremium) return;

    const syncTick = (now: number) => {
      if (lastTickAtRef.current !== null) {
        foregroundMsRef.current += now - lastTickAtRef.current;
      }
      lastTickAtRef.current = now;
    };

    const pauseTick = () => {
      if (lastTickAtRef.current !== null) {
        foregroundMsRef.current += Date.now() - lastTickAtRef.current;
        lastTickAtRef.current = null;
      }
    };

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === "active") {
        lastTickAtRef.current = Date.now();
      } else {
        pauseTick();
      }
    };

    const sub = AppState.addEventListener("change", onAppStateChange);

    if (AppState.currentState === "active") {
      lastTickAtRef.current = Date.now();
    }

    const interval = setInterval(() => {
      if (AppState.currentState !== "active") return;
      if (showingRef.current) return;

      const now = Date.now();
      const safe = canShowInterstitial({ pathname, timerRunning });

      if (!safe) {
        lastTickAtRef.current = now;
        return;
      }

      syncTick(now);

      if (foregroundMsRef.current < INTERSTITIAL_FOREGROUND_INTERVAL_MS) {
        return;
      }

      showingRef.current = true;
      foregroundMsRef.current = 0;

      void interstitialAdManager.showIfReady().finally(() => {
        showingRef.current = false;
        lastTickAtRef.current = Date.now();
      });
    }, TICK_MS);

    return () => {
      pauseTick();
      clearInterval(interval);
      sub.remove();
    };
  }, [isPremium, pathname, timerRunning]);
}
