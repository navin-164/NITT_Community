const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'Service' or 'Marketplace'
  category: String, 
  title: String,
  description: String,
  price: Number,
  
  // existing fields
  createdBy: String, 
  userRole: String,
  
  // --- NEW FIELDS (Crucial for Neo4j) ---
  seller_user_id: Number,    // For Marketplace items
  requester_user_id: Number, // For Service requests
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Listing', ListingSchema);