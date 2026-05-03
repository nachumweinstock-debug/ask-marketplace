import { useEffect, useState } from 'react';
import api from '../api';
import { RowSkeleton } from '../components/Skeletons';

const STATUS = {
  open: ['#FFF7ED', '#9A3412'],
  reviewed: ['#EFF6FF', '#1D4ED8'],
  dismissed: ['#F3F4F6', '#374151'],
  hidden: ['#FEF2F2', '#B91C1C'],
};

export default function AdminReviewModeration() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get('/admin/reviews/reports')
      .then(({ data }) => setReports(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function moderate(reviewId, body) {
    await api.patch(`/admin/reviews/${reviewId}`, body);
    load();
  }

  if (loading) return <div className="page" style={{ maxWidth: 1100 }}><RowSkeleton rows={6} /></div>;

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div className="section-label">Trust ops</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, lineHeight: 1, marginTop: 8 }}>Review moderation</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>Flagged reviews, report reasons, and hide/unhide actions.</p>
        </div>
        <button onClick={load} className="admin-action-btn">Refresh</button>
      </div>

      {reports.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No reported reviews.</div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
                  <th style={th}>Status</th>
                  <th style={th}>Reason</th>
                  <th style={th}>Review</th>
                  <th style={th}>Reporter</th>
                  <th style={th}>Tutor</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(report => {
                  const [bg, color] = STATUS[report.status] || STATUS.open;
                  return (
                    <tr key={report.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={td}><span style={{ background: bg, color, borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 900 }}>{report.status}</span></td>
                      <td style={td}><strong>{report.reason}</strong><div style={{ color: 'var(--muted)', fontSize: 12 }}>{report.details}</div></td>
                      <td style={td}><div style={{ maxWidth: 280, lineHeight: 1.5 }}>{report.comment || 'No comment'}<div style={{ color: 'var(--muted)', fontSize: 12 }}>{report.rating} stars by {report.student_name}</div></div></td>
                      <td style={td}>{report.reporter_name || 'Unknown'}</td>
                      <td style={td}>{report.provider_name || 'Unknown'}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => moderate(report.review_id, { hidden: true, report_status: 'hidden' })} style={buttonDanger}>Hide</button>
                          <button onClick={() => moderate(report.review_id, { hidden: false, report_status: 'reviewed' })} style={button}>Unhide</button>
                          <button onClick={() => moderate(report.review_id, { report_status: 'dismissed' })} style={button}>Dismiss</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const th = { padding: '14px 16px', fontWeight: 900 };
const td = { padding: '15px 16px', verticalAlign: 'top', fontSize: 13 };
const button = { border: '1px solid var(--border)', background: '#fff', borderRadius: 999, padding: '6px 10px', cursor: 'pointer', fontWeight: 800 };
const buttonDanger = { ...button, borderColor: '#FECACA', color: '#DC2626', background: '#FEF2F2' };
