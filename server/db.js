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
if (!cols.includes('classes_taking')) db.exec('ALTER TABLE users ADD COLUMN classes_taking TEXT');
if (!cols.includes('gpa'))            db.exec('ALTER TABLE users ADD COLUMN gpa TEXT');
if (!cols.includes('user_bio'))       db.exec('ALTER TABLE users ADD COLUMN user_bio TEXT');

if (!cols.includes('zelle')) db.exec('ALTER TABLE users ADD COLUMN zelle TEXT');
if (!cols.includes('venmo')) db.exec('ALTER TABLE users ADD COLUMN venmo TEXT');

const ppCols = db.pragma('table_info(provider_profiles)').map(c => c.name);
if (!ppCols.includes('custom_category')) db.exec('ALTER TABLE provider_profiles ADD COLUMN custom_category TEXT');
if (!ppCols.includes('listing_image'))   db.exec('ALTER TABLE provider_profiles ADD COLUMN listing_image TEXT');
if (!ppCols.includes('session_type'))    db.exec("ALTER TABLE provider_profiles ADD COLUMN session_type TEXT NOT NULL DEFAULT 'in-person'");

if (!cols.includes('phone'))        db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
if (!cols.includes('contact_pref')) db.exec("ALTER TABLE users ADD COLUMN contact_pref TEXT DEFAULT 'imessage'");
if (!cols.includes('pubkey'))       db.exec('ALTER TABLE users ADD COLUMN pubkey TEXT');

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

export default db;
