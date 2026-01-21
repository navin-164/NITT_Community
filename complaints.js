const router = require('express').Router();
const mongoose = require('mongoose');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

const ComplaintSchema = new mongoose.Schema({
    submitter_id: Number,
    title: String,
    description: String,
    status: { type: String, default: 'open' }, // open, resolved
    created_at: { type: Date, default: Date.now }
});
const Complaint = mongoose.model('Complaint', ComplaintSchema);

// Submit Complaint
router.post('/', verifyToken, async (req, res) => {
    const { title, description } = req.body;
    await new Complaint({
        submitter_id: req.user.id,
        title, description
    }).save();
    
    // Kafka Event
    const producer = req.app.locals.producer;
    if (producer) {
        producer.send({
            topic: 'complaint-events',
            messages: [{ value: JSON.stringify({ type: 'ComplaintFiled', userId: req.user.id }) }]
        });
    }
    
    res.json({ message: "Complaint Filed" });
});

// Admin View
router.get('/', verifyToken, checkRole(['Admin']), async (req, res) => {
    const complaints = await Complaint.find().sort({ created_at: -1 });
    res.json(complaints);
});

module.exports = router;