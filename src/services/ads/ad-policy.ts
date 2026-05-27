/**
 * Routes / states where interstitials are allowed (idle browsing only).
 */
export function isInterstitialSafeRoute(pathname: string): boolean {
  if (!pathname) return false;

  const blocked =
    pathname.includes("/timer") ||
    pathname.includes("paywall") ||
    pathname.includes("onboarding") ||
    pathname.includes("legal-webview");

  if (blocked) return false;

  return (
    pathname === "/" ||
    pathname.includes("/home") ||
    pathname.includes("/settings") ||
    pathname.includes("/routine")
  );
}

export function canShowInterstitial(opts: {
  pathname: string;
  timerRunning: boolean;
}): boolean {
  if (opts.timerRunning) return false;
  return isInterstitialSafeRoute(opts.pathname);
}
