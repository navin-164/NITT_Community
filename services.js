const router = require('express').Router();
const Listing = require('../models/Listing');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Get All Services
router.get('/', async (req, res) => {
  const services = await Listing.find({ type: 'Service' });
  res.json(services);
});

// Post a Service Request or Job Offer
router.post('/', verifyToken, async (req, res) => {
  const { category, title, description } = req.body;
  
  // FIX: Convert role to lowercase to ensure matching works ('Alumni' vs 'alumni')
  const userRole = req.user.role ? req.user.role.toLowerCase() : 'unknown';

  // Allowed roles for posting Jobs (Lowercase check)
  const allowedJobPosters = ['alumni', 'faculty', 'admin'];

  if (category === 'Job' && !allowedJobPosters.includes(userRole)) {
    return res.status(403).json({ error: "Students cannot post Jobs" });
  }

  const newService = new Listing({
    type: 'Service',
    category, title, description,
    
    // Save User Info
    createdBy: req.user.name || req.user.username,
    requester_user_id: req.user.id,
    userRole: req.user.role // Keep original casing for display if preferred
  });
  
  await newService.save();

  // Kafka Event for Analytics
  const producer = req.app.locals.producer;
  if (producer) {
      try {
        await producer.send({
            topic: 'post-events',
            messages: [{ value: JSON.stringify({ type: 'PostCreated', category }) }]
        });
      } catch(e) { console.error('Kafka Error', e); }
  }

  res.json({ message: "Service posted successfully" });
});

module.exports = router;