require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const sessionsRouter = require('./routes/sessions');
const placesRouter = require('./routes/places');
const devicesRouter = require('./routes/devices');
const { attach } = require('./sockets');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/sessions', sessionsRouter);
app.use('/places', placesRouter);
app.use('/devices', devicesRouter);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
attach(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Launchpad backend listening on port ${PORT}`);
});