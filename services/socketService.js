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
      
      socket.on('join_user', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`[ASTRA V3] User ${userId} joined personal room.`);
      });

      socket.on('join_class', (classId) => {
        const roomName = `class_${classId}`;
        // SOC-GUARD: Prevent multiple joins to same room
        if (socket.rooms.has(roomName)) return;
        socket.join(roomName);
        console.log(`[ASTRA V3] Socket ${socket.id} joined ${roomName}`);
      });

      socket.on('leave_class', (classId) => {
        socket.leave(`class_${classId}`);
        console.log(`[ASTRA V3] Socket ${socket.id} left class_${classId}`);
      });

      socket.on('disconnect', () => {
        const rooms = Array.from(socket.rooms);
        console.log(`[ASTRA V3] Socket ${socket.id} disconnected. Purging ${rooms.length} rooms.`);
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
  },
  broadcastToClass: (classId, event, data) => {
    if (io) {
      // PRO-PERF: Using rooms instead of global broadcast with prefixes
      io.to(`class_${classId}`).emit(event, data);
      console.log(`[SOCKET] Room Broadcast (class_${classId}): ${event}`);
    }
  }
};
