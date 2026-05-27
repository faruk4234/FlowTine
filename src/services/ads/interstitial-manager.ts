import { AD_UNIT_IDS, INTERSTITIAL_MIN_GAP_MS } from "./ad-units";
import { getAdsModule } from "./google-mobile-ads";

type Unsubscribe = () => void;

type InterstitialInstance = {
  show: () => Promise<void>;
  load: () => void;
  addAdEventListener: (
    type: unknown,
    listener: () => void,
  ) => Unsubscribe;
};

class InterstitialAdManager {
  private ad: InterstitialInstance | null = null;
  private loaded = false;
  private loading = false;
  private lastShownAt = 0;
  private unsubscribers: Unsubscribe[] = [];
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  preload(): void {
    void this.loadAd();
  }

  private async loadAd(): Promise<void> {
    if (this.loading || this.loaded) return;

    const mod = await getAdsModule();
    if (!mod) return;

    this.clearListeners();
    this.loading = true;
    this.loaded = false;

    const { InterstitialAd, AdEventType } = mod;
    const ad = InterstitialAd.createForAdRequest(
      AD_UNIT_IDS.interstitial,
    ) as InterstitialInstance;
    this.ad = ad;

    const onLoaded = () => {
      this.loaded = true;
      this.loading = false;
    };

    const onClosed = () => {
      this.loaded = false;
      this.loading = false;
      this.preload();
    };

    const onError = () => {
      this.loaded = false;
      this.loading = false;
      this.scheduleRetry();
    };

    this.unsubscribers = [
      ad.addAdEventListener(AdEventType.LOADED, onLoaded),
      ad.addAdEventListener(AdEventType.CLOSED, onClosed),
      ad.addAdEventListener(AdEventType.ERROR, onError),
    ];

    ad.load();
  }

  private scheduleRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.loaded && !this.loading) {
        this.preload();
      }
    }, 30_000);
  }

  private clearListeners(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }

  async showIfReady(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastShownAt < INTERSTITIAL_MIN_GAP_MS) return false;
    if (!this.ad || !this.loaded) return false;

    try {
      await this.ad.show();
      this.lastShownAt = now;
      this.loaded = false;
      return true;
    } catch {
      this.loaded = false;
      this.scheduleRetry();
      return false;
    }
  }

  reset(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.clearListeners();
    this.ad = null;
    this.loaded = false;
    this.loading = false;
    this.lastShownAt = 0;
  }
}

export const interstitialAdManager = new InterstitialAdManager();
