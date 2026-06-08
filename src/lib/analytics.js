const API_BASE = import.meta.env.VITE_API_URL || '/api';
const VISITOR_KEY = 'ask_analytics_visitor_id';
const FIRST_TOUCH_KEY = 'ask_analytics_first_touch';
const LAST_TOUCH_KEY = 'ask_analytics_last_touch';
const SESSION_KEY = 'ask_analytics_session_id';
const LANDING_KEY = 'ask_analytics_landing_page';
const SESSION_STARTED_KEY = 'ask_analytics_session_started_at';

let queue = [];
let timer = null;

function id(prefix) {
  if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function storageGet(store, key) {
  try { return store.getItem(key); } catch { return null; }
}

function storageSet(store, key, value) {
  try { store.setItem(key, value); } catch {}
}

function getVisitorId() {
  let visitorId = storageGet(localStorage, VISITOR_KEY);
  if (!visitorId) {
    visitorId = id('v');
    storageSet(localStorage, VISITOR_KEY, visitorId);
  }
  return visitorId;
}

function getSessionId() {
  const startedAt = Number(storageGet(sessionStorage, SESSION_STARTED_KEY) || 0);
  const expired = !startedAt || Date.now() - startedAt > 30 * 60 * 1000;
  let sessionId = storageGet(sessionStorage, SESSION_KEY);
  if (!sessionId || expired) {
    sessionId = id('s');
    storageSet(sessionStorage, SESSION_KEY, sessionId);
    storageSet(sessionStorage, SESSION_STARTED_KEY, String(Date.now()));
    storageSet(sessionStorage, LANDING_KEY, window.location.pathname + window.location.search);
  }
  return sessionId;
}

export function getAnalyticsContext() {
  if (typeof window === 'undefined') return { visitor_id: '', session_id: '' };
  return {
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
  };
}

export function classifyPage(path = window.location.pathname) {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  if (clean === '/') return 'homepage';
  if (/^\/schools\/[^/]+\/[^/]+$/.test(clean)) return 'school-subject page';
  if (/^\/schools\/[^/]+$/.test(clean)) return 'school page';
  if (/^\/subjects\/[^/]+$/.test(clean)) return 'subject page';
  if (/^\/tutors\/[^/]+$/.test(clean)) return 'tutor profile';
  if (/^\/blog\/[^/]+$/.test(clean)) return 'blog';
  if (/^\/(login|signup|forgot-password|reset-password|auth)/.test(clean)) return 'auth';
  if (/^\/(dashboard|account|admin|messages|chat)/.test(clean)) return 'dashboard';
  if (clean === '/browse' || clean === '/tutors') return 'marketplace';
  if (clean === '/create-listing' || clean === '/become-a-tutor') return 'tutor application';
  return 'other';
}

function getUtm() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    utm_term: params.get('utm_term') || '',
  };
}

function captureTouch() {
  const touch = {
    referrer: document.referrer || '',
    landing_page: storageGet(sessionStorage, LANDING_KEY) || window.location.pathname + window.location.search,
    utm: getUtm(),
    at: new Date().toISOString(),
  };
  if (!storageGet(localStorage, FIRST_TOUCH_KEY)) storageSet(localStorage, FIRST_TOUCH_KEY, JSON.stringify(touch));
  storageSet(localStorage, LAST_TOUCH_KEY, JSON.stringify(touch));
  return touch;
}

function deviceInfo() {
  const ua = navigator.userAgent || '';
  const type = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';
  const browser = /Chrome/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : /Firefox/i.test(ua) ? 'Firefox' : /Edg/i.test(ua) ? 'Edge' : 'Other';
  const os = /iPhone|iPad|iOS/i.test(ua) ? 'iOS' : /Android/i.test(ua) ? 'Android' : /Mac/i.test(ua) ? 'macOS' : /Win/i.test(ua) ? 'Windows' : 'Other';
  return { type, browser, os };
}

function cleanMetadata(metadata = {}) {
  const blocked = /password|token|secret|code|email|phone|zelle|venmo/i;
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !blocked.test(key)).slice(0, 20));
}

async function flush() {
  if (!queue.length) return;
  const events = queue.splice(0, 25);
  const token = storageGet(localStorage, 'ask_token');
  try {
    await fetch(`${API_BASE}/analytics/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      keepalive: true,
      body: JSON.stringify({ events }),
    });
  } catch {
    queue = events.concat(queue).slice(0, 50);
  }
}

export function trackEvent(eventName, metadata = {}) {
  if (!eventName || typeof window === 'undefined') return;
  const touch = captureTouch();
  const path = window.location.pathname + window.location.search;
  queue.push({
    event_name: eventName,
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    url: window.location.href,
    path,
    page_title: document.title,
    page_type: classifyPage(path),
    referrer: document.referrer || '',
    landing_page: touch.landing_page,
    first_touch: storageGet(localStorage, FIRST_TOUCH_KEY),
    last_touch: storageGet(localStorage, LAST_TOUCH_KEY),
    utm: touch.utm,
    device: deviceInfo(),
    metadata: cleanMetadata(metadata),
  });
  clearTimeout(timer);
  timer = setTimeout(flush, 500);
}

export function trackPageView(metadata = {}) {
  trackEvent('page_view', metadata);
}

export function flushAnalytics() {
  return flush();
}
