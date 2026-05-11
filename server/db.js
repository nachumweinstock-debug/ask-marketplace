import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..');
mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(join(DATA_DIR, 'ask.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'provider')),
    email_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS provider_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    category TEXT NOT NULL CHECK(category IN ('tutor','barber','hebrew tutor','tennis','other')),
    price_per_session REAL DEFAULT 0,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    zelle TEXT,
    venmo TEXT,
    avatar_url TEXT
  );

  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_booked INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    availability_id INTEGER NOT NULL REFERENCES availability(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS policy_acceptances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_version TEXT NOT NULL,
    privacy_version TEXT NOT NULL,
    accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
  );

  CREATE TABLE IF NOT EXISTS saved_tutors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tutor_id INTEGER NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tutor_id)
  );
`);

// Safe migrations for existing databases
const cols = db.pragma('table_info(users)').map(c => c.name);
if (!cols.includes('email_verified')) {
  db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0');
  db.exec('UPDATE users SET email_verified = 1');
}
if (!cols.includes('avatar_url'))     db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT');
if (!cols.includes('is_admin'))       db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
if (!cols.includes('major'))          db.exec('ALTER TABLE users ADD COLUMN major TEXT');
if (!cols.includes('university'))     db.exec('ALTER TABLE users ADD COLUMN university TEXT');
if (!cols.includes('classes_taking')) db.exec('ALTER TABLE users ADD COLUMN classes_taking TEXT');
if (!cols.includes('interests'))      db.exec('ALTER TABLE users ADD COLUMN interests TEXT');
if (!cols.includes('gpa'))            db.exec('ALTER TABLE users ADD COLUMN gpa TEXT');
if (!cols.includes('user_bio'))       db.exec('ALTER TABLE users ADD COLUMN user_bio TEXT');
if (!cols.includes('timezone'))       db.exec('ALTER TABLE users ADD COLUMN timezone TEXT');
if (!cols.includes('referral_code'))  db.exec('ALTER TABLE users ADD COLUMN referral_code TEXT');
if (!cols.includes('referred_by'))    db.exec('ALTER TABLE users ADD COLUMN referred_by INTEGER REFERENCES users(id)');
if (!cols.includes('last_active_at')) db.exec('ALTER TABLE users ADD COLUMN last_active_at DATETIME');

if (!cols.includes('zelle')) db.exec('ALTER TABLE users ADD COLUMN zelle TEXT');
if (!cols.includes('venmo')) db.exec('ALTER TABLE users ADD COLUMN venmo TEXT');

const ppCols = db.pragma('table_info(provider_profiles)').map(c => c.name);
if (!ppCols.includes('custom_category')) db.exec('ALTER TABLE provider_profiles ADD COLUMN custom_category TEXT');
if (!ppCols.includes('listing_image'))   db.exec('ALTER TABLE provider_profiles ADD COLUMN listing_image TEXT');
if (!ppCols.includes('session_type'))    db.exec("ALTER TABLE provider_profiles ADD COLUMN session_type TEXT NOT NULL DEFAULT 'in-person'");

if (!cols.includes('phone'))        db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
if (!cols.includes('contact_pref')) db.exec("ALTER TABLE users ADD COLUMN contact_pref TEXT DEFAULT 'imessage'");
if (!cols.includes('pubkey'))       db.exec('ALTER TABLE users ADD COLUMN pubkey TEXT');
if (!cols.includes('username')) {
  db.exec('ALTER TABLE users ADD COLUMN username TEXT');
  // Backfill existing users: generate slug from name, append -2/-3 on conflict
  const existing = db.prepare('SELECT id, name FROM users').all();
  for (const u of existing) {
    const base = (u.name || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user';
    let slug = base, n = 2;
    while (db.prepare('SELECT 1 FROM users WHERE username = ?').get(slug)) slug = `${base}-${n++}`;
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(slug, u.id);
  }
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username) WHERE username IS NOT NULL');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code_unique ON users(referral_code) WHERE referral_code IS NOT NULL');
db.exec('CREATE INDEX IF NOT EXISTS idx_saved_tutors_user_id ON saved_tutors(user_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_saved_tutors_tutor_id ON saved_tutors(tutor_id)');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
if (!tables.includes('verification_codes')) {
  db.exec(`
    CREATE TABLE verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'verify',
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0
    )
  `);
} else {
  // Add type column if missing (existing installs)
  const vcCols = db.pragma('table_info(verification_codes)').map(c => c.name);
  if (!vcCols.includes('type')) {
    db.exec("ALTER TABLE verification_codes ADD COLUMN type TEXT NOT NULL DEFAULT 'verify'");
  }
}

// Connections (friend requests)
if (!tables.includes('connections')) {
  db.exec(`
    CREATE TABLE connections (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status       TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted')),
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(requester_id, receiver_id)
    )
  `);
}

// Messages table (booking-scoped chat)
if (!tables.includes('messages')) {
  db.exec(`
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      sender_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body       TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at    DATETIME
    )
  `);
} else {
  const msgCols = db.pragma('table_info(messages)').map(c => c.name);
  if (!msgCols.includes('read_at')) db.exec('ALTER TABLE messages ADD COLUMN read_at DATETIME');
}

// Direct messages (user-to-user, not booking-scoped)
if (!tables.includes('direct_messages')) {
  db.exec(`
    CREATE TABLE direct_messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body        TEXT NOT NULL,
      is_system   INTEGER DEFAULT 0,
      read_at     DATETIME,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} else {
  // Safe migration: add is_system column for existing installs
  const dmCols = db.pragma('table_info(direct_messages)').map(c => c.name);
  if (!dmCols.includes('is_system')) db.exec('ALTER TABLE direct_messages ADD COLUMN is_system INTEGER DEFAULT 0');
}

// ── Multiple listings: drop UNIQUE constraint on provider_profiles.user_id ────
// SQLite can't ALTER TABLE DROP CONSTRAINT, so we recreate the table.
// This runs only if user_id is still UNIQUE (fresh or old single-listing installs).
const ppSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='provider_profiles'").get();
if (ppSchema && /user_id\s+INTEGER\s+UNIQUE/i.test(ppSchema.sql)) {
  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN;
    CREATE TABLE provider_profiles_new (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      bio               TEXT,
      category          TEXT NOT NULL DEFAULT 'other',
      price_per_session REAL DEFAULT 0,
      rating            REAL DEFAULT 0,
      review_count      INTEGER DEFAULT 0,
      zelle             TEXT,
      venmo             TEXT,
      avatar_url        TEXT,
      custom_category   TEXT,
      listing_image     TEXT,
      session_type      TEXT NOT NULL DEFAULT 'in-person',
      title             TEXT
    );
    INSERT INTO provider_profiles_new
      SELECT id, user_id, bio, category, price_per_session, rating, review_count,
             zelle, venmo, avatar_url, custom_category, listing_image, session_type, NULL
      FROM provider_profiles;
    DROP TABLE provider_profiles;
    ALTER TABLE provider_profiles_new RENAME TO provider_profiles;
    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
} else {
  // Already multi-listing schema — just ensure title column exists
  const pp2 = db.pragma('table_info(provider_profiles)').map(c => c.name);
  if (!pp2.includes('title')) db.exec('ALTER TABLE provider_profiles ADD COLUMN title TEXT');
}

// ── Subcategory column ─────────────────────────────────────────────────────────
const ppColsFinal = db.pragma('table_info(provider_profiles)').map(c => c.name);
if (!ppColsFinal.includes('subcategory'))      db.exec('ALTER TABLE provider_profiles ADD COLUMN subcategory TEXT');
if (!ppColsFinal.includes('college'))          db.exec('ALTER TABLE provider_profiles ADD COLUMN college TEXT');
if (!ppColsFinal.includes('allow_group'))      db.exec('ALTER TABLE provider_profiles ADD COLUMN allow_group INTEGER DEFAULT 0');
if (!ppColsFinal.includes('max_group_size'))   db.exec('ALTER TABLE provider_profiles ADD COLUMN max_group_size INTEGER DEFAULT 6');
if (!ppColsFinal.includes('intro_video_url'))  db.exec('ALTER TABLE provider_profiles ADD COLUMN intro_video_url TEXT');
if (!ppColsFinal.includes('portfolio_notes'))  db.exec('ALTER TABLE provider_profiles ADD COLUMN portfolio_notes TEXT');
if (!ppColsFinal.includes('school_verified'))  db.exec('ALTER TABLE provider_profiles ADD COLUMN school_verified INTEGER DEFAULT 0');
if (!ppColsFinal.includes('created_at')) {
  db.exec('ALTER TABLE provider_profiles ADD COLUMN created_at DATETIME');
  db.prepare("UPDATE provider_profiles SET created_at = datetime('now', '-3 days') WHERE created_at IS NULL").run();
}
if (!ppColsFinal.includes('last_no_availability_reminder_at')) {
  db.exec('ALTER TABLE provider_profiles ADD COLUMN last_no_availability_reminder_at DATETIME');
}

const reviewCols = db.pragma('table_info(reviews)').map(c => c.name);
if (!reviewCols.includes('hidden')) db.exec('ALTER TABLE reviews ADD COLUMN hidden INTEGER DEFAULT 0');

db.exec(`
  CREATE TABLE IF NOT EXISTS review_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK(reason IN ('spam','harassment','fake review','offensive content','other')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewed','dismissed','hidden')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(review_id, reporter_id)
  );

  CREATE TABLE IF NOT EXISTS provider_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK(media_type IN ('image','video','note')),
    url TEXT,
    title TEXT,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS session_reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL,
    dismissed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, booking_id, reminder_type)
  );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports(status, created_at)');
db.exec('CREATE INDEX IF NOT EXISTS idx_provider_media_provider ON provider_media(provider_id, sort_order)');
db.exec('CREATE INDEX IF NOT EXISTS idx_session_reminders_user ON session_reminders(user_id, dismissed_at)');

// ── Group booking invites ──────────────────────────────────────────────────────
const tablesAll = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
if (!tablesAll.includes('booking_group_invites')) {
  db.exec(`
    CREATE TABLE booking_group_invites (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      inviter_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invitee_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status      TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','accepted','declined')),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(booking_id, invitee_id)
    )
  `);
}

// Rename legacy 'tennis' category to 'fitness'
db.prepare("UPDATE provider_profiles SET category = 'fitness' WHERE category = 'tennis'").run();

// Normalize custom categories: trim whitespace + title-case
db.prepare(`
  UPDATE provider_profiles
  SET custom_category = TRIM(custom_category)
  WHERE custom_category IS NOT NULL AND custom_category != TRIM(custom_category)
`).run();

// Fix known typos in custom categories
const CATEGORY_CORRECTIONS = [
  ['guitar leasons', 'Music'],
  ['guitar lesson',  'Music'],
  ['guitar lessons', 'Music'],
];
for (const [bad, good] of CATEGORY_CORRECTIONS) {
  db.prepare(`
    UPDATE provider_profiles SET custom_category = ?
    WHERE LOWER(TRIM(custom_category)) = ?
  `).run(good, bad);
}

// Booking reminder tracking
const bookingCols = db.pragma('table_info(bookings)').map(c => c.name);
if (!bookingCols.includes('reminder_sent_at'))      db.exec('ALTER TABLE bookings ADD COLUMN reminder_sent_at DATETIME');
if (!bookingCols.includes('sms_reminder_sent'))     db.exec('ALTER TABLE bookings ADD COLUMN sms_reminder_sent INTEGER DEFAULT 0');
if (!bookingCols.includes('sms_review_sent'))       db.exec('ALTER TABLE bookings ADD COLUMN sms_review_sent INTEGER DEFAULT 0');

// Reschedule proposal columns
if (!bookingCols.includes('reschedule_proposed_availability_id'))
  db.exec('ALTER TABLE bookings ADD COLUMN reschedule_proposed_availability_id INTEGER REFERENCES availability(id)');
if (!bookingCols.includes('reschedule_proposed_by'))
  db.exec('ALTER TABLE bookings ADD COLUMN reschedule_proposed_by TEXT');
if (!bookingCols.includes('reschedule_status'))
  db.exec("ALTER TABLE bookings ADD COLUMN reschedule_status TEXT DEFAULT 'none'");

// OAuth identity columns + token versioning for session invalidation
const colsLatest = db.pragma('table_info(users)').map(c => c.name);
if (!colsLatest.includes('google_id'))     db.exec('ALTER TABLE users ADD COLUMN google_id TEXT');
if (!colsLatest.includes('apple_id'))      db.exec('ALTER TABLE users ADD COLUMN apple_id TEXT');
if (!colsLatest.includes('token_version')) db.exec('ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1');

// DM nudge tracking — prevents re-sending the same nudge level for a conversation
const tablesLatest = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
if (!tablesLatest.includes('dm_nudge_log')) {
  db.exec(`
    CREATE TABLE dm_nudge_log (
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nudge_level INTEGER NOT NULL,
      sent_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (receiver_id, sender_id, nudge_level)
    )
  `);
}

// Help Wanted — users can request services they need
if (!tablesLatest.includes('help_wanted')) {
  db.exec(`
    CREATE TABLE help_wanted (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT,
      category    TEXT,
      budget      TEXT,
      urgency     TEXT DEFAULT 'flexible' CHECK(urgency IN ('asap','this_week','flexible')),
      status      TEXT DEFAULT 'open' CHECK(status IN ('open','filled','closed')),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Time requests — users can request a specific day/time from providers without availability
if (!tablesLatest.includes('time_requests')) {
  db.exec(`
    CREATE TABLE time_requests (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_id INTEGER NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
      requested_date TEXT NOT NULL,
      requested_time TEXT NOT NULL,
      message     TEXT,
      status      TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Customer support conversations and messages
if (!tablesLatest.includes('support_conversations')) {
  db.exec(`
    CREATE TABLE support_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      status TEXT DEFAULT 'open' CHECK(status IN ('open','bot_answered','needs_admin','closed')),
      topic TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE support_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
      sender_type TEXT NOT NULL CHECK(sender_type IN ('user','bot','admin')),
      sender_id TEXT,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_support_conversations_updated ON support_conversations(updated_at);
  CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
  CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id, created_at);
`);

// Privacy-conscious internal analytics
if (!tablesLatest.includes('analytics_sessions')) {
  db.exec(`
    CREATE TABLE analytics_sessions (
      session_id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      landing_page TEXT,
      referrer TEXT,
      first_touch_source TEXT,
      last_touch_source TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      pageview_count INTEGER DEFAULT 0,
      event_count INTEGER DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0
    );

    CREATE TABLE analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      visitor_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      url TEXT,
      path TEXT,
      page_title TEXT,
      page_type TEXT,
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      metadata TEXT
    );

    CREATE TABLE analytics_pageviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      visitor_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      url TEXT,
      path TEXT,
      page_title TEXT,
      page_type TEXT,
      referrer TEXT,
      landing_page TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      time_on_page_seconds INTEGER DEFAULT 0
    );

    CREATE TABLE analytics_conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      conversion_name TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      url TEXT,
      path TEXT,
      page_title TEXT,
      page_type TEXT,
      referrer TEXT,
      source TEXT,
      metadata TEXT
    );
  `);
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
  CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
  CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_created ON analytics_pageviews(created_at);
  CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_path ON analytics_pageviews(path);
  CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started ON analytics_sessions(started_at);
  CREATE INDEX IF NOT EXISTS idx_analytics_conversions_created ON analytics_conversions(created_at);
`);

// Auto-expire past unbooked slots — runs on every boot so stale slots never pile up
db.prepare(`
  DELETE FROM availability
  WHERE is_booked = 0
    AND date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND date < date('now')
`).run();

// Hardwired superadmins — grant admin on every server boot if the account exists
const SUPERADMINS = ['nachumweinstock@gmail.com'];
for (const email of SUPERADMINS) {
  db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(email);
}

// Study Hangouts — real-time "who's studying now" board
const tablesHangouts = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
if (!tablesHangouts.includes('study_sessions')) {
  db.exec(`
    CREATE TABLE study_sessions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject        TEXT NOT NULL,
      location       TEXT NOT NULL,
      class_code     TEXT,
      expires_at     DATETIME NOT NULL,
      attendee_count INTEGER DEFAULT 1,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE session_attendees (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(session_id, user_id)
    );
  `);
}
db.exec('CREATE INDEX IF NOT EXISTS idx_study_sessions_expires ON study_sessions(expires_at)');
db.exec('CREATE INDEX IF NOT EXISTS idx_session_attendees_session ON session_attendees(session_id)');

// Session chat messages
const tablesChat = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
if (!tablesChat.includes('session_messages')) {
  db.exec(`
    CREATE TABLE session_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body       TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
db.exec('CREATE INDEX IF NOT EXISTS idx_session_messages_session ON session_messages(session_id, created_at)');

export default db;
