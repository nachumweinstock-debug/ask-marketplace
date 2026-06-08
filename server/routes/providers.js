import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../auth.js';
import { storeImage } from '../storage.js';
import posthog from '../posthog.js';
import { attachTrust } from '../trust.js';
import { withEffectiveFirstTimeDiscount } from '../pricing.js';

/**
 * Returns true if requesterId is allowed to see zelle/venmo for providerUserId.
 * Gate: own profile, OR a confirmed/completed booking between them (either direction).
 */
function canSeePayment(requesterId, providerUserId) {
  if (!requesterId) return false;
  if (requesterId === providerUserId) return true;

  // Student booked with this provider and provider confirmed
  const asStudent = db.prepare(`
    SELECT 1 FROM bookings b
    JOIN provider_profiles pp ON pp.id = b.provider_id
    WHERE b.student_id = ? AND pp.user_id = ? AND b.status IN ('confirmed', 'completed')
    LIMIT 1
  `).get(requesterId, providerUserId);
  if (asStudent) return true;

  // Provider booked with this user as student and it was confirmed
  const asProvider = db.prepare(`
    SELECT 1 FROM bookings b
    JOIN provider_profiles pp ON pp.id = b.provider_id
    WHERE b.student_id = ? AND pp.user_id = ? AND b.status IN ('confirmed', 'completed')
    LIMIT 1
  `).get(providerUserId, requesterId);
  return !!asProvider;
}

function redactPayment(provider, requesterId) {
  if (canSeePayment(requesterId, provider.user_id)) return { ...provider, college: null };
  return { ...provider, zelle: null, venmo: null, college: null };
}

function redactPublicListing(provider) {
  return { ...provider, zelle: null, venmo: null, college: null };
}

const router = Router();
const STANDARD_CATS = ['tutor', 'barber', 'hebrew tutor', 'fitness', 'tennis', 'other'];
const CURRENT_PROVIDER_TERMS = '2026-06-06';
const CONCIERGE_MODEL = process.env.GEMINI_CONCIERGE_MODEL || 'gemini-2.5-flash-lite';

function latestDraftProfile(userId) {
  return db.prepare(`
    SELECT *
    FROM provider_profiles
    WHERE user_id = ?
      AND COALESCE(LENGTH(TRIM(bio)), 0) < 20
    ORDER BY id DESC
    LIMIT 1
  `).get(userId);
}

function normalizeCampus(value) {
  if (value === undefined) return undefined;
  const clean = String(value || '').trim().toUpperCase();
  if (!clean) return null;
  if (clean === 'WILF') return 'WILF';
  if (clean === 'BEREN' || clean === 'BEREAN') return 'BEREN';
  return null;
}

function normalizeConciergeCategory(value) {
  const text = String(value || '').trim();
  const lower = text.toLowerCase();
  if (!text || lower === 'all' || lower === 'any') return 'all';
  if (['tutor', 'barber', 'fitness', 'languages', 'music'].includes(lower)) return lower;
  if (['torah', 'torah studies', 'gemara'].includes(lower)) return 'Torah Studies';
  return 'all';
}

function normalizeConciergeSessionType(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'zoom' || text === 'online' || text === 'virtual') return 'zoom';
  if (text === 'in-person' || text === 'in person' || text === 'campus') return 'in-person';
  return 'all';
}

function normalizeConciergeCampus(value) {
  const text = String(value || '').trim().toUpperCase();
  if (text === 'WILF') return 'WILF';
  if (text === 'BEREN' || text === 'BEREAN') return 'BEREN';
  return 'all';
}

function normalizeConciergeResult(raw, fallbackText) {
  const text = String(fallbackText || '').trim();
  const search = String(raw?.search || text).trim();
  return {
    answer: String(raw?.answer || `I’m pulling the closest matches for “${search || text}”.`).trim(),
    search: search || text,
    category: normalizeConciergeCategory(raw?.category),
    subcategory: String(raw?.subcategory || '').trim(),
    session_type: normalizeConciergeSessionType(raw?.session_type),
    campus: normalizeConciergeCampus(raw?.campus),
    should_search: raw?.should_search !== false,
    source: raw?.source || 'fallback',
  };
}

function mergeConciergeHeuristics(raw, text) {
  const local = localConciergeParse(text);
  const next = { ...raw };
  if (!next.search || !String(next.search).trim()) next.search = local.search;
  if (!next.category || next.category === 'all') next.category = local.category;
  if (!next.subcategory) next.subcategory = local.subcategory;
  if (!next.session_type || next.session_type === 'all') next.session_type = local.session_type;
  if (!next.campus || next.campus === 'all') next.campus = local.campus;
  if (!next.answer) next.answer = local.answer;
  if (next.should_search === undefined) next.should_search = local.should_search;
  return normalizeConciergeResult(next, text);
}

function recentConciergePrompts() {
  try {
    const rows = db.prepare(`
      SELECT metadata, created_at
      FROM analytics_events
      WHERE event_name = 'concierge_prompt_submitted'
      ORDER BY created_at DESC
      LIMIT 25
    `).all();

    const seen = new Set();
    const prompts = [];
    for (const row of rows) {
      try {
        const meta = JSON.parse(row.metadata || '{}');
        const prompt = String(meta?.prompt || meta?.query || meta?.text || '').trim();
        if (!prompt || seen.has(prompt.toLowerCase())) continue;
        seen.add(prompt.toLowerCase());
        prompts.push(prompt);
      } catch {}
    }
    return prompts.slice(0, 12);
  } catch {
    return [];
  }
}

function localConciergeParse(text) {
  const lower = String(text || '').toLowerCase();
  const result = {
    search: String(text || '').trim(),
    category: 'all',
    subcategory: '',
    session_type: 'all',
    campus: 'all',
    should_search: true,
    answer: 'I’m narrowing the search and pulling the closest providers.',
    source: 'local',
  };

  if (/\bbarber|haircut|fade|taper|beard\b/.test(lower)) result.category = 'barber';
  else if (/\btennis|trainer|fitness|workout|boxing|yoga|basketball|soccer|running|golf\b/.test(lower)) result.category = 'fitness';
  else if (/\bhebrew|spanish|french|arabic|language|ivrit|yiddish\b/.test(lower)) result.category = 'languages';
  else if (/\bguitar|piano|violin|drums|vocal|music\b/.test(lower)) result.category = 'music';
  else if (/\bgemara|halacha|chumash|torah|tanach|mishna\b/.test(lower)) result.category = 'Torah Studies';
  else if (/\btutor|math|excel|chemistry|biology|physics|coding|economics|history|english|calc|calculus|stats\b/.test(lower)) result.category = 'tutor';

  if (/\bonline|virtual|zoom\b/.test(lower)) result.session_type = 'zoom';
  else if (/\bin person|on campus|near me\b/.test(lower)) result.session_type = 'in-person';

  if (/\bcalculus\b/.test(lower)) result.subcategory = 'Calculus';
  else if (/\bexcel\b/.test(lower)) result.subcategory = 'Excel';
  else if (/\bhebrew\b/.test(lower)) result.subcategory = 'Hebrew';
  else if (/\btennis\b/.test(lower)) result.subcategory = 'Tennis';
  else if (/\bbarber|haircut|fade|taper\b/.test(lower)) result.subcategory = 'Haircut';

  if (/\bwilf\b/.test(lower)) result.campus = 'WILF';
  else if (/\bberen\b|\bberean\b/.test(lower)) result.campus = 'BEREN';

  return result;
}

async function parseConciergeWithGemini(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return localConciergeParse(text);
  const pastPrompts = recentConciergePrompts();
  const memoryBlock = pastPrompts.length
    ? `Recent successful ASK prompts from this marketplace:\n${pastPrompts.map(prompt => `- ${prompt}`).join('\n')}\nUse these as style examples only.`
    : 'No historical prompts available.';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${CONCIERGE_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{
              text: [
                'You are the ASK Marketplace concierge parser.',
                'Interpret the user request into a concise browse query and filters.',
                'Return JSON only.',
                'If the user mentions a service, school context, campus, or format, map it to the closest browse filters.',
                'Keep the answer short and practical.',
                memoryBlock,
                `User request: ${text}`,
              ].join('\n'),
            }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              answer: { type: 'string', description: 'Short response to show in the concierge panel.' },
              search: { type: 'string', description: 'Normalized search query to send to browse.' },
              category: { type: 'string', description: 'Best matching ASK category.' },
              subcategory: { type: 'string', description: 'Best matching ASK subcategory if any.' },
              session_type: { type: 'string', description: 'all, zoom, or in-person.' },
              campus: { type: 'string', description: 'all, WILF, or BEREN.' },
              should_search: { type: 'boolean', description: 'Whether the user wants provider matches.' },
            },
            required: ['answer', 'search', 'category', 'subcategory', 'session_type', 'campus', 'should_search'],
            additionalProperties: false,
          },
        },
      }),
      signal: AbortSignal.timeout(7000),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Gemini request failed (${response.status})`);
  }

  const payload = await response.json();
  const rawText = payload?.candidates?.[0]?.content?.parts?.map(part => part?.text || '').join('') || '';
  const normalized = String(rawText).trim();
  const jsonSlice = normalized.includes('{')
    ? normalized.slice(normalized.indexOf('{'), normalized.lastIndexOf('}') + 1)
    : normalized;
  return mergeConciergeHeuristics(JSON.parse(jsonSlice), text);
}

// ── Named routes (must come before /:id) ──────────────────────────────────────

// GET /providers/price-stats?category=tutor&subcategory=Excel
router.get('/price-stats', (req, res) => {
  const { category, subcategory } = req.query;
  if (!category) return res.status(400).json({ error: 'category required' });
  let q = 'SELECT COUNT(*) as count, MIN(price_per_session) as min, MAX(price_per_session) as max, ROUND(AVG(price_per_session)) as avg FROM provider_profiles WHERE price_per_session > 0';
  const params = [];
  if (category === 'fitness') {
    q += " AND category IN ('fitness','tennis')";
  } else {
    q += ' AND (category = ? OR custom_category = ?)';
    params.push(category, category);
  }
  if (subcategory) {
    q += ' AND subcategory = ?';
    params.push(subcategory);
  }
  const stats = db.prepare(q).get(...params);
  res.json(stats);
});

// GET /providers/categories
router.get('/categories', (req, res) => {
  // Group case-insensitively, return the most recently-created spelling for each group
  const rows = db.prepare(`
    SELECT custom_category FROM provider_profiles
    WHERE custom_category IS NOT NULL AND custom_category != ''
    GROUP BY LOWER(TRIM(custom_category))
    ORDER BY LOWER(TRIM(custom_category))
  `).all();
  res.json(rows.map(r => r.custom_category));
});

// GET /providers/subcategories?category=tutor — distinct subcategories for a parent category
router.get('/subcategories', (req, res) => {
  const { category } = req.query;
  if (!category) return res.json([]);
  let rows;
  if (category === 'fitness') {
    rows = db.prepare(`SELECT DISTINCT subcategory FROM provider_profiles WHERE category IN ('fitness','tennis') AND subcategory IS NOT NULL AND subcategory != '' ORDER BY subcategory`).all();
  } else if (category === 'languages') {
    rows = db.prepare(`SELECT DISTINCT subcategory FROM provider_profiles WHERE (category = 'hebrew tutor' OR LOWER(TRIM(custom_category)) = 'languages') AND subcategory IS NOT NULL AND subcategory != '' ORDER BY subcategory`).all();
  } else if (category === 'music') {
    rows = db.prepare(`SELECT DISTINCT subcategory FROM provider_profiles WHERE LOWER(TRIM(custom_category)) = 'music' AND subcategory IS NOT NULL AND subcategory != '' ORDER BY subcategory`).all();
  } else {
    rows = db.prepare(`SELECT DISTINCT subcategory FROM provider_profiles WHERE category = ? AND subcategory IS NOT NULL AND subcategory != '' ORDER BY subcategory`).all(category);
  }
  res.json(rows.map(r => r.subcategory));
});

router.post('/concierge', async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const parsed = await parseConciergeWithGemini(text);
    res.json(mergeConciergeHeuristics(parsed, text));
  } catch (err) {
    try {
      res.json(mergeConciergeHeuristics(localConciergeParse(text), text));
    } catch (fallbackErr) {
      res.status(502).json({ error: fallbackErr.message || err.message || 'Failed to parse concierge request' });
    }
  }
});

// GET /providers/photo-suggestions?query=guitar
router.get('/photo-suggestions', async (req, res) => {
  const { query } = req.query;
  if (!query || query.trim().length < 2) return res.json([]);
  const q = query.trim();

  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const r = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=15&orientation=landscape`,
        { headers: { Authorization: pexelsKey }, signal: AbortSignal.timeout(5000) }
      );
      if (r.ok) {
        const data = await r.json();
        const urls = (data.photos || []).map(p => p.src.medium);
        if (urls.length) return res.json(urls);
      }
    } catch {}
  }

  // Keyword-matched curated fallback
  const lower = q.toLowerCase();
  const CURATED = {
    guitar:        ['https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=400&h=260&fit=crop'],
    piano:         ['https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1552422535-c45813c61732?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=400&h=260&fit=crop'],
    violin:        ['https://images.unsplash.com/photo-1465821185615-20b3c2fbf41b?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1612225330812-01a9c6b355ec?w=400&h=260&fit=crop'],
    drum:          ['https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1524230572899-a752b3835840?w=400&h=260&fit=crop'],
    vocal:         ['https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=260&fit=crop'],
    music:         ['https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=260&fit=crop'],
    hebrew:        ['https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=260&fit=crop'],
    ivrit:         ['https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=260&fit=crop'],
    spanish:       ['https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=260&fit=crop'],
    french:        ['https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1499856871958-5b9357976b82?w=400&h=260&fit=crop'],
    language:      ['https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1555374018-13a8994ab246?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=260&fit=crop'],
    math:          ['https://images.unsplash.com/photo-1509869175650-a1d97972541a?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=260&fit=crop'],
    chemistry:     ['https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=400&h=260&fit=crop'],
    biology:       ['https://images.unsplash.com/photo-1530026186-6b52b750b9c9?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&h=260&fit=crop'],
    physics:       ['https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1564325724739-bae0bd08762c?w=400&h=260&fit=crop'],
    coding:        ['https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=260&fit=crop'],
    excel:         ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=260&fit=crop'],
    tutor:         ['https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=260&fit=crop'],
    tennis:        ['https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400&h=260&fit=crop'],
    weightlifting: ['https://images.unsplash.com/photo-1581009137042-c552e485697a?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&h=260&fit=crop'],
    yoga:          ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=260&fit=crop'],
    running:       ['https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=260&fit=crop'],
    basketball:    ['https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=400&h=260&fit=crop'],
    soccer:        ['https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=260&fit=crop'],
    boxing:        ['https://images.unsplash.com/photo-1549476464-37392f717541?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1517438122650-eed8f8e8da54?w=400&h=260&fit=crop'],
    golf:          ['https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=400&h=260&fit=crop'],
    fitness:       ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=260&fit=crop'],
    barber:        ['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1599351447248-e7ae3f77f5a3?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?w=400&h=260&fit=crop'],
    haircut:       ['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=260&fit=crop'],
    gemara:        ['https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=260&fit=crop'],
    torah:         ['https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=260&fit=crop'],
    halacha:       ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=260&fit=crop','https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=260&fit=crop'],
  };

  Object.assign(CURATED, {
    accounting: CURATED.excel,
    finance: CURATED.excel,
    business: CURATED.excel,
    economics: CURATED.excel,
    statistics: CURATED.math,
    calculus: CURATED.math,
    english: CURATED.tutor,
    history: CURATED.tutor,
    writing: CURATED.tutor,
    sat: CURATED.tutor,
    act: CURATED.tutor,
    baseball: CURATED.fitness,
    swimming: CURATED.fitness,
    squash: CURATED.fitness,
    volleyball: CURATED.fitness,
    trainer: CURATED.fitness,
    gym: CURATED.fitness,
    hair: CURATED.barber,
    beard: CURATED.barber,
    makeup: CURATED.barber,
    nails: CURATED.barber,
    voice: CURATED.vocal,
    vocals: CURATED.vocal,
    drums: CURATED.drum,
    bass: CURATED.music,
    flute: CURATED.music,
    saxophone: CURATED.music,
    theory: CURATED.music,
    chumash: CURATED.torah,
    mishna: CURATED.torah,
    tanach: CURATED.torah,
    tefilla: CURATED.torah,
    parsha: CURATED.torah,
    yiddish: CURATED.language,
    arabic: CURATED.language,
    russian: CURATED.language,
    mandarin: CURATED.language,
    italian: CURATED.language,
    german: CURATED.language,
  });

  const matches = [];
  for (const [key, urls] of Object.entries(CURATED)) {
    if (lower.includes(key) || key.includes(lower)) matches.push(...urls);
  }
  if (!matches.length) {
    const words = lower.split(/[^a-z0-9]+/).filter(Boolean);
    for (const word of words) {
      for (const [key, urls] of Object.entries(CURATED)) {
        if (word.length > 2 && (key.includes(word) || word.includes(key))) matches.push(...urls);
      }
    }
  }
  const fallback = [
    ...CURATED.tutor,
    ...CURATED.fitness,
    ...CURATED.music,
    ...CURATED.barber,
  ];
  if (matches.length && matches.length < 12) matches.push(...fallback);
  res.json([...new Set(matches.length ? matches : fallback)].slice(0, 18));
});

// GET /providers/mine — all listings owned by logged-in user
router.get('/mine', requireAuth, (req, res) => {
  const listings = db.prepare(`
    SELECT pp.*,
      (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pp.id AND b.status = 'completed') as completed_sessions,
      (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pp.id AND b.status = 'pending') as pending_bookings
    FROM provider_profiles pp
    WHERE pp.user_id = ?
    ORDER BY pp.id DESC
  `).all(req.user.id);
  res.json(listings.map(attachTrust));
});

// GET /providers/u/:username — look up all listings for a user by their username slug
router.get('/u/:username', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, username FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const listings = db.prepare(`
    SELECT pp.*, u.name, u.username,
      (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pp.id AND b.status = 'completed') as completed_sessions
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE pp.user_id = ?
    ORDER BY pp.id DESC
  `).all(user.id);
  res.json({ user, listings: listings.map(row => attachTrust(withEffectiveFirstTimeDiscount(redactPublicListing(row), req.user?.id))) });
});

// GET /providers/by-user/:userId — all public listings for a given user
// Payment info stripped — use the individual /:id endpoint for that after auth check
router.get('/by-user/:userId', optionalAuth, (req, res) => {
  const listings = db.prepare(`
    SELECT pp.id, pp.user_id, pp.bio, pp.category, pp.custom_category, pp.subcategory,
           pp.price_per_session, pp.rating, pp.review_count, pp.listing_image,
           pp.session_type, pp.title,
           u.name, u.username,
           (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pp.id AND b.status = 'completed') as completed_sessions
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE pp.user_id = ?
    ORDER BY pp.id DESC
  `).all(req.params.userId);
  res.json(listings.map(row => attachTrust(withEffectiveFirstTimeDiscount(row, req.user?.id))));
});

// GET /providers/me/profile — first/most recent profile (backwards compat)
router.get('/me/profile', requireAuth, (req, res) => {
  const profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'No provider profile found' });
  res.json(attachTrust(profile));
});

// GET /providers — browse all
router.get('/', optionalAuth, (req, res) => {
  const { category, subcategory, search, sort, session_type, campus, min_price, max_price, min_rating, availability } = req.query;
  let query = `
    SELECT pp.*, u.name, u.email, u.username,
      (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pp.id AND b.status = 'completed') as completed_sessions
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE 1=1
      AND COALESCE(LENGTH(TRIM(pp.bio)), 0) >= 20
  `;
  const params = [];
  if (category && category !== 'all') {
    if (category === 'fitness') {
      query += " AND pp.category IN ('fitness', 'tennis')";
    } else if (category === 'languages') {
      query += " AND (pp.category = 'hebrew tutor' OR LOWER(TRIM(pp.custom_category)) = 'languages')";
    } else if (STANDARD_CATS.includes(category)) {
      query += ' AND pp.category = ?';
      params.push(category);
    } else {
      query += ' AND LOWER(TRIM(pp.custom_category)) = LOWER(TRIM(?))';
      params.push(category);
    }
  }
  if (subcategory && subcategory !== 'all') {
    query += ' AND pp.subcategory = ?';
    params.push(subcategory);
  }
  if (session_type && session_type !== 'all') {
    query += " AND (pp.session_type = ? OR pp.session_type = 'both')";
    params.push(session_type);
  }
  const normalizedCampus = normalizeCampus(campus);
  if (normalizedCampus) {
    query += " AND COALESCE(pp.session_type, 'in-person') IN ('in-person', 'both') AND pp.campus = ?";
    params.push(normalizedCampus);
  }
  if (min_price !== undefined && min_price !== '') {
    query += ' AND COALESCE(pp.price_per_session, 0) >= ?';
    params.push(Number(min_price) || 0);
  }
  if (max_price !== undefined && max_price !== '') {
    query += ' AND COALESCE(pp.price_per_session, 0) <= ?';
    params.push(Number(max_price) || 0);
  }
  if (min_rating !== undefined && min_rating !== '') {
    query += ' AND COALESCE(pp.rating, 0) >= ?';
    params.push(Number(min_rating) || 0);
  }
  if (availability === 'open') {
    query += ' AND EXISTS (SELECT 1 FROM availability a WHERE a.provider_id = pp.id AND a.is_booked = 0)';
  }
  if (search) {
    query += ' AND (u.name LIKE ? OR pp.bio LIKE ? OR pp.subcategory LIKE ? OR pp.custom_category LIKE ? OR pp.title LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (sort === 'newest') {
    query += ' ORDER BY pp.id DESC';
  } else if (sort === 'price_asc') {
    query += ' ORDER BY pp.price_per_session ASC';
  } else {
    query += ' ORDER BY pp.rating DESC, pp.review_count DESC';
  }
  res.json(db.prepare(query).all(...params).map(row => attachTrust(withEffectiveFirstTimeDiscount(redactPublicListing(row), req.user?.id))));
});

// POST /providers/become — create a new listing (always creates new, no longer a toggle)
router.post('/become', requireAuth, (req, res) => {
  const { providerTermsVersion, providerTermsAccepted } = req.body || {};

  // Check if terms already accepted on a prior listing creation
  const termsRow = db.prepare('SELECT provider_terms_version FROM users WHERE id = ?').get(req.user.id);
  const alreadyAccepted = termsRow?.provider_terms_version === CURRENT_PROVIDER_TERMS;

  if (!alreadyAccepted) {
    if (!providerTermsAccepted || !providerTermsVersion) {
      return res.status(403).json({ error: 'provider_terms_required', currentVersion: CURRENT_PROVIDER_TERMS });
    }
    if (providerTermsVersion !== CURRENT_PROVIDER_TERMS) {
      return res.status(403).json({ error: 'provider_terms_outdated', currentVersion: CURRENT_PROVIDER_TERMS });
    }
    db.prepare("UPDATE users SET provider_terms_version = ?, provider_terms_at = datetime('now') WHERE id = ?")
      .run(providerTermsVersion, req.user.id);
  }

  const draft = latestDraftProfile(req.user.id);
  if (draft) {
    db.prepare(`
      UPDATE provider_profiles
      SET tos_accepted_at = COALESCE(tos_accepted_at, datetime('now'))
      WHERE id = ?
    `).run(draft.id);
  } else {
    db.prepare(`
      INSERT INTO provider_profiles (user_id, category, created_at, tos_accepted_at)
      VALUES (?, ?, datetime('now'), datetime('now'))
    `).run(req.user.id, 'other');
  }
  db.prepare("UPDATE users SET role = 'provider' WHERE id = ?").run(req.user.id);
  // Auto-assign username if not already set
  const existing = db.prepare('SELECT username, name FROM users WHERE id = ?').get(req.user.id);
  if (!existing.username) {
    const base = (existing.name || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'user';
    let slug = base, n = 2;
    while (db.prepare('SELECT 1 FROM users WHERE username = ?').get(slug)) slug = `${base}-${n++}`;
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(slug, req.user.id);
  }
  const profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
  const user = db.prepare('SELECT id, email, name, role, username FROM users WHERE id = ?').get(req.user.id);

  posthog.capture({
    distinctId: String(req.user.id),
    event: 'listing_created',
    properties: { listing_id: profile.id },
  });

  res.json({ user, profile_id: profile.id });
});

router.post('/terms/accept', requireAuth, (req, res) => {
  const { providerTermsVersion } = req.body || {};
  if (providerTermsVersion !== CURRENT_PROVIDER_TERMS) {
    return res.status(403).json({ error: 'provider_terms_outdated', currentVersion: CURRENT_PROVIDER_TERMS });
  }

  let profile = latestDraftProfile(req.user.id);
  if (!profile) {
    db.prepare(`
      INSERT INTO provider_profiles (user_id, category, created_at, tos_accepted_at)
      VALUES (?, 'other', datetime('now'), datetime('now'))
    `).run(req.user.id);
    profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
  } else {
    db.prepare('UPDATE provider_profiles SET tos_accepted_at = datetime(\'now\') WHERE id = ?').run(profile.id);
    profile = db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(profile.id);
  }

  db.prepare(`
    UPDATE users
    SET role = 'provider',
        provider_terms_version = ?,
        provider_terms_at = datetime('now')
    WHERE id = ?
  `).run(CURRENT_PROVIDER_TERMS, req.user.id);

  res.json({ profile_id: profile.id, tos_accepted_at: profile.tos_accepted_at || new Date().toISOString(), currentVersion: CURRENT_PROVIDER_TERMS });
});

// PUT /providers/me — update most recent listing (backwards compat for CreateListing)
router.put('/me', requireAuth, async (req, res) => {
  const profile = db.prepare('SELECT * FROM provider_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'No provider profile found' });
  await updateProfile(req, res, profile);
});

// PUT /providers/:id — update a specific listing by id
router.put('/:id', requireAuth, async (req, res) => {
  const profile = db.prepare('SELECT * FROM provider_profiles WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!profile) return res.status(404).json({ error: 'Listing not found' });
  await updateProfile(req, res, profile);
});

// DELETE /providers/me — delete most recent listing (backwards compat)
router.delete('/me', requireAuth, (req, res) => {
  const profile = db.prepare('SELECT id FROM provider_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'No provider profile found' });
  deleteProfile(req.user.id, profile.id, res);
});

// DELETE /providers/:id — delete a specific listing
router.delete('/:id', requireAuth, (req, res) => {
  const profile = db.prepare('SELECT id FROM provider_profiles WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!profile) return res.status(404).json({ error: 'Listing not found' });
  deleteProfile(req.user.id, profile.id, res);
});

// GET /providers/:id — public listing page (payment info gated behind connection/booking)
router.get('/:id', optionalAuth, (req, res) => {
  const provider = db.prepare(`
    SELECT pp.*, u.name, u.email, u.username,
      (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pp.id AND b.status = 'completed') as completed_sessions
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE pp.id = ?
  `).get(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const DAY_ORDER = `CASE date WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7 ELSE 8 END`;
  const availability = db.prepare(
    `SELECT * FROM availability WHERE provider_id = ? AND is_booked = 0
     AND (date NOT GLOB '[0-9]*' OR date >= date('now'))
     ORDER BY ${DAY_ORDER}, start_time`
  ).all(req.params.id);

  const reviews = db.prepare(`
    SELECT r.*, u.name as student_name FROM reviews r
    JOIN users u ON r.student_id = u.id
    WHERE r.provider_id = ? AND COALESCE(r.hidden,0) = 0 ORDER BY r.created_at DESC
  `).all(req.params.id);

  // Expose whether payment is unlocked so frontend can show the right prompt
  const paymentUnlocked = canSeePayment(req.user?.id, provider.user_id);
  const safe = redactPayment(provider, req.user?.id);

  res.json({ ...attachTrust(withEffectiveFirstTimeDiscount(safe, req.user?.id)), availability, reviews, payment_unlocked: paymentUnlocked });
});

// ── Shared helpers ─────────────────────────────────────────────────────────────

async function updateProfile(req, res, profile) {
  try {
    const { bio, category, price_per_session, zelle, venmo, custom_category, subcategory, listing_image_data_url, session_type, campus, title, college, allow_group, max_group_size, intro_video_url, portfolio_notes } = req.body;
    if (!profile.tos_accepted_at) {
      return res.status(403).json({ error: 'provider_terms_required', currentVersion: CURRENT_PROVIDER_TERMS });
    }
    if (price_per_session !== undefined && (isNaN(price_per_session) || price_per_session < 0 || price_per_session > 10000)) {
      return res.status(400).json({ error: 'Price must be between $0 and $10,000' });
    }
    // Normalize: trim + title-case so "guitar lessons" / "Guitar Leasons" don't fork
    const normalizedCustom = custom_category !== undefined
      ? (custom_category?.trim().replace(/\b\w/g, c => c.toUpperCase()) || null)
      : undefined;
    if (normalizedCustom && normalizedCustom.length > 50) return res.status(400).json({ error: 'Category name too long (max 50 chars)' });
    if (subcategory && subcategory.length > 60) return res.status(400).json({ error: 'Specialty too long (max 60 chars)' });
    if (bio !== undefined && bio.trim().length < 20) return res.status(400).json({ error: 'Description required (at least 20 characters)' });
    if (bio && bio.length > 2000) return res.status(400).json({ error: 'Bio too long (max 2000 chars)' });
    if (session_type && !['zoom', 'in-person', 'both'].includes(session_type)) {
      return res.status(400).json({ error: 'Invalid session type' });
    }
    const nextSessionType = session_type ?? profile.session_type ?? 'in-person';
    const normalizedCampus = normalizeCampus(campus);
    if (campus !== undefined && !normalizedCampus && nextSessionType !== 'zoom') {
      return res.status(400).json({ error: 'Choose WILF or BEREN campus' });
    }
    const nextCampus = nextSessionType === 'zoom'
      ? null
      : (normalizedCampus ?? profile.campus ?? 'WILF');

    // Normalize category: 'tennis' legacy → 'fitness'
    const normalizedCategory = (category === 'tennis' ? 'fitness' : category) ?? profile.category;

    let listing_image = profile.listing_image;
    if (listing_image_data_url === null) {
      listing_image = null;
    } else if (listing_image_data_url?.startsWith('data:image/')) {
      listing_image = await storeImage(listing_image_data_url, 'listings', profile.id);
    } else if (listing_image_data_url?.startsWith('https://')) {
      // Only allow HTTPS URLs (no javascript:, data:, or plain http)
      try { new URL(listing_image_data_url); listing_image = listing_image_data_url; }
      catch { /* invalid URL, ignore */ }
    }

    db.prepare(`
      UPDATE provider_profiles
      SET bio = ?, category = ?, price_per_session = ?, zelle = ?, venmo = ?,
          custom_category = ?, subcategory = ?, listing_image = ?, session_type = ?, campus = ?, title = ?,
          college = ?, allow_group = ?, max_group_size = ?, intro_video_url = ?, portfolio_notes = ?
      WHERE id = ?
    `).run(
      bio ?? profile.bio,
      normalizedCategory,
      price_per_session ?? profile.price_per_session,
      zelle ?? profile.zelle,
      venmo ?? profile.venmo,
      normalizedCustom !== undefined ? normalizedCustom : profile.custom_category,
      subcategory !== undefined ? subcategory : profile.subcategory,
      listing_image,
      nextSessionType,
      nextCampus,
      title !== undefined ? title : profile.title,
      college !== undefined ? (college?.trim() || null) : profile.college,
      allow_group !== undefined ? (allow_group ? 1 : 0) : profile.allow_group,
      max_group_size !== undefined ? (parseInt(max_group_size) || 6) : profile.max_group_size,
      intro_video_url !== undefined ? String(intro_video_url || '').slice(0, 400) : profile.intro_video_url,
      portfolio_notes !== undefined ? String(portfolio_notes || '').slice(0, 2000) : profile.portfolio_notes,
      profile.id
    );

    const updated = db.prepare('SELECT * FROM provider_profiles WHERE id = ?').get(profile.id);

    posthog.capture({
      distinctId: String(req.user.id),
      event: 'listing_updated',
      properties: {
        listing_id: profile.id,
        category: updated.category,
        custom_category: updated.custom_category,
        price_per_session: updated.price_per_session,
        session_type: updated.session_type,
        campus: updated.campus,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('updateProfile error:', err);
    posthog.captureException(err, String(req.user.id));
    res.status(500).json({ error: 'Failed to save listing' });
  }
}


function deleteProfile(userId, profileId, res) {
  db.prepare('DELETE FROM provider_profiles WHERE id = ?').run(profileId);
  // Only reset role to student if they have no more listings
  const remaining = db.prepare('SELECT COUNT(*) as n FROM provider_profiles WHERE user_id = ?').get(userId);
  if (remaining.n === 0) {
    db.prepare("UPDATE users SET role = 'student' WHERE id = ?").run(userId);
  }

  posthog.capture({
    distinctId: String(userId),
    event: 'listing_deleted',
    properties: { listing_id: profileId, listings_remaining: remaining.n },
  });

  res.json({ ok: true });
}

export default router;
