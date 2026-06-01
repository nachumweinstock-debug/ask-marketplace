import { useEffect, useState } from 'react';
import SharePanel from './SharePanel';

const INVITE_NUDGE_KEY = 'hasSeenInviteNudge';

export default function InviteNudge({ referralCode, university }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!referralCode) return;
    try {
      setVisible(localStorage.getItem(INVITE_NUDGE_KEY) !== '1');
    } catch {
      setVisible(false);
    }
  }, [referralCode]);

  function dismiss() {
    try { localStorage.setItem(INVITE_NUDGE_KEY, '1'); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section className="mb-7 rounded-2xl border border-[#E8E3DA] bg-[#FAF7F2] p-6 shadow-sm">
      <div className="mb-4">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1B3A6B', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>
          Refer a Friend
        </div>
        <h2 className="font-['DM_Serif_Display'] text-3xl leading-tight text-[#1B3A6B]">
          Know someone who needs campus services?
        </h2>
        <p className="mt-2 font-['Outfit'] text-sm leading-6 text-[#5F5A50]">
          ASK is the YU marketplace for booking barbers, tutors, personal trainers, and more — all from students on campus. Share your link and invite classmates to join.
        </p>
      </div>
      <SharePanel referralCode={referralCode} university={university} onShared={dismiss} />
      <button
        type="button"
        onClick={dismiss}
        className="mt-4 font-['Outfit'] text-sm font-medium text-[#1B3A6B] underline-offset-4 hover:underline"
      >
        Maybe later
      </button>
    </section>
  );
}
