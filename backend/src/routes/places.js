const express = require('express');
const { fetchPhotoStream, fetchStaticMapStream } = require('../services/placesService');

const router = express.Router();

// Proxies Google's photo endpoint so the API key never reaches the client bundle.
// photoRef is passed as a query param (not a path segment) since Places API (New)
// photo names contain slashes, e.g. "places/{placeId}/photos/{photoResource}".
router.get('/photo', async (req, res) => {
  try {
    const { ref } = req.query;
    if (!ref) return res.status(400).json({ error: 'ref query param is required' });
    const maxWidthPx = req.query.maxwidth ? Number(req.query.maxwidth) : 800;
    const upstream = await fetchPhotoStream(ref, maxWidthPx);
    res.set('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
    upstream.data.pipe(res);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch photo', detail: err.message });
  }
});

// Fallback visual (map thumbnail) for restaurants with no real photo available.
router.get('/staticmap', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng query params are required' });
    const upstream = await fetchStaticMapStream(Number(lat), Number(lng));
    res.set('Content-Type', upstream.headers['content-type'] || 'image/png');
    upstream.data.pipe(res);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch static map', detail: err.message });
  }
});

module.exports = router;
