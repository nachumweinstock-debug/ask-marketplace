import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

// GET /api/keys/:userId — fetch a user's public key (public — keys are meant to be shared)
router.get('/:userId', (req, res) => {
  const user = db.prepare('SELECT pubkey FROM users WHERE id = ?').get(req.params.userId);
  if (!user?.pubkey) return res.status(404).json({ error: 'No key found' });
  res.json({ pubkey: user.pubkey });
});

// POST /api/keys — upload / rotate own public key
router.post('/', requireAuth, (req, res) => {
  const { pubkey } = req.body;
  if (!pubkey || typeof pubkey !== 'string' || pubkey.length > 4096) {
    return res.status(400).json({ error: 'Invalid pubkey' });
  }
  db.prepare('UPDATE users SET pubkey = ? WHERE id = ?').run(pubkey, req.user.id);
  res.json({ ok: true });
});

export default router;
