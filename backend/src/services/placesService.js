const axios = require('axios');
const cheerio = require('cheerio');

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const YELP_API_KEY = process.env.YELP_API_KEY;
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

  console.log(
  results.map(p => ({
    name: p.displayName?.text,
    photos: p.photos,
  }))
);

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
    photos: place.photos?.map(photo => photo.name) || [],
    photoRef: place.photos?.[0]?.name || null,
  }));
}

const PLACE_DETAILS_FIELD_MASK = 'id,formattedAddress,location,photos,websiteUri';

// Fetched on-demand only for the decided restaurant (not the whole shortlist), so no
// schema/caching is needed for this. Also used by the meeting-point autocomplete to
// resolve a selected suggestion's coordinates (name/fetchPhotos aren't passed there, so
// the photo-resolution work below is skipped in that case).
async function getPlaceDetails(placeId, { name, fetchPhotos = false } = {}) {
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }
  const { data } = await axios.get(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
    },
  });
  const lat = data.location?.latitude ?? null;
  const lng = data.location?.longitude ?? null;

  let nearestMRT = null;

  if (lat != null && lng != null) {
    try {
      nearestMRT = await getNearestMRT(lat, lng);
    } catch (err) {
      console.error(err);
    }
  }

  const MAX_PHOTOS = 10;
  let photos = [];
  if (fetchPhotos) {
    photos = (data.photos || [])
      .slice(0, MAX_PHOTOS)
      .map((p) => `/places/photo?ref=${encodeURIComponent(p.name)}`);

    // Keep gathering from the next tier as long as there's still room, rather than
    // stopping at the first source that returns anything — Yelp Fusion, then the
    // restaurant's own website og:image (a link-preview-style meta tag, not a
    // search-engine scrape — no ToS/blocking risk, no browser needed).
    if (photos.length < MAX_PHOTOS && name && lat != null && lng != null) {
      try {
        const yelpPhotos = await getYelpPhotos(name, lat, lng);
        photos = photos.concat(yelpPhotos);
      } catch (err) {
        console.error(err);
      }
    }
    if (photos.length < MAX_PHOTOS && data.websiteUri) {
      try {
        const ogImage = await getWebsiteOgImage(data.websiteUri);
        if (ogImage && !photos.includes(ogImage)) photos.push(ogImage);
      } catch (err) {
        console.error(err);
      }
    }
    photos = photos.slice(0, MAX_PHOTOS);
  }

  return {
    formattedAddress: data.formattedAddress || null,
    lat,
    lng,
    nearestMRT,
    photos,
  };
}

// Last-resort photo fallback: read the restaurant's own website's Open Graph image tag
// (the same <meta property="og:image"> tag chat apps use for link previews). This reads
// a single public page's metadata, not a search engine's results, so it carries none of
// the ToS/IP-block risk that scraping Google Search/Maps would.
async function getWebsiteOgImage(websiteUrl) {
  const { data: html } = await axios.get(websiteUrl, {
    timeout: 5000,
    maxContentLength: 2 * 1024 * 1024, // 2MB cap: we only need the <head>, not the whole page
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EatWhereBot/1.0)' },
  });
  const $ = cheerio.load(html);
  const ogImage =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content');
  if (!ogImage) return null;
  return new URL(ogImage, websiteUrl).toString();
}

const YELP_SEARCH_URL = 'https://api.yelp.com/v3/businesses/search';

// Fallback for restaurants with no Google Places photo. Yelp Fusion requires its own
// (free) API key — set YELP_API_KEY in the backend .env. If it's not configured, this
// just returns no photos and callers fall back further (static map thumbnail, then a
// plain placeholder on the client).
async function getYelpPhotos(name, lat, lng) {
  if (!YELP_API_KEY) return [];

  const { data: search } = await axios.get(YELP_SEARCH_URL, {
    params: { term: name, latitude: lat, longitude: lng, limit: 1 },
    headers: { Authorization: `Bearer ${YELP_API_KEY}` },
  });
  const business = search.businesses?.[0];
  if (!business) return [];

  const { data: details } = await axios.get(`https://api.yelp.com/v3/businesses/${business.id}`, {
    headers: { Authorization: `Bearer ${YELP_API_KEY}` },
  });

  if (details.photos && details.photos.length > 0) return details.photos.slice(0, 10);
  return business.image_url ? [business.image_url] : [];
}

const WIKIMEDIA_SEARCH_URL = 'https://commons.wikimedia.org/w/api.php';

// Fill-in tier so the gallery has enough images to scroll through even when the tiers
// above found few or none: genuinely representative food photos for the cuisine, from
// Wikimedia Commons' free, keyless, openly-licensed search API. Not photos of the
// specific restaurant, but far better than a near-empty gallery for demo purposes —
// swap for a real per-restaurant photo API later.
async function getCuisinePhotos(cuisineOrType, limit = 10) {
  if (!cuisineOrType || limit <= 0) return [];
  const { data } = await axios.get(WIKIMEDIA_SEARCH_URL, {
    params: {
      action: 'query',
      generator: 'search',
      gsrsearch: `${cuisineOrType} cuisine food`,
      gsrlimit: limit,
      gsrnamespace: 6, // File: namespace only
      prop: 'imageinfo',
      iiprop: 'url',
      format: 'json',
    },
    headers: { 'User-Agent': 'EatWhereApp/1.0 (hackathon demo)' },
  });
  const pages = Object.values(data.query?.pages || {});
  return pages.map((p) => p.imageinfo?.[0]?.url).filter(Boolean);
}

async function getNearestMRT(lat, lng) {
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }

  const { data } = await axios.post(
    'https://places.googleapis.com/v1/places:searchNearby',
    {
      includedTypes: ['subway_station', 'train_station'],
      maxResultCount: 1,
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng,
          },
          radius: 2000,
        },
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.displayName',
      },
    }
  );

  return data.places?.[0]?.displayName?.text || null;
}
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
// Singapore centre — same fallback reference used for zone-based restaurant search bias.
const AUTOCOMPLETE_BIAS = { lat: 1.3521, lng: 103.8198 };

// Meeting-point location search-as-you-type. Uses Places API (New) autocomplete, not the
// legacy Autocomplete API `react-native-google-places-autocomplete` defaults to — that
// legacy endpoint isn't enabled on this project (same restriction hit elsewhere for
// searchText), which is why the old implementation returned no suggestions at all.
async function searchAutocomplete(input) {
  if (!API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }
  if (!input || !input.trim()) return [];

  const { data } = await axios.post(
    AUTOCOMPLETE_URL,
    {
      input,
      locationBias: {
        circle: {
          center: { latitude: AUTOCOMPLETE_BIAS.lat, longitude: AUTOCOMPLETE_BIAS.lng },
          radius: 30000,
        },
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
      },
    }
  );

  return (data.suggestions || [])
    .filter((s) => s.placePrediction)
    .map((s) => ({
      placeId: s.placePrediction.placeId,
      mainText: s.placePrediction.structuredFormat?.mainText?.text || s.placePrediction.text?.text || '',
      secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || '',
    }));
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

module.exports = {
  searchRestaurants,
  fetchPhotoStream,
  fetchStaticMapStream,
  haversineMeters,
  getPlaceDetails,
  getNearestMRT,
  searchAutocomplete,
  getCuisinePhotos,
};
