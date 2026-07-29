require('dotenv').config();

import express, { json } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import sessionsRouter from './routes/sessions';
import placesRouter from './routes/places';
import { attach } from './sockets';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/sessions', sessionsRouter);
app.use('/places', placesRouter);

const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
attach(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Launchpad backend listening on port ${PORT}`);
});
