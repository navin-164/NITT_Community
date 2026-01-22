const router = require('express').Router();
const mongoose = require('mongoose');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

const ComplaintSchema = new mongoose.Schema({
    submitter_id: Number,      // Who complained (Buyer)
    target_user_id: Number,    // Who is it about (Seller) <-- NEW FIELD
    title: String,
    description: String,
    status: { type: String, default: 'open' }, // open, resolved
    created_at: { type: Date, default: Date.now }
});

// Check if model exists to prevent overwrite errors
const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', ComplaintSchema);

// 1. Submit Complaint
router.post('/', verifyToken, async (req, res) => {
    const { title, description, target_user_id } = req.body;
    
    await new Complaint({
        submitter_id: req.user.id,
        target_user_id: target_user_id, // Save the Seller's ID
        title, 
        description
    }).save();
    
    // Kafka Event
    const producer = req.app.locals.producer;
    if (producer) {
        try {
            producer.send({
                topic: 'complaint-events',
                messages: [{ value: JSON.stringify({ type: 'ComplaintFiled', userId: req.user.id }) }]
            });
        } catch (e) { console.error("Kafka Error:", e); }
    }
    
    res.json({ message: "Complaint Filed" });
});

// 2. Seller View: See complaints received AGAINST me
router.get('/received', verifyToken, async (req, res) => {
    try {
        // Find complaints where target_user_id is ME
        const complaints = await Complaint.find({ target_user_id: req.user.id }).sort({ created_at: -1 });
        res.json(complaints);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Admin View: See ALL complaints
router.get('/', verifyToken, checkRole(['Admin']), async (req, res) => {
    const complaints = await Complaint.find().sort({ created_at: -1 });
    res.json(complaints);
});

module.exports = router;