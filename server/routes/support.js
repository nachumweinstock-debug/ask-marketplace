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
      reply: 'Here is how booking works on Ask Marketplace:\n\n1. Go to Browse and open the tutor or service listing you want.\n2. Pick an available time on their profile.\n3. Send the booking request.\n4. The tutor confirms it from their dashboard.\n5. You can coordinate details in Messages after the request is sent.\n\nIf you are already stuck on a booking, send me the tutor name, the date/time, and what status you see.',
    };
  }
  if (/\b(tutor|become tutor|apply|listing|provider)\b/.test(text)) {
    return {
      topic: 'Tutor account help',
      needsAdmin: wantsHuman,
      reply: 'To become a tutor or service provider:\n\n1. Log in or create an account.\n2. Choose Post in the navigation.\n3. Add what you offer, your subject/category, price, location or Zoom option, and availability.\n4. Save the listing so students can find and book you.\n\nIf your listing is not showing up, tell me the category, your account email, and what happens after you press save.',
    };
  }
  if (/\b(payment|charge|refund|paid|venmo|zelle)\b/.test(text)) {
    return {
      topic: 'Payment issue',
      needsAdmin: true,
      reply: 'For payment issues, the fastest way to sort it out is to include:\n\n- tutor/provider name\n- booking date and time\n- amount involved\n- whether it was Zelle, Venmo, cash, or another method\n- what went wrong\n\nI marked this for admin review because payment/refund issues usually need a real person to verify details.',
    };
  }
  if (/\b(cancel|reschedule|move|change time)\b/.test(text)) {
    return {
      topic: 'Cancel or reschedule',
      needsAdmin: wantsHuman,
      reply: 'To cancel or reschedule, message the tutor from Messages or the booking thread and agree on the new time. If the booking is pending, the tutor can confirm a different slot. If it is already confirmed, coordinate directly first so both sides know what changed.\n\nIf the tutor is not responding, send me the tutor name and booking time.',
    };
  }
  if (/\b(login|account|password|sign in|signup|email)\b/.test(text)) {
    return {
      topic: 'Account help',
      needsAdmin: wantsHuman,
      reply: 'For account or login issues:\n\n1. Make sure you are using the same email you signed up with.\n2. If the password is the issue, use Forgot password on the login page.\n3. If Google login created a second account, tell me both emails so the team can check for duplicates.\n\nWhat exact error are you seeing when you try to log in?',
    };
  }
  if (/\b(bug|broken|error|not working|crash|glitch|stuck)\b/.test(text)) {
    return {
      topic: 'Technical issue',
      needsAdmin: true,
      reply: 'Sorry about that. To debug it, send me:\n\n- what page you were on\n- what button or action broke\n- what device/browser you are using\n- any error message you saw\n\nI marked this for admin review because broken-site reports should be checked by the team.',
    };
  }
  if (wantsHuman) {
    return {
      topic: 'Needs admin',
      needsAdmin: true,
      reply: 'Got it. I marked this for the Ask Marketplace team. Please send the key details so they can review it faster: account email, related tutor or booking, and what outcome you need.',
    };
  }
  return {
    topic: 'General support',
    needsAdmin: false,
    reply: 'I can help with bookings, tutors, payments, account access, and site bugs. Tell me what you were trying to do, what happened, and the page or tutor involved if there is one.',
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

  const botMessage = bot.reply;
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
