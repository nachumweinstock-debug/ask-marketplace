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
if (!ppColsFinal.includes('subcategory')) {
  db.exec('ALTER TABLE provider_profiles ADD COLUMN subcategory TEXT');
}

// Rename legacy 'tennis' category to 'fitness'
db.prepare("UPDATE provider_profiles SET category = 'fitness' WHERE category = 'tennis'").run();

// Hardwired superadmins — grant admin on every server boot if the account exists
const SUPERADMINS = ['nachumweinstock@gmail.com'];
for (const email of SUPERADMINS) {
  db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run(email);
}

export default db;
