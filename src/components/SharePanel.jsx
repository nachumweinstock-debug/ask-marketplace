import { useMemo, useState } from 'react';
import { copyText } from '../lib/clipboard';

const SHARE_TEXT = (link) =>
  `Hey! I use ASK — the YU campus app where you can book barbers, tutors, personal trainers, and other student services. Sign up with my link: ${link}`;

// Detect real mobile (not desktop Chrome which has navigator.share but behaves oddly)
function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function SharePanel({ referralCode, onShared }) {
  const [copied, setCopied] = useState(false);
  const code = String(referralCode || '').trim().toUpperCase();
  const link = useMemo(() => `https://uask.live/join/${encodeURIComponent(code)}`, [code]);
  const text = SHARE_TEXT(link);
  const mobile = isMobileDevice();
  const canShare = mobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const waHref = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const smsHref = `sms:?body=${encodeURIComponent(text)}`;

  async function handleCopy() {
    if (!code) return;
    try {
      await copyText(link);
      setCopied(true);
      onShared?.();
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  async function handleNativeShare() {
    if (!code) return;
    try {
      await navigator.share({ title: 'Join me on ASK', text, url: link });
      onShared?.();
    } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Row 1: primary share action + WhatsApp */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {canShare ? (
          /* Mobile: native share sheet (iMessage, AirDrop, WhatsApp, etc.) */
          <button
            type="button"
            onClick={handleNativeShare}
            disabled={!code}
            style={btn}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Share
          </button>
        ) : (
          /* Desktop: iMessage link */
          <a href={smsHref} onClick={() => code && onShared?.()} style={link2(!!code)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            iMessage
          </a>
        )}

        {/* WhatsApp — always as an <a> tag so popup blocker never fires */}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => code && onShared?.()}
          style={link2(!!code)}
        >
          <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
            <path fill="currentColor" d="M16.02 3.2A12.7 12.7 0 0 0 5.05 22.3L3.2 28.8l6.68-1.75A12.66 12.66 0 0 0 16.02 28.6 12.7 12.7 0 1 0 16.02 3.2Zm0 23.25c-2.02 0-4-.58-5.7-1.67l-.4-.25-3.95 1.03 1.05-3.82-.27-.42a10.55 10.55 0 1 1 9.27 5.13Zm5.8-7.9c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.31-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.07 1.3 3.28c.16.21 2.24 3.42 5.42 4.8.76.33 1.35.53 1.81.68.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.15-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z" />
          </svg>
          WhatsApp
        </a>
      </div>

      {/* Row 2: Copy Link — full width */}
      <button
        type="button"
        onClick={handleCopy}
        disabled={!code}
        style={{ ...btn, background: copied ? '#15803d' : 'rgba(255,255,255,0.15)', justifyContent: 'center' }}
      >
        {copied ? (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy Link
          </>
        )}
      </button>
    </div>
  );
}

const base = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  padding: '12px 16px', borderRadius: 12,
  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)',
  cursor: 'pointer', transition: 'opacity .15s',
  border: 'none', textDecoration: 'none',
};

const btn = { ...base, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' };

// `<a>` styled as button — pointer-events always active, never blocked by popup blocker
function link2(active) {
  return {
    ...base,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    opacity: active ? 1 : 0.45,
    pointerEvents: active ? 'auto' : 'none',
  };
}
