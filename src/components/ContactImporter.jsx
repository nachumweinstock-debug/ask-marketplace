import { useState } from 'react';
import { buildShareText } from './SharePanel';

const hasContactAPI = typeof navigator !== 'undefined' && 'contacts' in navigator;

function normalizePhone(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const digits = s.replace(/[^\d+]/g, '');
  return digits.replace(/[^0-9]/g, '').length >= 7 ? digits : '';
}

function waHref(tel, shareText) {
  const clean = tel.replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(shareText)}`;
}

function smsHref(tel, shareText) {
  return `sms:${tel}?body=${encodeURIComponent(shareText)}`;
}

export default function ContactImporter({ referralCode, university }) {
  const code = String(referralCode || '').trim().toUpperCase();
  const link = code ? `https://uask.live/join/${encodeURIComponent(code)}` : '';
  const shareText = buildShareText(link, university);

  const [contacts, setContacts] = useState([]);
  const [importing, setImporting] = useState(false);
  const [sent, setSent] = useState(new Set());

  async function importFromDevice() {
    if (!hasContactAPI) return;
    setImporting(true);
    try {
      const results = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      const incoming = [];
      for (const c of results) {
        const tel = (c.tel || []).map(normalizePhone).find(Boolean);
        if (!tel) continue;
        const name = (c.name || [])[0] || tel;
        const id = `${name}-${tel}`;
        if (!contacts.find(x => x.id === id)) incoming.push({ id, name, tel });
      }
      setContacts(prev => [...prev, ...incoming]);
    } catch { /* user dismissed — silent */ }
    finally { setImporting(false); }
  }

  function removeContact(id) {
    setContacts(prev => prev.filter(c => c.id !== id));
    setSent(prev => { const n = new Set(prev); n.delete(id); return n; });
  }

  function markSent(id) {
    setSent(prev => new Set([...prev, id]));
  }

  if (!code) return null;

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: 0 }}>
            Invite from your contacts
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '5px 0 0', lineHeight: 1.5 }}>
            {hasContactAPI
              ? 'Select people from your phone — tap a button to send each one their invite.'
              : 'Open this page on your phone to import contacts directly.'}
          </p>
        </div>

        {hasContactAPI && (
          <button
            type="button"
            onClick={importFromDevice}
            disabled={importing}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '12px 22px', borderRadius: 12,
              background: '#F15A24', color: '#fff',
              border: 'none', cursor: 'pointer', flexShrink: 0,
              fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-ui)',
              opacity: importing ? 0.7 : 1, transition: 'opacity .15s',
            }}
          >
            {importing ? (
              <>
                <span style={{
                  width: 15, height: 15, flexShrink: 0,
                  border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
                  borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite',
                }} />
                Opening…
              </>
            ) : (
              <>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Import Contacts
              </>
            )}
          </button>
        )}
      </div>

      {/* Not supported on this device */}
      {!hasContactAPI && contacts.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          background: '#FFF1E8', border: '1.5px solid #F5D4BE',
          borderRadius: 14, padding: '18px 20px',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: '#F15A24',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Available on mobile</div>
            <div style={{ fontSize: 13, color: '#5F5A50', lineHeight: 1.5 }}>
              Open <strong>uask.live/referrals</strong> on your iPhone or Android to import contacts directly from your phone.
            </div>
          </div>
        </div>
      )}

      {/* Contact list */}
      {contacts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''} · {sent.size} sent
            </span>
            <button
              type="button"
              onClick={importFromDevice}
              style={{
                fontSize: 12, fontWeight: 700, color: '#F15A24',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: 'var(--font-ui)',
              }}
            >
              + Add more
            </button>
          </div>

          {contacts.map(c => {
            const isSent = sent.has(c.id);
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 14px', borderRadius: 12,
                background: isSent ? '#F0FDF4' : '#FAFAF9',
                border: `1px solid ${isSent ? '#BBF7D0' : 'var(--border)'}`,
                transition: 'background .2s, border-color .2s',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: isSent ? '#86EFAC' : '#E8E3DA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                  color: isSent ? '#15803D' : '#5F5A50',
                }}>
                  {isSent
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : c.name.charAt(0).toUpperCase()
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  {c.name !== c.tel && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{c.tel}</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <a
                    href={waHref(c.tel, shareText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markSent(c.id)}
                    title="Send via WhatsApp"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 34, height: 34, borderRadius: 9,
                      background: '#25D366', color: '#fff', textDecoration: 'none',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 32 32">
                      <path fill="currentColor" d="M16.02 3.2A12.7 12.7 0 0 0 5.05 22.3L3.2 28.8l6.68-1.75A12.66 12.66 0 0 0 16.02 28.6 12.7 12.7 0 1 0 16.02 3.2Zm0 23.25c-2.02 0-4-.58-5.7-1.67l-.4-.25-3.95 1.03 1.05-3.82-.27-.42a10.55 10.55 0 1 1 9.27 5.13Zm5.8-7.9c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.31-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.07 1.3 3.28c.16.21 2.24 3.42 5.42 4.8.76.33 1.35.53 1.81.68.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.15-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z" />
                    </svg>
                  </a>
                  <a
                    href={smsHref(c.tel, shareText)}
                    onClick={() => markSent(c.id)}
                    title="Send via iMessage/SMS"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 34, height: 34, borderRadius: 9,
                      background: '#1B3A6B', color: '#fff', textDecoration: 'none',
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </a>
                  <button
                    type="button"
                    onClick={() => removeContact(c.id)}
                    title="Remove"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 34, height: 34, borderRadius: 9,
                      background: '#F3F2F0', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
