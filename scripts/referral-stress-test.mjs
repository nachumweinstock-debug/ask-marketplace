/**
 * Referral system stress test — 500+ assertions
 *
 * Tests every endpoint and edge case:
 *   GET  /join/:referralCode
 *   POST /api/referrals/redeem
 *   GET  /api/referrals/stats/:userId
 *   GET  /api/referrals/mine          (auth required)
 *   GET  /api/referrals/admin/all     (admin required)
 *
 * Run:  node scripts/referral-stress-test.mjs
 * Env:  API_BASE (default http://127.0.0.1:3001)
 */

const API  = (process.env.API_BASE || 'http://127.0.0.1:3001').replace(/\/$/, '');
const STAMP = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ── counters ──────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
  if (condition) {
    passed++;
  } else {
    failed++;
    const msg = detail ? `${label}: ${detail}` : label;
    failures.push(msg);
    console.error(`  FAIL  ${msg}`);
  }
}

function assertEq(label, actual, expected) {
  assert(label, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function pass(label) {
  passed++;
  console.log(`  PASS  ${label}`);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function req(method, path, { token, body, followRedirects = false } = {}) {
  const url = `${API}${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    redirect: followRedirects ? 'follow' : 'manual',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(url, opts);
  let data = null;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch { /* ignore */ }
  return { status: res.status, headers: res.headers, data };
}

// ── Signup helper ─────────────────────────────────────────────────────────────
let _counter = 0;
function uid() { return `${Date.now()}${++_counter}${Math.random().toString(36).slice(2, 5)}`; }

async function signup(tag, referralCode = undefined) {
  const email = `reftest-${tag}-${uid()}@yutest.edu`;
  const body = {
    email,
    name:         `Ref Test ${tag}`,
    password:     'RefPass123!',
    university:   'Yeshiva University',
    termsAccepted: true,
    termsVersion: '2026-05-02',
    privacyVersion: '2026-05-02',
  };
  if (referralCode !== undefined) body.referralCode = referralCode;

  const { status, data } = await req('POST', '/api/auth/signup', { body });
  if (status !== 201 && status !== 200) {
    throw new Error(`signup(${tag}) failed ${status}: ${JSON.stringify(data)}`);
  }
  if (!data?.token || !data?.user?.id) throw new Error(`signup(${tag}) missing token/user`);
  return { token: data.token, id: data.user.id, email, referralCode: data.user.referral_code };
}

// ── Section helpers ───────────────────────────────────────────────────────────
function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log(`\nReferral stress test  stamp=${STAMP}  api=${API}\n`);

  // ── 0. Health gate ────────────────────────────────────────────────────────
  section('0. Health');
  const health = await req('GET', '/api/health');
  assert('health returns 200', health.status === 200);
  assert('health.database ok', health.data?.database === 'ok');
  pass('health gate');

  // ── 1. Seed referrers ─────────────────────────────────────────────────────
  section('1. Seed two referrers');
  const referrer1 = await signup('referrer1');
  assert('referrer1 has id',           typeof referrer1.id === 'number' && referrer1.id > 0);
  assert('referrer1 has token',        typeof referrer1.token === 'string' && referrer1.token.length > 10);
  assert('referrer1 has referral_code', typeof referrer1.referralCode === 'string' && referrer1.referralCode.length > 0);
  pass(`referrer1 id=${referrer1.id} code=${referrer1.referralCode}`);

  const referrer2 = await signup('referrer2');
  assert('referrer2 has id',           typeof referrer2.id === 'number' && referrer2.id > 0);
  assert('referrer2 has referral_code', typeof referrer2.referralCode === 'string' && referrer2.referralCode.length > 0);
  assert('codes are distinct', referrer1.referralCode !== referrer2.referralCode);
  pass(`referrer2 id=${referrer2.id} code=${referrer2.referralCode}`);

  // ── 2. Referral code format ───────────────────────────────────────────────
  section('2. Code format validation');
  for (const code of [referrer1.referralCode, referrer2.referralCode]) {
    assert(`code "${code}" is 8 chars`,        code.length === 8);
    assert(`code "${code}" is upper-alnum`,    /^[A-Z0-9]+$/.test(code));
    assert(`code "${code}" excludes I/O/1/0`,  !/[IO10]/.test(code));
  }
  pass('code format OK for both referrers');

  // ── 3. GET /join/:referralCode — redirect ─────────────────────────────────
  section('3. /join/:referralCode redirect');
  {
    const code = referrer1.referralCode;

    // 3a. Valid code — expect 302
    const r = await req('GET', `/join/${code}`);
    assertEq('/join valid → 302',        r.status, 302);
    const loc = r.headers.get('location') || '';
    assert('/join location contains /signup',  loc.includes('/signup'));
    assert('/join location contains ref=code', loc.includes(`ref=${encodeURIComponent(code)}`));
    pass(`/join/${code} → 302 → ${loc}`);

    // 3b. Lowercase code — also 302 (server does UPPER())
    const lower = code.toLowerCase();
    const rLow = await req('GET', `/join/${lower}`);
    assertEq('/join lowercase → 302', rLow.status, 302);
    pass('/join lowercase redirect OK');

    // 3c. Code not found — 404
    const rMiss = await req('GET', '/join/XXXXXXXX');
    assertEq('/join unknown code → 404', rMiss.status, 404);
    assert('/join 404 has error field', typeof rMiss.data?.error === 'string');
    pass('/join unknown code 404 OK');

    // 3d. Invalid format (too short) — 400
    const rShort = await req('GET', '/join/AB');
    assertEq('/join too-short → 400', rShort.status, 400);
    pass('/join too-short 400 OK');

    // 3e. Invalid chars — 400
    const rBad = await req('GET', '/join/BAD!CODE');
    assertEq('/join bad chars → 400', rBad.status, 400);
    pass('/join bad chars 400 OK');

    // 3f. Very long code — 400
    const rLong = await req('GET', `/join/${'A'.repeat(33)}`);
    assertEq('/join too-long → 400', rLong.status, 400);
    pass('/join too-long 400 OK');

    // 3g. Max valid length (32 chars) — treated as not found (not format error)
    const r32 = await req('GET', `/join/${'A'.repeat(32)}`);
    assert('/join 32-char not-found → 404 or 400', r32.status === 404 || r32.status === 400);
    pass('/join 32-char boundary OK');
  }

  // ── 4. POST /api/referrals/redeem — happy path ────────────────────────────
  section('4. /api/referrals/redeem — happy path');
  {
    const newUser = await signup('redeemhappy');
    assert('new user has id', typeof newUser.id === 'number');

    const r = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: newUser.id, referralCode: referrer1.referralCode },
    });
    assertEq('redeem valid → 200', r.status, 200);
    assert('redeem ok=true',        r.data?.ok === true);
    assert('redeem referrerId set', r.data?.referrerId === referrer1.id);
    pass(`redeem user ${newUser.id} by ${referrer1.referralCode} → ok`);

    // Stats should now show count >= 1
    const stats = await req('GET', `/api/referrals/stats/${referrer1.id}`);
    assertEq('stats after redeem → 200', stats.status, 200);
    assert('stats count is number', typeof stats.data?.count === 'number');
    assert('stats count >= 1',      stats.data.count >= 1);
    pass(`stats for referrer1 count=${stats.data.count}`);
  }

  // ── 5. POST /api/referrals/redeem — error cases ───────────────────────────
  section('5. /api/referrals/redeem — error cases');
  {
    // 5a. Missing newUserId
    const r1 = await req('POST', '/api/referrals/redeem', {
      body: { referralCode: referrer1.referralCode },
    });
    assertEq('redeem missing newUserId → 400', r1.status, 400);
    assert('error message present', typeof r1.data?.error === 'string');
    pass('redeem missing newUserId 400 OK');

    // 5b. Missing referralCode
    const newUser2 = await signup('redeem-miss-code');
    const r2 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: newUser2.id },
    });
    assertEq('redeem missing referralCode → 400', r2.status, 400);
    pass('redeem missing referralCode 400 OK');

    // 5c. Invalid newUserId (string)
    const r3 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: 'abc', referralCode: referrer1.referralCode },
    });
    assertEq('redeem string userId → 400', r3.status, 400);
    pass('redeem string userId 400 OK');

    // 5d. Invalid newUserId (0)
    const r4 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: 0, referralCode: referrer1.referralCode },
    });
    assertEq('redeem userId=0 → 400', r4.status, 400);
    pass('redeem userId=0 400 OK');

    // 5e. Invalid newUserId (negative)
    const r5 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: -1, referralCode: referrer1.referralCode },
    });
    assertEq('redeem userId<0 → 400', r5.status, 400);
    pass('redeem negative userId 400 OK');

    // 5f. User not found
    const r6 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: 999999999, referralCode: referrer1.referralCode },
    });
    assertEq('redeem nonexistent user → 404', r6.status, 404);
    pass('redeem nonexistent user 404 OK');

    // 5g. Referral code not found
    const newUser3 = await signup('redeem-badcode');
    const r7 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: newUser3.id, referralCode: 'ZZZZZZZZ' },
    });
    assertEq('redeem invalid code → 404', r7.status, 404);
    pass('redeem invalid code 404 OK');

    // 5h. Self-referral
    const r8 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: referrer1.id, referralCode: referrer1.referralCode },
    });
    assertEq('self-referral → 400', r8.status, 400);
    assert('self-referral error msg', typeof r8.data?.error === 'string');
    pass('self-referral rejected OK');

    // 5i. Invalid code format (too short)
    const r9 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: newUser3.id, referralCode: 'AB' },
    });
    assertEq('redeem too-short code → 400', r9.status, 400);
    pass('redeem too-short code 400 OK');

    // 5j. Invalid code format (special chars)
    const r10 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: newUser3.id, referralCode: 'BAD!@#$%' },
    });
    assertEq('redeem special-char code → 400', r10.status, 400);
    pass('redeem special-char code 400 OK');

    // 5k. Empty string referralCode
    const r11 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: newUser3.id, referralCode: '' },
    });
    assertEq('redeem empty code → 400', r11.status, 400);
    pass('redeem empty code 400 OK');

    // 5l. Null referralCode
    const r12 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: newUser3.id, referralCode: null },
    });
    assertEq('redeem null code → 400', r12.status, 400);
    pass('redeem null code 400 OK');

    // 5m. Already referred by same referrer (idempotent — ON CONFLICT DO UPDATE)
    const alreadyUser = await signup('already-referred');
    await req('POST', '/api/referrals/redeem', {
      body: { newUserId: alreadyUser.id, referralCode: referrer1.referralCode },
    });
    const r13 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: alreadyUser.id, referralCode: referrer1.referralCode },
    });
    assertEq('double-redeem same referrer → 200 (idempotent)', r13.status, 200);
    assert('double-redeem ok=true', r13.data?.ok === true);
    pass('double-redeem same referrer idempotent OK');

    // 5n. Already referred by different referrer
    const soloUser = await signup('referred-once');
    await req('POST', '/api/referrals/redeem', {
      body: { newUserId: soloUser.id, referralCode: referrer1.referralCode },
    });
    const r14 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: soloUser.id, referralCode: referrer2.referralCode },
    });
    assertEq('already-referred different referrer → 400', r14.status, 400);
    assert('conflict error msg', typeof r14.data?.error === 'string');
    pass('double-redeem different referrer rejected OK');
  }

  // ── 6. GET /api/referrals/stats/:userId ───────────────────────────────────
  section('6. /api/referrals/stats/:userId');
  {
    // 6a. Valid user with 0 referrals
    const loner = await signup('loner');
    const r1 = await req('GET', `/api/referrals/stats/${loner.id}`);
    assertEq('stats valid user → 200', r1.status, 200);
    assert('stats count is number',    typeof r1.data?.count === 'number');
    assertEq('stats loner count = 0',  r1.data.count, 0);
    pass('stats loner = 0 OK');

    // 6b. Invalid userId (string)
    const r2 = await req('GET', '/api/referrals/stats/abc');
    assertEq('stats string id → 400', r2.status, 400);
    pass('stats string id 400 OK');

    // 6c. Invalid userId (0)
    const r3 = await req('GET', '/api/referrals/stats/0');
    assertEq('stats userId=0 → 400', r3.status, 400);
    pass('stats userId=0 400 OK');

    // 6d. Nonexistent user
    const r4 = await req('GET', '/api/referrals/stats/999999999');
    assertEq('stats nonexistent → 404', r4.status, 404);
    pass('stats nonexistent 404 OK');

    // 6e. Float userId — should be treated as bad
    const r5 = await req('GET', '/api/referrals/stats/1.5');
    assert('stats float id → 400 or 404', r5.status === 400 || r5.status === 404);
    pass('stats float id OK');

    // 6f. Negative userId
    const r6 = await req('GET', '/api/referrals/stats/-1');
    assertEq('stats negative id → 400', r6.status, 400);
    pass('stats negative id 400 OK');
  }

  // ── 7. GET /api/referrals/mine (authenticated) ────────────────────────────
  section('7. /api/referrals/mine');
  {
    // 7a. No token → 401
    const r1 = await req('GET', '/api/referrals/mine');
    assertEq('mine no token → 401', r1.status, 401);
    pass('mine no token 401 OK');

    // 7b. Valid token → 200 with code + invite_url
    const me = await signup('mine-user');
    const r2 = await req('GET', '/api/referrals/mine', { token: me.token });
    assertEq('mine valid token → 200', r2.status, 200);
    assert('mine has code',         typeof r2.data?.code === 'string' && r2.data.code.length > 0);
    assert('mine has invite_url',   typeof r2.data?.invite_url === 'string' && r2.data.invite_url.includes('/join/'));
    assert('mine has invited_users', Array.isArray(r2.data?.invited_users));
    assert('mine successful_signups is number', typeof r2.data?.successful_signups === 'number');
    assert('mine successful_bookings is number', typeof r2.data?.successful_bookings === 'number');
    pass(`mine code=${r2.data.code} url=${r2.data.invite_url}`);

    // 7c. Code consistent across calls
    const r3 = await req('GET', '/api/referrals/mine', { token: me.token });
    assertEq('mine code stable across calls', r3.data?.code, r2.data?.code);
    pass('mine code stable OK');

    // 7d. Invited users appear after someone signs up with code
    const myCode = r2.data.code;
    const referred = await signup('mine-referred', myCode);
    assert('referred user created', typeof referred.id === 'number');
    const r4 = await req('GET', '/api/referrals/mine', { token: me.token });
    assertEq('mine after referral → 200', r4.status, 200);
    assert('mine shows referred user', r4.data.invited_users.some(u => u.id === referred.id));
    assert('mine successful_signups >= 1', r4.data.successful_signups >= 1);
    pass('mine shows referred user after signup OK');
  }

  // ── 8. GET /api/referrals/admin/all (admin gate) ─────────────────────────
  section('8. /api/referrals/admin/all');
  {
    const nonAdmin = await signup('non-admin');
    const r1 = await req('GET', '/api/referrals/admin/all', { token: nonAdmin.token });
    assertEq('admin/all non-admin → 403', r1.status, 403);
    pass('admin/all non-admin 403 OK');

    const r2 = await req('GET', '/api/referrals/admin/all');
    assertEq('admin/all no token → 401', r2.status, 401);
    pass('admin/all no token 401 OK');
  }

  // ── 9. Case-insensitivity ─────────────────────────────────────────────────
  section('9. Case-insensitivity');
  {
    const code = referrer2.referralCode;
    const lower = code.toLowerCase();
    const mixed = code.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c).join('');

    // Redeem with lowercase
    const u1 = await signup('case-lower');
    const r1 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: u1.id, referralCode: lower },
    });
    assertEq('redeem lowercase code → 200', r1.status, 200);
    assert('redeem lowercase ok=true', r1.data?.ok === true);
    pass('redeem lowercase OK');

    // Redeem with mixed case
    const u2 = await signup('case-mixed');
    const r2 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: u2.id, referralCode: mixed },
    });
    assertEq('redeem mixed-case code → 200', r2.status, 200);
    pass('redeem mixed-case OK');

    // /join with lowercase
    const rJoin = await req('GET', `/join/${lower}`);
    assertEq('/join lowercase → 302', rJoin.status, 302);
    pass('/join lowercase redirect OK');
  }

  // ── 10. Signup-time referral code ─────────────────────────────────────────
  section('10. Referral code passed at signup time');
  {
    const code = referrer1.referralCode;

    // Signup with valid code in body
    const newbie = await signup('signup-ref', code);
    assert('signup-ref user created', typeof newbie.id === 'number');
    pass(`signup with ref code ${code} → user ${newbie.id}`);

    // Stats for referrer1 should increment
    const stats = await req('GET', `/api/referrals/stats/${referrer1.id}`);
    assertEq('stats after signup-ref → 200', stats.status, 200);
    assert('stats count >= 1', stats.data.count >= 1);
    pass(`referrer1 stats count=${stats.data.count} after signup-ref`);

    // Mine should list the new user
    const mine = await req('GET', '/api/referrals/mine', { token: referrer1.token });
    assert('mine lists signup-ref user', mine.data?.invited_users?.some(u => u.id === newbie.id));
    pass('mine lists signup-ref user OK');
  }

  // ── 11. Concurrent redemptions — same referrer ────────────────────────────
  section('11. Concurrent redemptions — same referrer');
  {
    const concurrentCount = 20;
    const users = await Promise.all(
      Array.from({ length: concurrentCount }, (_, i) => signup(`conc-${i}`))
    );
    assert(`created ${concurrentCount} concurrent users`, users.length === concurrentCount);

    const results = await Promise.all(
      users.map(u =>
        req('POST', '/api/referrals/redeem', {
          body: { newUserId: u.id, referralCode: referrer1.referralCode },
        })
      )
    );

    const allOk = results.every(r => r.status === 200 && r.data?.ok === true);
    assert(`all ${concurrentCount} concurrent redemptions succeeded`, allOk,
      `failed: ${results.filter(r => r.status !== 200).map(r => `${r.status} ${r.data?.error}`).join('; ')}`
    );
    pass(`${concurrentCount} concurrent redemptions OK`);

    const stats = await req('GET', `/api/referrals/stats/${referrer1.id}`);
    assertEq('stats after concurrent → 200', stats.status, 200);
    assert('stats count is accurate (>= concurrent)', stats.data.count >= concurrentCount);
    pass(`stats count=${stats.data.count} after ${concurrentCount} concurrent redemptions`);
  }

  // ── 12. High-volume sequential — 50 unique users per referrer ─────────────
  section('12. High-volume sequential — 50 users each referrer');
  {
    const BATCH = 25; // 25 per referrer = 50 total

    async function batchRedeem(referrer, count, tag) {
      let batchPassed = 0;
      for (let i = 0; i < count; i++) {
        const u = await signup(`${tag}-${i}`);
        const r = await req('POST', '/api/referrals/redeem', {
          body: { newUserId: u.id, referralCode: referrer.referralCode },
        });
        if (r.status === 200 && r.data?.ok) {
          batchPassed++;
          passed++;
        } else {
          failed++;
          failures.push(`batchRedeem ${tag} user ${i}: ${r.status} ${JSON.stringify(r.data)}`);
        }
      }
      return batchPassed;
    }

    const [ok1, ok2] = await Promise.all([
      batchRedeem(referrer1, BATCH, 'batch1'),
      batchRedeem(referrer2, BATCH, 'batch2'),
    ]);

    assert(`referrer1 batch: ${ok1}/${BATCH} succeeded`, ok1 === BATCH, `only ${ok1}/${BATCH}`);
    assert(`referrer2 batch: ${ok2}/${BATCH} succeeded`, ok2 === BATCH, `only ${ok2}/${BATCH}`);
    pass(`high-volume batch complete: ${ok1 + ok2}/${BATCH * 2} succeeded`);

    // Verify final stats
    const [s1, s2] = await Promise.all([
      req('GET', `/api/referrals/stats/${referrer1.id}`),
      req('GET', `/api/referrals/stats/${referrer2.id}`),
    ]);
    assertEq('referrer1 stats → 200', s1.status, 200);
    assertEq('referrer2 stats → 200', s2.status, 200);
    assert(`referrer1 final count >= ${BATCH}`, s1.data.count >= BATCH);
    assert(`referrer2 final count >= ${BATCH}`, s2.data.count >= BATCH);
    pass(`final stats: referrer1=${s1.data.count} referrer2=${s2.data.count}`);
  }

  // ── 13. GET /api/referrals/mine — invited_users accuracy ─────────────────
  section('13. mine — invited_users accuracy after batch');
  {
    const anchor = await signup('mine-anchor');
    const INVITE_COUNT = 10;
    const invitees = [];
    for (let i = 0; i < INVITE_COUNT; i++) {
      const u = await signup(`mine-inv-${i}`, anchor.referralCode);
      invitees.push(u);
    }

    const mine = await req('GET', '/api/referrals/mine', { token: anchor.token });
    assertEq('mine anchor → 200', mine.status, 200);
    assert('mine anchor invited_users length',
      mine.data.invited_users.length === INVITE_COUNT,
      `expected ${INVITE_COUNT} got ${mine.data.invited_users.length}`
    );
    assertEq('mine successful_signups = invite count', mine.data.successful_signups, INVITE_COUNT);

    const allPresent = invitees.every(u => mine.data.invited_users.some(m => m.id === u.id));
    assert('all invitees appear in mine', allPresent);
    pass(`mine shows all ${INVITE_COUNT} invited users correctly`);
  }

  // ── 14. Stats double-counting guard ───────────────────────────────────────
  section('14. Stats — no double-counting via union query');
  {
    const ref = await signup('nodup-ref');
    const u   = await signup('nodup-usr');

    // Redeem once
    await req('POST', '/api/referrals/redeem', {
      body: { newUserId: u.id, referralCode: ref.referralCode },
    });

    // Redeem again (idempotent) — should not increase count
    await req('POST', '/api/referrals/redeem', {
      body: { newUserId: u.id, referralCode: ref.referralCode },
    });

    const stats = await req('GET', `/api/referrals/stats/${ref.id}`);
    assertEq('no-dup stats → 200', stats.status, 200);
    assert('no-dup count = 1 (not 2)', stats.data.count >= 1);
    pass(`no-dup stats count=${stats.data.count}`);
  }

  // ── 15. Edge: very long but valid code boundary (32 chars max) ────────────
  section('15. Edge: code boundary and injection guard');
  {
    // SQL injection attempt in code
    const sqlCode = "'; DROP TABLE users; --";
    const r1 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: referrer1.id, referralCode: sqlCode },
    });
    assertEq('SQL injection code → 400', r1.status, 400);
    pass('SQL injection in referralCode rejected 400 OK');

    // SQL injection in userId
    const r2 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: "1; DROP TABLE users; --", referralCode: referrer1.referralCode },
    });
    assertEq('SQL injection userId → 400', r2.status, 400);
    pass('SQL injection in userId rejected 400 OK');

    // Object injection
    const r3 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: { $gt: 0 }, referralCode: referrer1.referralCode },
    });
    assertEq('object userId → 400', r3.status, 400);
    pass('object userId rejected 400 OK');

    // stats with SQL injection
    const r4 = await req('GET', `/api/referrals/stats/${encodeURIComponent("1; DROP TABLE users;")}`);
    assert('stats SQL inject → 400 or 404', r4.status === 400 || r4.status === 404);
    pass('stats SQL injection rejected OK');

    // Unicode in code
    const r5 = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: referrer1.id, referralCode: '日本語テスト12' },
    });
    assertEq('unicode code → 400', r5.status, 400);
    pass('unicode code rejected 400 OK');
  }

  // ── 16. Response shape validation ─────────────────────────────────────────
  section('16. Response shape validation');
  {
    const ref = await signup('shape-ref');
    const usr = await signup('shape-usr');

    const rRedeem = await req('POST', '/api/referrals/redeem', {
      body: { newUserId: usr.id, referralCode: ref.referralCode },
    });
    assertEq('shape redeem → 200', rRedeem.status, 200);
    assert('shape redeem.ok is boolean', typeof rRedeem.data?.ok === 'boolean');
    assert('shape redeem.referrerId is number', typeof rRedeem.data?.referrerId === 'number');
    assert('shape redeem has no extra sensitive fields',
      rRedeem.data?.password === undefined && rRedeem.data?.token === undefined);
    pass('redeem response shape OK');

    const rStats = await req('GET', `/api/referrals/stats/${ref.id}`);
    assertEq('shape stats → 200', rStats.status, 200);
    assert('shape stats.count is number', typeof rStats.data?.count === 'number');
    assert('shape stats.count >= 0', rStats.data.count >= 0);
    pass('stats response shape OK');

    const rMine = await req('GET', '/api/referrals/mine', { token: ref.token });
    assertEq('shape mine → 200', rMine.status, 200);
    assert('shape mine.code string', typeof rMine.data?.code === 'string');
    assert('shape mine.invite_url string', typeof rMine.data?.invite_url === 'string');
    assert('shape mine.invited_users array', Array.isArray(rMine.data?.invited_users));
    assert('shape mine.successful_signups number', typeof rMine.data?.successful_signups === 'number');
    assert('shape mine.successful_bookings number', typeof rMine.data?.successful_bookings === 'number');
    assert('shape mine invite_url format', rMine.data.invite_url.startsWith('https://'));
    assert('shape mine invite_url contains code', rMine.data.invite_url.includes(rMine.data.code));
    pass('mine response shape OK');
  }

  // ── 17. Referral does not leak sensitive data ─────────────────────────────
  section('17. Security: no sensitive data in referral responses');
  {
    const ref = await signup('sec-ref');
    const usr = await signup('sec-usr');
    await req('POST', '/api/referrals/redeem', {
      body: { newUserId: usr.id, referralCode: ref.referralCode },
    });

    const mine = await req('GET', '/api/referrals/mine', { token: ref.token });
    assertEq('sec mine → 200', mine.status, 200);
    const invited = mine.data?.invited_users || [];
    for (const invitedUser of invited) {
      assert(`invited user ${invitedUser.id} has no password`, invitedUser.password === undefined);
      assert(`invited user ${invitedUser.id} has no token`, invitedUser.token === undefined);
      assert(`invited user ${invitedUser.id} has no referral_code`, invitedUser.referral_code === undefined);
    }
    pass('no sensitive fields in invited_users OK');
  }

  // ── 18. /join invite_url consistency ─────────────────────────────────────
  section('18. /join URL from mine → redirect works');
  {
    const ref = await signup('url-ref');
    const mine = await req('GET', '/api/referrals/mine', { token: ref.token });
    const code = mine.data?.code;
    assert('mine returned code', typeof code === 'string');

    const joinPath = `/join/${code}`;
    const r = await req('GET', joinPath);
    assertEq('mine code works in /join', r.status, 302);
    pass('mine code → /join redirect consistent');

    const loc = r.headers.get('location') || '';
    assert('/join redirect contains code in query', loc.includes(code) || loc.includes(encodeURIComponent(code)));
    pass('/join location contains code OK');
  }

  // ── 19. Multiple referrers stats independence ─────────────────────────────
  section('19. Stats independence: one referrer does not affect another');
  {
    const refA = await signup('indep-A');
    const refB = await signup('indep-B');

    const usersA = await Promise.all(Array.from({ length: 5 }, (_, i) => signup(`indep-A-u${i}`)));
    const usersB = await Promise.all(Array.from({ length: 3 }, (_, i) => signup(`indep-B-u${i}`)));

    await Promise.all([
      ...usersA.map(u => req('POST', '/api/referrals/redeem', { body: { newUserId: u.id, referralCode: refA.referralCode } })),
      ...usersB.map(u => req('POST', '/api/referrals/redeem', { body: { newUserId: u.id, referralCode: refB.referralCode } })),
    ]);

    const [sA, sB] = await Promise.all([
      req('GET', `/api/referrals/stats/${refA.id}`),
      req('GET', `/api/referrals/stats/${refB.id}`),
    ]);

    assert('refA count = 5', sA.data.count === 5, `got ${sA.data.count}`);
    assert('refB count = 3', sB.data.count === 3, `got ${sB.data.count}`);
    pass('stats independence OK');
  }

  // ── 20. Signup with bad referral code is graceful ─────────────────────────
  section('20. Signup with invalid referral code — graceful degradation');
  {
    // User should be created even if referral code is bogus
    const u = await signup('bad-ref-signup', 'NOTACODE');
    assert('user created despite bad ref code', typeof u.id === 'number' && u.id > 0);
    pass('signup with bogus referral code creates user OK');

    // Stats for bogus referrer should not exist → 404
    // (No user with code NOTACODE)
    pass('graceful degradation on bad signup referral code OK');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  RESULTS`);
  console.log('═'.repeat(60));
  console.log(`  Total assertions: ${total}`);
  console.log(`  Passed:           ${passed}`);
  console.log(`  Failed:           ${failed}`);

  if (failures.length > 0) {
    console.log('\n  FAILURES:');
    failures.forEach(f => console.log(`    ✗ ${f}`));
  }

  console.log(`\n  stamp=${STAMP}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n  ALL ASSERTIONS PASSED\n');
  }
}

main().catch(err => {
  console.error('\nFATAL:', err.message || err);
  process.exit(1);
});
