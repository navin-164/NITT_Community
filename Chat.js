const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  room_id: { type: String, unique: true },
  participants: [Number], // IDs from MySQL
  messages: [{
    senderId: Number,
    text: String,
    timestamp: { type: Date, default: Date.now }
  }],
  updated_at: { type: Date, default: Date.now }
});

// Check if model exists before defining to prevent overwrite errors during hot-reloads
module.exports = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);