// Points at the backend started via `npm run dev` in ../backend.
// If testing on a physical device via Expo Go, replace localhost with your machine's LAN IP.
export const API_BASE_URL = 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    // ngrok-skip-browser-warning bypasses ngrok free-tier's HTML interstitial page,
    // which otherwise replaces the JSON response when the backend is tunneled.
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  createSession: (hostDeviceId, displayName, groupName) =>
    request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ hostDeviceId, displayName, groupName }),
    }),

  joinSession: (code, deviceId, displayName) =>
    request(`/sessions/${code}/join`, {
      method: 'POST',
      body: JSON.stringify({ deviceId, displayName }),
    }),

  setMeetingPoint: (code, payload) =>
    request(`/sessions/${code}/meeting-point`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitPreferences: (code, payload) =>
    request(`/sessions/${code}/preferences`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  startMatching: (code, hostDeviceId, mode, swipeCount) =>
    request(`/sessions/${code}/start-matching`, {
      method: 'POST',
      body: JSON.stringify({ hostDeviceId, mode, swipeCount }),
    }),

  getSnapshot: (code) =>
    request(`/sessions/${code}`),

  swipe: (code, memberId, placeId, vote) =>
    request(`/sessions/${code}/swipe`, {
      method: 'POST',
      body: JSON.stringify({ memberId, placeId, vote }),
    }),

  runItBack: (code, hostDeviceId) =>
    request(`/sessions/${code}/run-it-back`, {
      method: 'POST',
      body: JSON.stringify({ hostDeviceId }),
    }),

  dismissSession: (code, memberId) =>
    request(`/sessions/${code}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    }),

  listDeviceSessions: (deviceId) =>
    request(`/devices/${deviceId}/sessions`),

  autocompleteLocation: (input) =>
    request(`/places/autocomplete?input=${encodeURIComponent(input)}`),

  getPlaceLocation: (placeId) =>
    request(`/places/details?placeId=${encodeURIComponent(placeId)}`),

  // Restaurant image search through the Oxylabs backend endpoint
  getRestaurantImage: (name, location = 'Singapore') =>
    request(
      `/api/restaurant-image?name=${encodeURIComponent(name)}&location=${encodeURIComponent(location)}`
    ),
};