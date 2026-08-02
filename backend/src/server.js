require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const sessionsRouter = require('./routes/sessions');
const placesRouter = require('./routes/places');
const devicesRouter = require('./routes/devices');
const { attach } = require('./sockets');

const { searchRestaurantImage } = require('./services/googleImages');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/sessions', sessionsRouter);
app.use('/places', placesRouter);
app.use('/devices', devicesRouter);

// Restaurant image endpoint
app.get('/api/restaurant-image', async (req, res) => {
  try {
    const { name, location = 'Singapore' } = req.query;

    if (!name) {
      return res.status(400).json({
        error: 'Restaurant name is required'
      });
    }

    const data = await searchRestaurantImage(name, location);

    res.json(data);

  } catch (error) {
    console.error(
      error.response?.data || error.message
    );

    res.status(500).json({
      error: 'Failed to retrieve restaurant image'
    });
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

attach(io);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Launchpad backend listening on port ${PORT}`);
});