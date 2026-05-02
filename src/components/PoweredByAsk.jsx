import { useState } from 'react';
import { Share2, Copy } from 'lucide-react';

export default function PoweredByAsk({ title = 'Booked through Ask Marketplace', url, compact = false }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || `${window.location.origin}/browse`;

  async function copy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: 'Ask Marketplace', text: 'Find trusted tutors on Ask Marketplace.', url: shareUrl });
    } else {
      await copy();
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
      padding: compact ? '10px 12px' : '14px 16px',
      border: '1px solid var(--border)',
      borderRadius: 14,
      background: 'linear-gradient(135deg, #fff 0%, #F9FAFB 100%)',
      marginTop: compact ? 8 : 12,
    }}>
      <div>
        <div style={{ fontSize: compact ? 12 : 13, fontWeight: 900, color: 'var(--text)' }}>{title}</div>
        {!compact && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Invite someone who needs a tutor or campus service.</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={share} style={actionStyle}>
          <Share2 size={14} /> Share
        </button>
        <button onClick={copy} style={actionStyle}>
          <Copy size={14} /> {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

const actionStyle = {
  border: '1px solid var(--border)',
  background: '#fff',
  color: 'var(--text)',
  borderRadius: 999,
  padding: '7px 11px',
  fontSize: 12,
  fontWeight: 800,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};
