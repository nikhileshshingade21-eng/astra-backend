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

    // V4: Lazy-load astraEvents to avoid circular dependency at module-load time
    let _astraEventsCache = null;
    function getAstraEvents() {
      if (!_astraEventsCache) {
        try {
          _astraEventsCache = require('./astraEvents');
        } catch (e) {
          console.warn('[SOCKET] astraEvents not available yet:', e.message);
        }
      }
      return _astraEventsCache;
    }

    io.on('connection', (socket) => {
      console.log(`[ASTRA V4] Socket Connected: ${socket.id}`);
      
      socket.on('join_user', (userId) => {
        socket.join(`user_${userId}`);
        socket._astraUserId = userId; // V4: Store for disconnect tracking
        console.log(`[ASTRA V4] User ${userId} joined personal room.`);
      });

      socket.on('join_class', (classId) => {
        const roomName = `class_${classId}`;
        // SOC-GUARD: Prevent multiple joins to same room
        if (socket.rooms.has(roomName)) return;
        socket.join(roomName);
        console.log(`[ASTRA V4] Socket ${socket.id} joined ${roomName}`);
      });

      socket.on('leave_class', (classId) => {
        socket.leave(`class_${classId}`);
        console.log(`[ASTRA V4] Socket ${socket.id} left class_${classId}`);
      });

      // 🛰️ LIVE TRACKING: Receive pings from students and broadcast to Admin Map
      socket.on('LIVE_LOCATION_PING', (data) => {
        const { SOCKET_EVENTS, formatSocketPayload } = require('../sockets/socketContracts');
        // Standardize and broadcast
        io.emit(SOCKET_EVENTS.LOCATION_UPDATE, formatSocketPayload(SOCKET_EVENTS.LOCATION_UPDATE, data));

        // V4: Fire location scan event
        const ae = getAstraEvents();
        if (ae && data.userId) {
          ae.astraEvents.emit(ae.ASTRA_EVENTS.LOCATION_SCAN, { userId: data.userId, lat: data.lat, lng: data.lng });
        }
      });

      // ─── V4: App Lifecycle Events ─────────────────────────────────
      socket.on('APP_BACKGROUNDED', (data) => {
        const userId = data?.userId || socket._astraUserId;
        if (!userId) return;
        const ae = getAstraEvents();
        if (ae) {
          ae.astraEvents.emit(ae.ASTRA_EVENTS.APP_BACKGROUNDED, { userId });
        }
      });

      socket.on('APP_RESUMED', (data) => {
        const userId = data?.userId || socket._astraUserId;
        if (!userId) return;
        const ae = getAstraEvents();
        if (ae) {
          ae.astraEvents.emit(ae.ASTRA_EVENTS.APP_RESUMED, { userId });
        }
      });

      socket.on('ACTIVITY_PING', (data) => {
        const userId = data?.userId || socket._astraUserId;
        if (!userId) return;
        const ae = getAstraEvents();
        if (ae) {
          ae.astraEvents.emit(ae.ASTRA_EVENTS.ACTIVITY_PING, { userId });
        }
      });

      // ─── Disconnect ───────────────────────────────────────────────
      socket.on('disconnect', () => {
        const rooms = Array.from(socket.rooms);
        const userId = socket._astraUserId;
        console.log(`[ASTRA V4] Socket ${socket.id} disconnected. Purging ${rooms.length} rooms.`);

        // V4: Fire logout event for prediction tracking
        if (userId) {
          const ae = getAstraEvents();
          if (ae) {
            ae.astraEvents.emit(ae.ASTRA_EVENTS.USER_LOGOUT, { userId });
          }
        }
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
      const { SOCKET_EVENTS, formatSocketPayload } = require('../sockets/socketContracts');
      io.to(`user_${userId}`).emit(event, formatSocketPayload(event, data));
    }
  },
  broadcastToClass: (classId, event, data) => {
    if (io) {
      const { SOCKET_EVENTS, formatSocketPayload } = require('../sockets/socketContracts');
      // PRO-PERF: Using rooms instead of global broadcast with prefixes
      io.to(`class_${classId}`).emit(event, formatSocketPayload(event, data));
      console.log(`[SOCKET CONTRACT] Room Broadcast (class_${classId}): ${event}`);
    }
  }
};

