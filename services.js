const router = require('express').Router();
const Listing = require('../models/Listing');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Get All Services
router.get('/', async (req, res) => {
  const services = await Listing.find({ type: 'Service' });
  res.json(services);
});

// Post a Service Request (Anyone) or Job Offer (Faculty/Alumni)
// Logic: Students can request 'Cooking', Faculty can post 'Jobs'
router.post('/', verifyToken, async (req, res) => {
  const { category, title, description } = req.body;
  const userRole = req.user.role;

  // Example Constraint: Only Alumni/Faculty can post "Jobs"
  if (category === 'Job' && !['Alumni', 'Faculty', 'Admin'].includes(userRole)) {
    return res.status(403).json({ error: "Students cannot post Jobs" });
  }

  const newService = new Listing({
    type: 'Service',
    category, title, description,
    createdBy: req.user.username || req.user.id,
    userRole
  });
  
  await newService.save();

  // Kafka Event for Analytics
  const producer = req.app.locals.producer;
  if (producer) {
      await producer.send({
          topic: 'post-events',
          messages: [{ value: JSON.stringify({ type: 'PostCreated', category }) }]
      });
  }

  res.json({ message: "Service posted successfully" });
});

module.exports = router;