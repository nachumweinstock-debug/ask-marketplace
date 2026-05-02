import { useState } from 'react';
import SupportChat from './SupportChat';

export default function FloatingSupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div style={{
          position: 'fixed',
          right: 18,
          bottom: 78,
          width: 'min(390px, calc(100vw - 28px))',
          zIndex: 2200,
        }}>
          <SupportChat compact />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 2201,
          height: 48,
          border: 'none',
          borderRadius: 999,
          padding: '0 18px',
          background: '#111827',
          color: '#fff',
          boxShadow: '0 12px 34px rgba(0,0,0,0.24)',
          fontWeight: 800,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        {open ? 'Close' : 'Help'}
      </button>
    </>
  );
}
