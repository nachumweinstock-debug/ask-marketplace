import { useEffect, useState } from 'react';
import api from '../api';

export default function ReferralStats({ userId }) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    api.get(`/referrals/stats/${userId}`)
      .then(({ data }) => { if (!ignore) setCount(Number(data.count || 0)); })
      .catch(() => { if (!ignore) setCount(0); });
    return () => { ignore = true; };
  }, [userId]);

  if (!userId || count === null) return null;

  return (
    <section className="mb-7 rounded-2xl border border-[#E8E3DA] bg-[#FAF7F2] p-6 text-[#1B3A6B] shadow-sm">
      <p className="font-['DM_Serif_Display'] text-2xl leading-tight">
        {count > 0
          ? `You have referred ${count} friend${count === 1 ? '' : 's'} to ASK`
          : 'Share ASK with your classmates and watch your network grow.'}
      </p>
    </section>
  );
}
