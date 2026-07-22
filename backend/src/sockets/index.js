let ioInstance = null;

function roomName(code) {
  return `session:${code}`;
}

function attach(io) {
  ioInstance = io;
  io.on('connection', (socket) => {
    socket.on('join', ({ code }) => {
      if (code) socket.join(roomName(code));
    });
  });
}

function broadcast(code, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(roomName(code)).emit(event, payload);
}

module.exports = { attach, broadcast };
