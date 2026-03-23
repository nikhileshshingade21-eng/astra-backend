let io;

module.exports = {
  init: (server) => {
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
      console.log(`[ASTRA V3] Socket Connected: ${socket.id}`);
      
      socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`[ASTRA V3] User ${userId} joined their room.`);
      });

      socket.on('disconnect', () => {
        console.log(`[ASTRA V3] Socket Disconnected: ${socket.id}`);
      });
    });

    return io;
  },
  getIo: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
  emitToUser: (userId, event, data) => {
    if (io) {
      io.to(`user_${userId}`).emit(event, data);
    }
  }
};
