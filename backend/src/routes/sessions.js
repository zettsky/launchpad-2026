const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateSessionCode } = require('../utils/codeGenerator');
const { runMatching, resolveSwipeRound } = require('../services/matchingEngine');
const { broadcast } = require('../sockets');

const router = express.Router();

// Per-process deadline timers, keyed by session id. Lost on server restart, which is
// an acceptable limitation for this scope (host can always start matching manually).
const deadlineTimers = new Map();

function getSessionByCode(code) {
  return db.prepare('SELECT * FROM sessions WHERE code = ?').get(code);
}

function buildSnapshot(session) {
  const memberCount = db
    .prepare('SELECT COUNT(*) as c FROM members WHERE session_id = ?')
    .get(session.id).c;
  const preferencesCount = db
    .prepare('SELECT COUNT(*) as c FROM preferences WHERE session_id = ?')
    .get(session.id).c;

  const snapshot = {
    sessionId: session.id,
    code: session.code,
    state: session.state,
    mode: session.mode,
    swipeCount: session.swipe_count,
    meetingPoint: {
      lat: session.meeting_lat,
      lng: session.meeting_lng,
      zone: session.meeting_zone,
    },
    deadline: session.deadline,
    memberCount,
    preferencesCount,
  };

  if (session.state === 'deciding' || session.state === 'decided') {
    const candidates = db
      .prepare('SELECT * FROM restaurant_candidates WHERE session_id = ? ORDER BY rank')
      .all(session.id);
    snapshot.candidates = candidates.map(toClientCandidate);
  }

  if (session.state === 'decided' && session.decided_place_id) {
    const decided = db
      .prepare('SELECT * FROM restaurant_candidates WHERE session_id = ? AND place_id = ?')
      .get(session.id, session.decided_place_id);
    snapshot.decided = decided ? toClientCandidate(decided) : null;
  }

  return snapshot;
}

function toClientCandidate(row) {
  return {
    placeId: row.place_id,
    name: row.name,
    cuisineTag: row.cuisine_tag,
    priceLevel: row.price_level,
    rating: row.rating,
    distanceM: row.distance_m,
    lat: row.lat,
    lng: row.lng,
    photoUrl: row.photo_ref ? `/places/photo?ref=${encodeURIComponent(row.photo_ref)}` : null,
  };
}

async function triggerMatching(session, mode, swipeCount) {
  db.prepare('UPDATE sessions SET mode = ?, swipe_count = ? WHERE id = ?').run(
    mode,
    swipeCount || null,
    session.id
  );
  await runMatching(session.id);
  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);
  const snapshot = buildSnapshot(updated);
  broadcast(session.code, updated.state === 'decided' ? 'session:decided' : 'candidates:ready', snapshot);
  return snapshot;
}

function scheduleDeadline(session) {
  if (deadlineTimers.has(session.id)) {
    clearTimeout(deadlineTimers.get(session.id));
  }
  if (!session.deadline) return;

  const delay = new Date(session.deadline).getTime() - Date.now();
  if (delay <= 0) return;

  const timer = setTimeout(async () => {
    const latest = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);
    if (latest && latest.state === 'collecting') {
      try {
        await triggerMatching(latest, 'swipe', 8);
      } catch (err) {
        broadcast(latest.code, 'matching:error', { message: err.message });
      }
    }
    deadlineTimers.delete(session.id);
  }, delay);

  deadlineTimers.set(session.id, timer);
}

// POST /sessions — host creates a session
router.post('/', (req, res) => {
  const { hostDeviceId, displayName } = req.body;
  if (!hostDeviceId) return res.status(400).json({ error: 'hostDeviceId is required' });

  const sessionId = uuidv4();
  const code = generateSessionCode();

  db.prepare(
    'INSERT INTO sessions (id, code, host_device_id, state) VALUES (?, ?, ?, ?)'
  ).run(sessionId, code, hostDeviceId, 'open');

  const memberId = uuidv4();
  db.prepare(
    'INSERT INTO members (id, session_id, device_id, display_name, is_host) VALUES (?, ?, ?, ?, 1)'
  ).run(memberId, sessionId, hostDeviceId, displayName || null);

  res.status(201).json({ sessionId, code, hostDeviceId, memberId });
});

// POST /sessions/:code/join — member joins via code
router.post('/:code/join', (req, res) => {
  const session = getSessionByCode(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { deviceId, displayName } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });

  let member = db
    .prepare('SELECT * FROM members WHERE session_id = ? AND device_id = ?')
    .get(session.id, deviceId);

  if (!member) {
    const memberId = uuidv4();
    db.prepare(
      'INSERT INTO members (id, session_id, device_id, display_name, is_host) VALUES (?, ?, ?, ?, 0)'
    ).run(memberId, session.id, deviceId, displayName || null);
    member = db.prepare('SELECT * FROM members WHERE id = ?').get(memberId);
    broadcast(session.code, 'member:joined', { memberCount: db.prepare('SELECT COUNT(*) as c FROM members WHERE session_id = ?').get(session.id).c });
  }

  res.json({ memberId: member.id, snapshot: buildSnapshot(session) });
});

// POST /sessions/:code/meeting-point — host sets pin or zone, optional deadline
router.post('/:code/meeting-point', (req, res) => {
  const session = getSessionByCode(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { lat, lng, zone, deadline } = req.body;
  if (lat == null && lng == null && !zone) {
    return res.status(400).json({ error: 'Provide either lat/lng or zone' });
  }

  db.prepare(
    'UPDATE sessions SET meeting_lat = ?, meeting_lng = ?, meeting_zone = ?, deadline = ?, state = CASE WHEN state = ? THEN ? ELSE state END WHERE id = ?'
  ).run(lat ?? null, lng ?? null, zone ?? null, deadline ?? null, 'open', 'collecting', session.id);

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);
  scheduleDeadline(updated);

  const snapshot = buildSnapshot(updated);
  broadcast(session.code, 'meeting-point:set', snapshot);
  res.json(snapshot);
});

// POST /sessions/:code/preferences — anonymous submission (broadcasts count only)
router.post('/:code/preferences', (req, res) => {
  const session = getSessionByCode(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { memberId, cuisines, budgetMin, budgetMax, dietary } = req.body;
  if (!memberId || !Array.isArray(cuisines) || cuisines.length === 0) {
    return res.status(400).json({ error: 'memberId and at least one cuisine are required' });
  }
  if (typeof budgetMin !== 'number' || typeof budgetMax !== 'number') {
    return res.status(400).json({ error: 'budgetMin and budgetMax are required' });
  }

  const member = db.prepare('SELECT * FROM members WHERE id = ? AND session_id = ?').get(memberId, session.id);
  if (!member) return res.status(404).json({ error: 'Member not found in this session' });

  db.prepare(
    `INSERT INTO preferences (id, session_id, member_id, cuisines, budget_min, budget_max, dietary)
     VALUES (@id, @sessionId, @memberId, @cuisines, @budgetMin, @budgetMax, @dietary)
     ON CONFLICT(session_id, member_id) DO UPDATE SET
       cuisines = excluded.cuisines,
       budget_min = excluded.budget_min,
       budget_max = excluded.budget_max,
       dietary = excluded.dietary,
       submitted_at = datetime('now')`
  ).run({
    id: uuidv4(),
    sessionId: session.id,
    memberId,
    cuisines: JSON.stringify(cuisines),
    budgetMin,
    budgetMax,
    dietary: dietary ? JSON.stringify(dietary) : null,
  });

  const preferencesCount = db
    .prepare('SELECT COUNT(*) as c FROM preferences WHERE session_id = ?')
    .get(session.id).c;

  broadcast(session.code, 'preferences:count', { preferencesCount });
  res.json({ preferencesCount });
});

// POST /sessions/:code/start-matching — host triggers the matching engine
router.post('/:code/start-matching', async (req, res) => {
  const session = getSessionByCode(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { hostDeviceId, mode, swipeCount } = req.body;
  if (hostDeviceId !== session.host_device_id) {
    return res.status(403).json({ error: 'Only the host can start matching' });
  }
  if (mode !== 'auto' && mode !== 'swipe') {
    return res.status(400).json({ error: 'mode must be "auto" or "swipe"' });
  }

  try {
    const snapshot = await triggerMatching(session, mode, swipeCount);
    res.json(snapshot);
  } catch (err) {
    res.status(422).json({ error: err.message });
  }
});

// GET /sessions/:code — fetch current snapshot (reconnect support)
router.get('/:code', (req, res) => {
  const session = getSessionByCode(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(buildSnapshot(session));
});

// POST /sessions/:code/swipe — member casts a swipe vote on a candidate
router.post('/:code/swipe', (req, res) => {
  const session = getSessionByCode(req.params.code);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.state !== 'deciding') {
    return res.status(409).json({ error: 'Session is not in swiping state' });
  }

  const { memberId, placeId, vote } = req.body;
  if (!memberId || !placeId || (vote !== 'yes' && vote !== 'no')) {
    return res.status(400).json({ error: 'memberId, placeId, and vote ("yes"/"no") are required' });
  }

  db.prepare(
    `INSERT INTO swipes (id, session_id, member_id, place_id, vote)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(session_id, member_id, place_id) DO UPDATE SET vote = excluded.vote`
  ).run(uuidv4(), session.id, memberId, placeId, vote);

  const decidedPlaceId = resolveSwipeRound(session.id);

  if (decidedPlaceId) {
    const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);
    const snapshot = buildSnapshot(updated);
    broadcast(session.code, 'session:decided', snapshot);
    return res.json(snapshot);
  }

  const tallyCounts = db
    .prepare('SELECT COUNT(*) as c FROM swipes WHERE session_id = ?')
    .get(session.id).c;
  broadcast(session.code, 'swipe:cast', { totalSwipes: tallyCounts });
  res.json({ resolved: false });
});

module.exports = router;
