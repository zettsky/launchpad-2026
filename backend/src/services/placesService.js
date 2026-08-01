const axios = require('axios');

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.primaryType',
  'places.priceLevel',
  'places.rating',
  'places.location',
  'places.photos',
].join(',');

// Google Places API (New) uses a named enum instead of the legacy 0-4 numeric price scale.
const PRICE_LEVELS = [
  'PRICE_LEVEL_FREE',
  'PRICE_LEVEL_INEXPENSIVE',
  'PRICE_LEVEL_MODERATE',
  'PRICE_LEVEL_EXPENSIVE',
  'PRICE_LEVEL_VERY_EXPENSIVE',
];

function priceLevelToNumber(level) {
  const idx = PRICE_LEVELS.indexOf(level);
  return idx === -1 ? null : idx;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// budgetLevel is a 0-4 scale mirroring PRICE_LEVELS above.
async function searchRestaurants({ lat, lng, radiusMeters, cuisines, minPrice, maxPrice }) {
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }

  const keyword = (cuisines || []).slice(0, 3).join(' ');
  const textQuery = keyword ? `${keyword} restaurant` : 'restaurant';

  const body = {
    textQuery,
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
    includedType: 'restaurant',
    maxResultCount: 20,
  };

  if (Number.isFinite(minPrice) && Number.isFinite(maxPrice)) {
    // Google's Places API rejects PRICE_LEVEL_FREE as a search filter outright, so it's
    // excluded here even though it stays in PRICE_LEVELS for parsing returned results.
    const levels = PRICE_LEVELS.slice(minPrice, maxPrice + 1).filter((l) => l !== 'PRICE_LEVEL_FREE');
    if (levels.length > 0) {
      body.priceLevels = levels;
    }
  }

  const { data } = await axios.post(SEARCH_TEXT_URL, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
  });

  const results = data.places || [];

  return results.map((place) => ({
    placeId: place.id,
    name: place.displayName?.text || 'Unknown',
    cuisineTag: place.primaryType || 'restaurant',
    priceLevel: priceLevelToNumber(place.priceLevel),
    rating: place.rating ?? null,
    lat: place.location?.latitude,
    lng: place.location?.longitude,
    distanceM: place.location
      ? haversineMeters(lat, lng, place.location.latitude, place.location.longitude)
      : null,
    photoRef: place.photos?.[0]?.name || null, // e.g. "places/{placeId}/photos/{photoResource}"
  }));
}

const PLACE_DETAILS_FIELD_MASK = 'id,formattedAddress';

// Fetched on-demand only for the decided restaurant (not the whole shortlist), so no
// schema/caching is needed for this.
async function getPlaceDetails(placeId) {
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }
  const { data } = await axios.get(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
    },
  });
  return {
    formattedAddress: data.formattedAddress || null,
  };
}

const STATIC_MAP_URL = 'https://maps.googleapis.com/maps/api/staticmap';

// Fallback visual for when Places Photos isn't available (see fetchPhotoStream below):
// a small map thumbnail centered on the restaurant. Requires "Maps Static API" to be
// enabled in Google Cloud Console — until then this call fails and callers should treat
// that as normal, falling back further to a plain placeholder.
async function fetchStaticMapStream(lat, lng, width = 400, height = 300) {
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }
  const response = await axios.get(STATIC_MAP_URL, {
    params: {
      center: `${lat},${lng}`,
      zoom: 16,
      size: `${width}x${height}`,
      markers: `color:red|${lat},${lng}`,
      key: API_KEY,
    },
    responseType: 'stream',
  });
  return response;
}

async function fetchPhotoStream(photoRef, maxWidthPx = 800) {
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }
  const response = await axios.get(`https://places.googleapis.com/v1/${photoRef}/media`, {
    params: { maxWidthPx, key: API_KEY },
    responseType: 'stream',
  });
  return response;
}

module.exports = { searchRestaurants, fetchPhotoStream, fetchStaticMapStream, haversineMeters, getPlaceDetails };
