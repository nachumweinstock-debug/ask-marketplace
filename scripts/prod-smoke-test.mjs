const API = process.env.API_BASE || 'https://ask-marketplace-production.up.railway.app/api';
const PROVIDER_TERMS_VERSION = '2026-06-06';
const stamp = process.env.SMOKE_STAMP || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const dmMarker = `smoke-dm-${stamp.split('-').at(-1)}`;
const password = `SmokePass-${stamp}!`;
const conciergeVisitorId = `smoke-concierge-visitor-${stamp}`;
const conciergeSessionId = `smoke-concierge-session-${stamp}`;

const state = {
  provider: {},
  student: {},
  invitee: {},
  listingId: null,
  availabilityId: null,
  bookingId: null,
  helpWantedId: null,
  timeRequestId: null,
  connectionId: null,
  conciergeMemorySeeded: false,
  failures: [],
};

function log(step, detail = '') {
  console.log(`PASS ${step}${detail ? `: ${detail}` : ''}`);
}

function fail(step, err) {
  state.failures.push({ step, err });
  console.error(`FAIL ${step}: ${err.message || err}`);
}

async function request(method, path, { token, body, expected = [200], label = `${method} ${path}` } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  const okStatuses = Array.isArray(expected) ? expected : [expected];
  if (!okStatuses.includes(res.status)) {
    throw new Error(`${label} returned ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return { status: res.status, data };
}

async function signup(kind, name) {
  const email = `codex-smoke-${kind}-${stamp}@example.com`;
  const role = kind === 'provider' ? 'provider' : 'student';
  const { data } = await request('POST', '/auth/signup', {
    body: {
      email,
      name,
      password,
      phone: '5551234567',
      university: 'Yeshiva University',
      termsAccepted: true,
      termsVersion: '2026-05-02',
      privacyVersion: '2026-05-02',
      timezone: 'America/New_York',
      role,
    },
    label: `signup ${kind}`,
  });
  if (!data.token || !data.user?.id) throw new Error(`signup ${kind} missing token/user`);
  state[kind] = { email, token: data.token, user: data.user };
  log(`signup ${kind}`, `${email} id=${data.user.id}`);
}

async function login(kind) {
  const { email } = state[kind];
  const { data } = await request('POST', '/auth/login', {
    body: { email, password },
    label: `login ${kind}`,
  });
  if (!data.token || data.user.email !== email) throw new Error(`login ${kind} returned wrong user`);
  state[kind].token = data.token;
  state[kind].user = data.user;
  log(`login ${kind}`, `id=${data.user.id}`);
}

async function seedConciergeMemory(token, prompt) {
  await request('POST', '/analytics/events', {
    token,
    body: {
      events: [{
        event_name: 'concierge_prompt_submitted',
        visitor_id: conciergeVisitorId,
        session_id: conciergeSessionId,
        url: 'https://www.uask.live/browse',
        path: '/browse',
        page_title: 'Browse Campus Services at Yeshiva University | ASK Marketplace',
        page_type: 'marketplace',
        referrer: '',
        landing_page: '/browse',
        utm: {},
        device: { type: 'desktop', browser: 'Chrome', os: 'macOS' },
        metadata: { prompt },
      }],
    },
    expected: [200, 202],
    label: 'seed concierge memory',
  });
  state.conciergeMemorySeeded = true;
  log('concierge memory seeded', prompt);
}

async function smokeConcierge(token) {
  const exactPrompt = 'Need Excel help for a job interview';
  const exact = await request('POST', '/providers/concierge', {
    token,
    body: {
      text: exactPrompt,
      analytics: {
        visitor_id: conciergeVisitorId,
        session_id: conciergeSessionId,
      },
    },
    label: 'concierge exact parse',
  });
  if (!exact.data.answer || !exact.data.search) throw new Error('concierge exact parse missing answer/search');
  if (exact.data.category !== 'tutor') throw new Error(`concierge exact parse expected tutor, got ${exact.data.category}`);
  log('concierge exact parse', `${exact.data.category}${exact.data.subcategory ? `/${exact.data.subcategory}` : ''}`);

  await seedConciergeMemory(token, exactPrompt);
  await request('POST', '/analytics/events', {
    token,
    body: {
      events: [{
        event_name: 'concierge_result_clicked',
        visitor_id: conciergeVisitorId,
        session_id: conciergeSessionId,
        url: 'https://www.uask.live/browse',
        path: '/browse',
        page_title: 'Browse Campus Services at Yeshiva University | ASK Marketplace',
        page_type: 'marketplace',
        referrer: '',
        landing_page: '/browse',
        utm: {},
        device: { type: 'desktop', browser: 'Chrome', os: 'macOS' },
        metadata: {
          prompt: exactPrompt,
          provider_name: 'Smoke Test Excel Tutor',
          provider_category: 'tutor',
          provider_subcategory: 'Excel',
        },
      }],
    },
    expected: [200, 202],
    label: 'seed concierge click memory',
  });
  log('concierge click memory seeded', 'Smoke Test Excel Tutor');

  const fuzzyPrompt = 'same kind of thing again, but on campus tonight';
  const fuzzy = await request('POST', '/providers/concierge', {
    token,
    body: {
      text: fuzzyPrompt,
      analytics: {
        visitor_id: conciergeVisitorId,
        session_id: conciergeSessionId,
      },
    },
    label: 'concierge fuzzy parse',
  });
  if (!fuzzy.data.answer || !fuzzy.data.search) throw new Error('concierge fuzzy parse missing answer/search');
  if (String(fuzzy.data.search).trim().length < 2) throw new Error('concierge fuzzy parse returned an empty search');
  if (fuzzy.data.category !== 'tutor') throw new Error(`concierge fuzzy parse expected tutor, got ${fuzzy.data.category}`);
  if (String(fuzzy.data.subcategory || '').toLowerCase() !== 'excel') throw new Error(`concierge fuzzy parse expected Excel, got ${fuzzy.data.subcategory}`);
  log('concierge fuzzy parse', `${fuzzy.data.category}${fuzzy.data.subcategory ? `/${fuzzy.data.subcategory}` : ''}`);
}

async function cleanup() {
  const ops = [];
  if (state.connectionId) {
    ops.push(request('DELETE', `/people/connections/${state.connectionId}`, {
      token: state.student.token,
      expected: [200, 403, 404],
      label: 'cleanup connection',
    }));
  }
  if (state.helpWantedId) {
    ops.push(request('DELETE', `/help-wanted/${state.helpWantedId}`, {
      token: state.student.token,
      expected: [200, 404],
      label: 'cleanup help wanted',
    }));
  }
  if (state.listingId) {
    ops.push(request('DELETE', `/providers/${state.listingId}`, {
      token: state.provider.token,
      expected: [200, 400, 404],
      label: 'cleanup listing',
    }));
  }
  const results = await Promise.allSettled(ops);
  for (const result of results) {
    if (result.status === 'rejected') console.error(`WARN cleanup: ${result.reason.message}`);
  }
}

async function main() {
  const health = await request('GET', '/health', { label: 'health' });
  if (health.data?.status !== 'ok') throw new Error('health did not return ok');
  log('health');

  await signup('provider', 'Codex Smoke Provider');
  await signup('student', 'Codex Smoke Student');
  await signup('invitee', 'Codex Smoke Invitee');

  await request('POST', '/auth/login', {
    body: { email: state.student.email, password: 'wrong-password' },
    expected: [401],
    label: 'wrong password rejection',
  });
  log('wrong password rejected');

  await login('provider');
  await login('student');
  await login('invitee');

  const studentAccount = await request('PUT', '/account', {
    token: state.student.token,
    body: {
      name: 'Codex Smoke Student',
      major: 'Smoke Testing',
      classes_taking: 'Auth 101',
      gpa: '3.7',
      user_bio: 'Temporary smoke test account for production verification.',
      phone: '5551234567',
      contact_pref: 'imessage',
      zelle: 'codex-smoke-zelle',
      venmo: 'codex-smoke-venmo',
    },
    label: 'account update',
  });
  if (studentAccount.data.major !== 'Smoke Testing') throw new Error('account update did not persist major');
  await login('student');
  const me = await request('GET', '/auth/me', { token: state.student.token, label: 'auth me after relogin' });
  if (me.data.major !== 'Smoke Testing') throw new Error('auth/me did not return persisted account data after relogin');
  const account = await request('GET', '/account', { token: state.student.token, label: 'account fetch with username' });
  if (!account.data.username) throw new Error('account did not return/backfill username');
  await request('GET', `/people/u/${account.data.username}`, { expected: [404], label: 'smoke user hidden from public username profile' });
  log('account persistence after relogin');

  await smokeConcierge(state.student.token);
  log('concierge parse + memory');

  await request('POST', '/providers/terms/accept', {
    token: state.provider.token,
    body: { providerTermsVersion: PROVIDER_TERMS_VERSION },
    label: 'provider accepts terms',
  });
  log('provider accepts terms');

  const become = await request('POST', '/providers/become', {
    token: state.provider.token,
    body: { providerTermsAccepted: true, providerTermsVersion: PROVIDER_TERMS_VERSION },
    label: 'create listing shell',
  });
  state.listingId = become.data.profile_id;
  if (!state.listingId) throw new Error('provider become missing profile_id');
  log('listing shell created', `listing=${state.listingId}`);

  const updatedListing = await request('PUT', `/providers/${state.listingId}`, {
    token: state.provider.token,
    body: {
      title: `Codex Smoke Listing ${stamp}`,
      bio: 'This is a temporary smoke-test listing used to verify production booking flows.',
      category: 'tutor',
      subcategory: 'Smoke Testing',
      price_per_session: 12,
      session_type: 'both',
      zelle: 'codex-provider-zelle',
      venmo: 'codex-provider-venmo',
      allow_group: true,
      max_group_size: 3,
    },
    label: 'update listing',
  });
  if (updatedListing.data.title !== `Codex Smoke Listing ${stamp}`) throw new Error('listing title did not persist');
  log('listing update');

  const browse = await request('GET', `/providers?search=${encodeURIComponent(stamp)}`, { label: 'browse listing search' });
  if (!browse.data.some((p) => p.id === state.listingId)) throw new Error('created listing not found in browse search');
  log('listing browse/search');

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const slot = await request('POST', '/availability', {
    token: state.provider.token,
    body: { provider_id: state.listingId, date: tomorrow, start_time: '10:00', end_time: '10:30' },
    label: 'create availability',
  });
  state.availabilityId = slot.data.id;
  log('availability create', `slot=${state.availabilityId}`);

  const parsedSchedule = await request('POST', '/availability/parse-schedule', {
    token: state.provider.token,
    body: { text: 'Tuesday and Thursday 6-7pm for the next 3 weeks' },
    label: 'availability parse schedule',
  });
  if (!Array.isArray(parsedSchedule.data.slots) || parsedSchedule.data.slots.length < 2) {
    throw new Error('schedule parser did not return expected slots');
  }
  log('availability parse schedule', `${parsedSchedule.data.slots.length} slots`);

  const publicListingLocked = await request('GET', `/providers/${state.listingId}`, { label: 'public listing payment locked' });
  if (publicListingLocked.data.payment_unlocked !== false || publicListingLocked.data.zelle !== null) {
    throw new Error('payment data was not locked for anonymous listing view');
  }
  if (!publicListingLocked.data.availability.some((a) => a.id === state.availabilityId)) {
    throw new Error('public listing did not expose available slot');
  }
  log('public listing and payment redaction');

  const booking = await request('POST', '/bookings', {
    token: state.student.token,
    body: { availability_id: state.availabilityId, group_invite_ids: [state.invitee.user.id] },
    label: 'student booking create',
  });
  state.bookingId = booking.data.id;
  log('booking create', `booking=${state.bookingId}`);

  const providerBookings = await request('GET', '/bookings/mine?as=provider', {
    token: state.provider.token,
    label: 'provider bookings list',
  });
  if (!providerBookings.data.some((b) => b.id === state.bookingId && b.status === 'pending')) {
    throw new Error('provider cannot see pending booking');
  }
  log('provider sees pending booking');

  const inviteeInvites = await request('GET', '/bookings/group-invites/mine', {
    token: state.invitee.token,
    label: 'invitee group invites',
  });
  const invite = inviteeInvites.data.find((i) => i.booking_id === state.bookingId);
  if (!invite) throw new Error('group invite not visible to invitee');
  await request('POST', `/bookings/group-invites/${invite.id}/accept`, {
    token: state.invitee.token,
    label: 'accept group invite',
  });
  log('group invite accept');

  const confirmed = await request('PATCH', `/bookings/${state.bookingId}`, {
    token: state.provider.token,
    body: { status: 'confirmed' },
    label: 'provider confirms booking',
  });
  if (confirmed.data.status !== 'confirmed') throw new Error('booking did not confirm');
  log('booking confirm');

  const listingUnlocked = await request('GET', `/providers/${state.listingId}`, {
    token: state.student.token,
    label: 'listing payment unlocked after confirm',
  });
  if (!listingUnlocked.data.payment_unlocked || listingUnlocked.data.zelle !== 'codex-provider-zelle') {
    throw new Error('payment info did not unlock after confirmed booking');
  }
  log('payment unlock after confirmed booking');

  const completed = await request('PATCH', `/bookings/${state.bookingId}`, {
    token: state.student.token,
    body: { status: 'completed' },
    label: 'student marks completed',
  });
  if (completed.data.status !== 'completed') throw new Error('booking did not complete');
  log('booking complete');

  const review = await request('POST', '/reviews', {
    token: state.student.token,
    body: { booking_id: state.bookingId, rating: 5, comment: 'Smoke test review. Temporary.' },
    label: 'review create',
  });
  if (review.data.rating !== 5) throw new Error('review rating mismatch');
  log('review create');

  const dmToProvider = await request('POST', `/dm/${state.provider.user.id}`, {
    token: state.student.token,
    body: { body: `Smoke test DM ${dmMarker}` },
    label: 'student sends dm',
  });
  if (!dmToProvider.data.id) throw new Error('DM send missing id');
  const unread = await request('GET', '/dm/unread', { token: state.provider.token, label: 'provider dm unread' });
  if (unread.data.count < 1) throw new Error('provider unread count did not increment');
  const thread = await request('GET', `/dm/${state.student.user.id}`, { token: state.provider.token, label: 'provider reads dm thread' });
  if (!thread.data.some((m) => m.body.includes(dmMarker))) throw new Error('DM thread missing sent message');
  log('direct messages send/unread/read');

  const connection = await request('POST', '/people/connections', {
    token: state.student.token,
    body: { receiver_id: state.invitee.user.id },
    label: 'connection request',
  });
  state.connectionId = connection.data.id;
  await request('PATCH', `/people/connections/${state.connectionId}`, {
    token: state.invitee.token,
    label: 'connection accept',
  });
  const mineConnections = await request('GET', '/people/connections/mine', {
    token: state.student.token,
    label: 'connections mine',
  });
  if (!mineConnections.data.accepted.some((c) => c.id === state.invitee.user.id)) throw new Error('accepted connection missing');
  log('people connection request/accept');

  const helpWanted = await request('POST', '/help-wanted', {
    token: state.student.token,
    body: {
      title: `Codex smoke help ${stamp}`,
      description: 'Temporary smoke test help request.',
      category: 'tutor',
      budget: '$12',
      urgency: 'flexible',
    },
    label: 'help wanted create',
  });
  state.helpWantedId = helpWanted.data.id;
  const helpMine = await request('GET', '/help-wanted/mine', { token: state.student.token, label: 'help wanted mine' });
  if (!helpMine.data.some((h) => h.id === state.helpWantedId)) throw new Error('help wanted not in mine');
  await request('PATCH', `/help-wanted/${state.helpWantedId}`, {
    token: state.student.token,
    body: { status: 'closed' },
    label: 'help wanted close',
  });
  log('help wanted create/list/close');

  const tr = await request('POST', '/time-requests', {
    token: state.student.token,
    body: {
      provider_id: state.listingId,
      requested_date: tomorrow,
      requested_time: '11:00',
      message: 'Smoke test time request.',
    },
    label: 'time request create',
  });
  state.timeRequestId = tr.data.id;
  const trMine = await request('GET', '/time-requests/mine', { token: state.provider.token, label: 'time requests mine' });
  if (!trMine.data.some((r) => r.id === state.timeRequestId)) throw new Error('time request not visible to provider');
  const trAccepted = await request('PATCH', `/time-requests/${state.timeRequestId}`, {
    token: state.provider.token,
    body: { status: 'accepted' },
    label: 'time request accept',
  });
  if (trAccepted.data.status !== 'accepted') throw new Error('time request did not accept');
  log('time request create/list/accept');

  await cleanup();
  log('cleanup api records');

  console.log(`\nSMOKE TEST COMPLETE stamp=${stamp}`);
}

main().catch(async (err) => {
  fail('smoke test', err);
  await cleanup();
  process.exit(1);
});
