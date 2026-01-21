// src/server.js
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectMySQL, connectMongo } = require('./config/db');
const { Kafka } = require('kafkajs');
const { Server: IOServer } = require('socket.io');

const PORT = process.env.PORT || 3000;

async function saveChatToDB(data) {
  // Simple safe fallback if chat model/service isn't implemented yet.
  // Replace with your real DB save: require('../models/Chat') or services/chatService.save(...)
  try {
    const ChatModel = (() => {
      try { return require('./models/Chat'); } catch (_) { return null; }
    })();
    if (ChatModel && ChatModel.create) {
      await ChatModel.create({
        roomId: data.roomId,
        senderId: data.senderId,
        message: data.message,
        createdAt: new Date()
      });
    } else {
      // fallback log for development
      console.log('[saveChatToDB] no Chat model found — message:', data);
    }
  } catch (err) {
    console.error('saveChatToDB error:', err);
  }
}

async function start() {
  // 1) Connect databases
  await connectMySQL();
  await connectMongo();

  // 2) Create http server and attach Socket.IO
  const server = http.createServer(app);

  const io = new IOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // 3) Setup Kafka producer
  const brokersEnv = process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'localhost:9092';
  const brokers = brokersEnv.split(',').map(b => b.trim());
  const kafka = new Kafka({ clientId: 'api-gateway', brokers });

  const producer = kafka.producer();
  try {
    await producer.connect();
    console.log('✅ Kafka producer connected');
  } catch (err) {
    console.error('❌ Kafka producer failed to connect:', err);
    // depending on your tolerance you may exit or continue without producer
    // process.exit(1);
  }

  // expose producer so controllers can use it: req.app.locals.producer
  app.locals.producer = producer;

  // 4) Socket.IO handlers
  io.on('connection', socket => {
    console.log('Socket connected:', socket.id);

    socket.on('joinRoom', roomId => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('chatMessage', async data => {
      // data = { roomId, senderId, message }
      io.to(data.roomId).emit('newMessage', data);

      // persist chat (best-effort)
      await saveChatToDB(data);

      // send a Kafka event (best-effort)
      if (producer) {
        try {
          await producer.send({
            topic: 'chat-events',
            messages: [{ value: JSON.stringify({ type: 'ChatMessage', payload: data }) }]
          });
        } catch (err) {
          console.error('Failed to send Kafka message:', err);
        }
      } else {
        console.warn('Kafka producer not available — skipping event emit');
      }
    });

    socket.on('disconnect', reason => {
      console.log('Socket disconnected:', socket.id, reason);
    });
  });

  // 5) Start listening
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });

  // graceful shutdown handlers (optional but recommended)
  process.on('SIGINT', async () => {
    console.log('SIGINT received — shutting down...');
    try { await producer.disconnect(); } catch (_) {}
    server.close(() => process.exit(0));
  });
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received — shutting down...');
    try { await producer.disconnect(); } catch (_) {}
    server.close(() => process.exit(0));
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
