require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectMySQL, connectMongo } = require('./config/db');
const { Kafka } = require('kafkajs');
const { Server: IOServer } = require('socket.io');
const Chat = require('./models/Chat'); // <--- IMPORT HERE

const PORT = process.env.PORT || 3000;

async function start() {
  await connectMySQL();
  await connectMongo();

  const server = http.createServer(app);
  const io = new IOServer(server, {
    cors: { origin: "*", methods: ['GET', 'POST'] }
  });

  // Kafka Setup (fail-safe)
  const kafka = new Kafka({ clientId: 'api-gateway', brokers: ['localhost:9092'] });
  const producer = kafka.producer();
  try { 
      await producer.connect(); 
      console.log('✅ Kafka Connected'); 
      app.locals.producer = producer;
  } catch (e) { 
      console.warn('⚠️ Kafka Offline (Analytics will be skipped)'); 
  }

  // Socket Logic
  io.on('connection', socket => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined ${roomId}`);
    });

    socket.on('chatMessage', async (data) => {
        // data: { roomId, senderId, message }
        
        // 1. Broadcast to room
        io.to(data.roomId).emit('receiveMessage', data);

        // 2. Save to Mongo
        try {
            await Chat.updateOne(
                { room_id: data.roomId },
                { 
                    $push: { messages: { senderId: data.senderId, text: data.message, timestamp: new Date() } },
                    $set: { updated_at: new Date() }
                }
            );
        } catch (e) { console.error("Chat Save Error", e); }
    });
  });

  server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

start();