const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { searchRestaurants } = require('./placesService');

const DEFAULT_RADIUS = Number(process.env.DEFAULT_SEARCH_RADIUS_METERS) || 2000;
const ZONE_OFFSET_DEGREES = 0.02; // ~2km nudge used to bias a zone search away from the exact meeting pin

function aggregatePreferences(preferences) {
  const cuisineCounts = new Map();
  const dietarySet = new Set();
  let minOfMins = Infinity;
  let maxOfMaxes = -Infinity;
  let maxOfMins = -Infinity;
  let minOfMaxes = Infinity;

  for (const pref of preferences) {
    for (const cuisine of JSON.parse(pref.cuisines)) {
      cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) || 0) + 1);
    }
    if (pref.dietary) {
      for (const d of JSON.parse(pref.dietary)) dietarySet.add(d);
    }
    minOfMins = Math.min(minOfMins, pref.budget_min);
    maxOfMaxes = Math.max(maxOfMaxes, pref.budget_max);
    maxOfMins = Math.max(maxOfMins, pref.budget_min);
    minOfMaxes = Math.min(minOfMaxes, pref.budget_max);
  }

  const topCuisines = [...cuisineCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cuisine]) => cuisine);

  // Prefer the intersecting range everyone can agree on; if ranges don't overlap, fall back to the union.
  const hasOverlap = maxOfMins <= minOfMaxes;
  const budgetRange = hasOverlap
    ? { min: maxOfMins, max: minOfMaxes }
    : { min: minOfMins, max: maxOfMaxes };

  return { topCuisines, budgetRange, dietary: [...dietarySet] };
}

function resolveMeetingPoint(session) {
  if (session.meeting_lat != null && session.meeting_lng != null) {
    return { lat: session.meeting_lat, lng: session.meeting_lng };
  }
  // No exact pin: nudge a nominal reference point toward the chosen compass zone.
  const base = { lat: 1.3521, lng: 103.8198 }; // Singapore city centre fallback reference
  const offsets = {
    north: { lat: ZONE_OFFSET_DEGREES, lng: 0 },
    south: { lat: -ZONE_OFFSET_DEGREES, lng: 0 },
    east: { lat: 0, lng: ZONE_OFFSET_DEGREES },
    west: { lat: 0, lng: -ZONE_OFFSET_DEGREES },
  };
  const offset = offsets[session.meeting_zone] || { lat: 0, lng: 0 };
  return { lat: base.lat + offset.lat, lng: base.lng + offset.lng };
}

function scoreCandidate(candidate, budgetRange) {
  const rating = candidate.rating ?? 3;
  const distanceKm = (candidate.distanceM ?? 0) / 1000;
  let pricePenalty = 0;
  if (candidate.priceLevel != null) {
    if (candidate.priceLevel < budgetRange.min) pricePenalty = (budgetRange.min - candidate.priceLevel) * 0.5;
    if (candidate.priceLevel > budgetRange.max) pricePenalty = (candidate.priceLevel - budgetRange.max) * 1.5;
  }
  return rating * 2 - distanceKm * 0.5 - pricePenalty;
}

async function findCandidates(session, aggregate) {
  const { lat, lng } = resolveMeetingPoint(session);
  const results = await searchRestaurants({
    lat,
    lng,
    radiusMeters: DEFAULT_RADIUS,
    cuisines: [...aggregate.topCuisines, ...aggregate.dietary],
    minPrice: Number.isFinite(aggregate.budgetRange.min) ? aggregate.budgetRange.min : undefined,
    maxPrice: Number.isFinite(aggregate.budgetRange.max) ? aggregate.budgetRange.max : undefined,
  });

  return results
    .map((c) => ({ ...c, score: scoreCandidate(c, aggregate.budgetRange) }))
    .sort((a, b) => b.score - a.score);
}

// Runs the full matching pipeline for a session: fetches candidates, persists them,
// and either decides immediately (auto mode) or hands back a ranked deck (swipe mode).
async function runMatching(sessionId) {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) throw new Error('Session not found');

  const preferences = db.prepare('SELECT * FROM preferences WHERE session_id = ?').all(sessionId);
  if (preferences.length === 0) throw new Error('No preferences submitted yet');

  const aggregate = aggregatePreferences(preferences);
  const ranked = await findCandidates(session, aggregate);

  if (ranked.length === 0) {
    throw new Error('No restaurants found matching the group preferences');
  }

  if (session.mode === 'auto') {
    const winner = ranked[0];
    db.prepare('UPDATE sessions SET state = ?, decided_place_id = ? WHERE id = ?').run(
      'decided',
      winner.placeId,
      sessionId
    );
    insertCandidates(sessionId, [winner]);
    return { mode: 'auto', decided: winner };
  }

  const count = session.swipe_count || 8;
  const deck = ranked.slice(0, count);
  insertCandidates(sessionId, deck);

  const memberCount = db
    .prepare('SELECT COUNT(*) as c FROM members WHERE session_id = ?')
    .get(sessionId).c;

  db.prepare('UPDATE sessions SET state = ?, swiping_member_count = ? WHERE id = ?').run(
    'deciding',
    memberCount,
    sessionId
  );

  return { mode: 'swipe', deck };
}

function insertCandidates(sessionId, candidates) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO restaurant_candidates
      (id, session_id, place_id, name, cuisine_tag, price_level, rating, distance_m, photo_ref, lat, lng, rank)
    VALUES (@id, @sessionId, @placeId, @name, @cuisineTag, @priceLevel, @rating, @distanceM, @photoRef, @lat, @lng, @rank)
  `);
  db.runInTransaction(() => {
    candidates.forEach((c, i) => {
      insert.run({
        id: uuidv4(),
        sessionId,
        placeId: c.placeId,
        name: c.name,
        cuisineTag: c.cuisineTag,
        priceLevel: c.priceLevel,
        rating: c.rating,
        distanceM: c.distanceM,
        photoRef: c.photoRef,
        lat: c.lat,
        lng: c.lng,
        rank: i,
      });
    });
  });
}

// Call after recording a swipe. Returns the winning place_id if the round has resolved, else null.
function resolveSwipeRound(sessionId) {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session || session.state !== 'deciding') return null;

  const candidates = db
    .prepare('SELECT * FROM restaurant_candidates WHERE session_id = ? ORDER BY rank')
    .all(sessionId);
  const expectedVoters = session.swiping_member_count || 0;
  if (expectedVoters === 0) return null;

  const tallies = new Map(); // place_id -> { yes, total }
  for (const c of candidates) tallies.set(c.place_id, { yes: 0, total: 0 });

  const swipes = db.prepare('SELECT * FROM swipes WHERE session_id = ?').all(sessionId);
  for (const s of swipes) {
    const t = tallies.get(s.place_id);
    if (!t) continue;
    t.total += 1;
    if (s.vote === 'yes') t.yes += 1;
  }

  // Unanimous match: every expected voter said yes to this candidate.
  for (const c of candidates) {
    const t = tallies.get(c.place_id);
    if (t.yes === expectedVoters) {
      return finalizeDecision(sessionId, c.place_id);
    }
  }

  // Everyone has swiped every card with no unanimous winner: fall back to highest yes-ratio, rating as tiebreak.
  const everyoneSwipedEverything = swipes.length >= expectedVoters * candidates.length;
  if (everyoneSwipedEverything) {
    const ranked = candidates
      .map((c) => ({ candidate: c, ...tallies.get(c.place_id) }))
      .sort((a, b) => {
        const ratioA = a.total ? a.yes / a.total : 0;
        const ratioB = b.total ? b.yes / b.total : 0;
        if (ratioB !== ratioA) return ratioB - ratioA;
        return (b.candidate.rating || 0) - (a.candidate.rating || 0);
      });
    return finalizeDecision(sessionId, ranked[0].candidate.place_id);
  }

  return null;
}

function finalizeDecision(sessionId, placeId) {
  db.prepare('UPDATE sessions SET state = ?, decided_place_id = ? WHERE id = ?').run(
    'decided',
    placeId,
    sessionId
  );
  return placeId;
}

module.exports = { aggregatePreferences, runMatching, resolveSwipeRound };
