import React from "react";

import { useAds } from "@/src/hooks/useAds";
import { useAtomValue } from "jotai";
import { isPremiumAtom } from "@/src/state/atoms";

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const isPremium = useAtomValue(isPremiumAtom);

  if (!isPremium) {
    return <AdsProviderInner>{children}</AdsProviderInner>;
  }

  return <>{children}</>;
}

function AdsProviderInner({ children }: { children: React.ReactNode }) {
  useAds();
  return <>{children}</>;
}
