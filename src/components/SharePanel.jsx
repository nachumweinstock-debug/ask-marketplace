import { useMemo, useState } from 'react';
import { copyText } from '../lib/clipboard';

export default function SharePanel({ referralCode, onShared }) {
  const [copied, setCopied] = useState(false);
  const code = String(referralCode || '').trim().toUpperCase();
  const link = useMemo(() => `https://uask.live/join/${encodeURIComponent(code)}`, [code]);
  const text = `Hey! I use ASK for all my campus services at YU. Book barbers, tutors, trainers and more. Check it out: ${link}`;

  async function handleCopy() {
    if (!code) return;
    try {
      await copyText(link);
      setCopied(true);
      onShared?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleWhatsApp() {
    if (!code) return;
    onShared?.();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={handleWhatsApp}
        disabled={!code}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#1B3A6B] px-5 py-3 font-['Outfit'] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
          <path fill="currentColor" d="M16.02 3.2A12.7 12.7 0 0 0 5.05 22.3L3.2 28.8l6.68-1.75A12.66 12.66 0 0 0 16.02 28.6 12.7 12.7 0 1 0 16.02 3.2Zm0 23.25c-2.02 0-4-.58-5.7-1.67l-.4-.25-3.95 1.03 1.05-3.82-.27-.42a10.55 10.55 0 1 1 9.27 5.13Zm5.8-7.9c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.31-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.07 1.3 3.28c.16.21 2.24 3.42 5.42 4.8.76.33 1.35.53 1.81.68.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.15-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z" />
        </svg>
        WhatsApp
      </button>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!code}
        className="rounded-xl bg-[#1B3A6B] px-5 py-3 font-['Outfit'] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  );
}
