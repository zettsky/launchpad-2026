import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE_URL, { transports: ['websocket'] });
  }
  return socket;
}

export function joinSessionRoom(code) {
  getSocket().emit('join', { code });
}
