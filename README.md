# 🍽️ EatWhere!

EatWhere! is a collaborative restaurant decision-making application that helps groups quickly agree on where to eat.

Instead of endless discussions in group chats, users join a shared session, submit their food preferences, and let the app recommend restaurants that best match everyone's choices.

Note: As we are using a free version of Google's Places API, the number of times that we can run our program as of now is limited.

---

## Features

### 👥 Group Sessions
- Create a new dining session
- Join an existing session using a unique session code
- Real-time session updates using Socket.IO

### 📍 Meeting Point Selection
- Choose a custom meeting location
- Select a Singapore zone (North, South, East, West, Central)
- Google Places Autocomplete support

### 🍜 Preference Collection
Each participant can submit:
- Preferred cuisines
- Budget range
- Dietary restrictions

Preferences are anonymous to encourage unbiased voting.

### 🤖 Smart Matching Engine
The backend combines everyone's preferences and:
- Finds restaurants using Google Places API
- Filters results by:
  - Cuisine
  - Budget
  - Distance
- Ranks restaurants using a weighted scoring algorithm based on:
  - Rating
  - Distance
  - Budget compatibility

### ❤️ Swipe Mode
Groups can vote on restaurant suggestions Tinder-style:
- Swipe Yes
- Swipe No

The application automatically:
- Detects unanimous matches
- Falls back to the highest approval rating if no unanimous decision exists

### ⚡ Auto Mode
The highest-ranked restaurant is automatically selected without voting.

### 📍 Decision Screen
Displays:
- Restaurant name
- Address
- Nearest MRT station
- Restaurant photos
- Rating
- Cuisine
- Distance

---

# Tech Stack

## Frontend
- React Native
- Expo
- React Navigation
- React Native Maps

## Backend
- Node.js
- Express.js
- Socket.IO

## Database
- SQLite

## APIs
- Google Places API (New)
- Google Places Photos API
- Google Places Autocomplete
- Google Static Maps API
- Yelp Fusion API (photo fallback)

---

# Project Structure

```
launchpad-2026/
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── db/
│   ├── sockets/
│   └── server.js
│
├── frontend/
│   ├── components/
│   ├── screens/
│   ├── services/
│   ├── context/
│   └── App.js
│
└── README.md
```

---

# Installation

## 1. Clone the repository

```bash
git clone <repository-url>

cd launchpad-2026
```

---

## 2. Install dependencies

Backend

```bash
cd backend
npm install
```

Frontend

```bash
cd ../frontend
npm install
```

---

# Environment Variables

## Backend (.env)

```env
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_API_KEY

YELP_API_KEY=YOUR_YELP_API_KEY

DEFAULT_SEARCH_RADIUS_METERS=2000

PORT=4000
```

---

## Frontend (.env)

Local development

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:4000
```

Example

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
```

---

# Running the Backend

```bash
cd backend

npm run dev
```

Server starts on

```
http://localhost:4000
```

Health check

```
GET /health
```

---

# Running the Frontend

```bash
cd frontend

npx expo start
```

For iOS Simulator

```bash
i
```

For Android Emulator

```bash
a
```

---

# API Overview

## Sessions

```
POST /sessions
```

Create a session.

---

```
POST /sessions/:code/join
```

Join a session.

---

```
POST /sessions/:code/preferences
```

Submit preferences.

---

```
POST /sessions/:code/start-matching
```

Start the matching engine.

---

```
POST /sessions/:code/swipe
```

Submit a swipe vote.

---

```
GET /sessions/:code
```

Retrieve the latest session snapshot.

---

## Places

```
GET /places/photo
```

Returns a restaurant photo.

---

```
GET /places/staticmap
```

Returns a map image when no restaurant photo is available.

---

```
GET /places/autocomplete
```

Returns meeting location suggestions.

---

```
GET /places/details
```

Returns selected location details.

---

# Matching Algorithm

The matching engine:

1. Collects all user preferences.
2. Aggregates cuisines by popularity.
3. Determines a shared budget range.
4. Searches nearby restaurants using Google Places.
5. Scores restaurants using:

```
Score =
(Rating × 2)
− (Distance × 0.5)
− Budget Penalty
```

6. Returns the highest-ranked restaurants.

---

# Photo Handling

Restaurant images follow this priority:

1. Google Places Photos
2. Yelp Fusion Photos
3. Google Static Map
4. Placeholder image

---

# Database

SQLite stores:

- Sessions
- Members
- Preferences
- Restaurant candidates
- Swipe votes

---

# Future Improvements

- User accounts
- Saved favourite restaurants
- Restaurant reviews
- AI-powered recommendations
- Restaurant opening hours
- Push notifications
- Restaurant sharing
- Cloud database deployment

---

# Authors

Developed as part of the LaunchPad 2026 project.

---

# License

This project is intended for educational purposes.
