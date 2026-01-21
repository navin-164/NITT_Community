const mongoose = require('mongoose');

// We use a flexible schema for both Services (Cooking, Driver) and Marketplace (Books, Cars)
const ListingSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'Service' or 'Marketplace'
  category: String, // e.g., 'Books', 'Driver', 'Tutor'
  title: String,
  description: String,
  price: Number,
  createdBy: String, // Username or UserID
  userRole: String,  // 'Faculty', 'Student', etc.
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Listing', ListingSchema);