import { randomUUID } from 'crypto';
import { Router } from 'express';
import db from '../db.js';
import { optionalAuth, requireAuth } from '../auth.js';

const router = Router();

function requireAdmin(req, res, next) {
  const u = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!u?.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

function clean(value, max = 3000) {
  return String(value || '').trim().slice(0, max);
}

function classifySupport(message) {
  const text = message.toLowerCase();
  const wantsHuman = /\b(human|admin|real person|urgent|refund)\b/.test(text);

  if (/\b(booking|book|session)\b/.test(text)) {
    return {
      topic: 'Booking help',
      needsAdmin: wantsHuman,
      reply: 'To book a session, browse listings, open a tutor profile, choose an available time, and request the booking. The tutor can confirm it from their dashboard. You can use messages to coordinate details after booking.',
    };
  }
  if (/\b(tutor|become tutor|apply|listing|provider)\b/.test(text)) {
    return {
      topic: 'Tutor account help',
      needsAdmin: wantsHuman,
      reply: 'To become a tutor, create an account, choose Post, fill out your listing, add your subject, price, session type, and availability. Once your listing is live, students can find and book you.',
    };
  }
  if (/\b(payment|charge|refund|paid|venmo|zelle)\b/.test(text)) {
    return {
      topic: 'Payment issue',
      needsAdmin: true,
      reply: 'For payment, charge, or refund issues, please include what happened, the tutor name, and the booking date. An admin may review the conversation and follow up.',
    };
  }
  if (/\b(cancel|reschedule|move|change time)\b/.test(text)) {
    return {
      topic: 'Cancel or reschedule',
      needsAdmin: wantsHuman,
      reply: 'For cancellations or rescheduling, message the tutor from your booking or messages page and agree on the new time. If a booking is stuck or the tutor does not respond, our team can review it.',
    };
  }
  if (/\b(login|account|password|sign in|signup|email)\b/.test(text)) {
    return {
      topic: 'Account help',
      needsAdmin: wantsHuman,
      reply: 'For account issues, try logging in with the same email you used to create the account. If the password is the issue, use Forgot password from the login page. If your account looks missing or duplicated, an admin can help.',
    };
  }
  if (/\b(bug|broken|error|not working|crash|glitch|stuck)\b/.test(text)) {
    return {
      topic: 'Technical issue',
      needsAdmin: true,
      reply: 'Sorry about that. This sounds like a technical issue, so it has been logged for admin review. If you can, send what page you were on, what you clicked, and what went wrong.',
    };
  }
  if (wantsHuman) {
    return {
      topic: 'Needs admin',
      needsAdmin: true,
      reply: 'Got it. I marked this for the Ask Marketplace team so a human can review it.',
    };
  }
  return {
    topic: 'General support',
    needsAdmin: false,
    reply: 'Thanks for reaching out. The support team received your question. If this needs a human review, an admin can follow up.',
  };
}

function conversationWithLastMessage(row) {
  const last = db.prepare(`
    SELECT sender_type, message, created_at
    FROM support_messages
    WHERE conversation_id = ?
    ORDER BY datetime(created_at) DESC
    LIMIT 1
  `).get(row.id);
  return { ...row, last_message: last?.message || '', last_sender_type: last?.sender_type || null, last_message_at: last?.created_at || row.updated_at };
}

router.post('/chat', optionalAuth, (req, res) => {
  const userMessage = clean(req.body?.userMessage);
  if (!userMessage) return res.status(400).json({ error: 'Message required' });

  let conversationId = clean(req.body?.conversationId, 80);
  const userId = req.user?.id ? String(req.user.id) : clean(req.body?.userId, 80) || null;
  const userEmail = req.user?.email || clean(req.body?.userEmail, 200) || null;
  let conversation = conversationId
    ? db.prepare('SELECT * FROM support_conversations WHERE id = ?').get(conversationId)
    : null;

  const bot = classifySupport(userMessage);
  const now = new Date().toISOString();

  if (!conversation) {
    conversationId = randomUUID();
    db.prepare(`
      INSERT INTO support_conversations (id, user_id, user_email, status, topic, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(conversationId, userId, userEmail, bot.needsAdmin ? 'needs_admin' : 'open', bot.topic, now, now);
  }

  const botMessage = `${bot.reply}\n\nNeed a human? Our team can review this.`;
  const nextStatus = bot.needsAdmin ? 'needs_admin' : 'bot_answered';

  db.transaction(() => {
    db.prepare(`
      INSERT INTO support_messages (id, conversation_id, sender_type, sender_id, message, created_at)
      VALUES (?, ?, 'user', ?, ?, ?)
    `).run(randomUUID(), conversationId, userId, userMessage, now);
    db.prepare(`
      INSERT INTO support_messages (id, conversation_id, sender_type, sender_id, message, created_at)
      VALUES (?, ?, 'bot', NULL, ?, ?)
    `).run(randomUUID(), conversationId, botMessage, now);
    db.prepare(`
      UPDATE support_conversations
      SET user_id = COALESCE(user_id, ?),
          user_email = COALESCE(user_email, ?),
          status = CASE WHEN status = 'closed' THEN 'closed' ELSE ? END,
          topic = COALESCE(topic, ?),
          updated_at = ?
      WHERE id = ?
    `).run(userId, userEmail, nextStatus, bot.topic, now, conversationId);
  })();

  res.json({ conversationId, botMessage });
});

router.get('/admin/conversations', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT *
    FROM support_conversations
    ORDER BY datetime(updated_at) DESC
    LIMIT 200
  `).all();
  res.json(rows.map(conversationWithLastMessage));
});

router.get('/admin/conversations/:id', requireAuth, requireAdmin, (req, res) => {
  const conversation = db.prepare('SELECT * FROM support_conversations WHERE id = ?').get(req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  const messages = db.prepare(`
    SELECT *
    FROM support_messages
    WHERE conversation_id = ?
    ORDER BY datetime(created_at) ASC
  `).all(req.params.id);
  res.json({ conversation, messages });
});

router.post('/admin/conversations/:id/reply', requireAuth, requireAdmin, (req, res) => {
  const message = clean(req.body?.message);
  if (!message) return res.status(400).json({ error: 'Message required' });
  const conversation = db.prepare('SELECT id FROM support_conversations WHERE id = ?').get(req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO support_messages (id, conversation_id, sender_type, sender_id, message, created_at)
    VALUES (?, ?, 'admin', ?, ?, ?)
  `).run(randomUUID(), req.params.id, String(req.user.id), message, now);
  db.prepare("UPDATE support_conversations SET status = 'open', updated_at = ? WHERE id = ?").run(now, req.params.id);
  res.json({ ok: true });
});

router.patch('/admin/conversations/:id/status', requireAuth, requireAdmin, (req, res) => {
  const status = clean(req.body?.status, 30);
  if (!['open', 'bot_answered', 'needs_admin', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const result = db.prepare('UPDATE support_conversations SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, new Date().toISOString(), req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ ok: true, status });
});

export default router;
