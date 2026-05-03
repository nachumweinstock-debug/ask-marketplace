import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { storeImage } from '../storage.js';

const router = Router();

router.get('/:providerId', (req, res) => {
  const rows = db.prepare('SELECT * FROM provider_media WHERE provider_id = ? ORDER BY sort_order ASC, id DESC').all(req.params.providerId);
  res.json(rows);
});

router.post('/:providerId', requireAuth, async (req, res) => {
  const provider = db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(req.params.providerId);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  if (provider.user_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Forbidden' });

  const { media_type = 'image', url, data_url, title, notes } = req.body;
  if (!['image', 'video', 'note'].includes(media_type)) return res.status(400).json({ error: 'Invalid media type' });
  let storedUrl = String(url || '').trim();
  if (data_url?.startsWith('data:image/')) storedUrl = await storeImage(data_url, 'portfolio', `${provider.id}-${Date.now()}`);
  if (media_type !== 'note' && !storedUrl) return res.status(400).json({ error: 'Media URL or upload required' });
  if (storedUrl && !/^https?:\/\//.test(storedUrl) && !storedUrl.startsWith('/uploads/')) return res.status(400).json({ error: 'Invalid media URL' });

  const count = db.prepare('SELECT COUNT(*) as n FROM provider_media WHERE provider_id = ?').get(provider.id).n || 0;
  if (count >= 12) return res.status(400).json({ error: 'Portfolio limit reached' });

  const result = db.prepare(`
    INSERT INTO provider_media (provider_id, media_type, url, title, notes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(provider.id, media_type, storedUrl || null, String(title || '').slice(0, 120), String(notes || '').slice(0, 1000), count);
  res.json(db.prepare('SELECT * FROM provider_media WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:providerId/:mediaId', requireAuth, (req, res) => {
  const provider = db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(req.params.providerId);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  if (provider.user_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM provider_media WHERE id = ? AND provider_id = ?').run(req.params.mediaId, provider.id);
  res.json({ ok: true });
});

export default router;
