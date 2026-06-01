import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const APP_ORIGIN = 'https://uask.live';

// Open any URL. On native iOS, use the in-app browser so users never leave the app.
export async function openUrl(url) {
  if (!url) return;
  const fullUrl = url.startsWith('http') ? url : `${APP_ORIGIN}${url}`;
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: fullUrl, presentationStyle: 'popover' });
  } else {
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  }
}
