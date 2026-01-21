const router = require('express').Router();
const Listing = require('../models/Listing');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', async (req, res) => {
  const items = await Listing.find({ type: 'Marketplace' });
  res.json(items);
});

router.post('/', verifyToken, async (req, res) => {
  const { category, title, price } = req.body;
  
  const newItem = new Listing({
    type: 'Marketplace',
    category, title, price,
    createdBy: req.user.username || req.user.id,
    userRole: req.user.role
  });

  await newItem.save();
  
  // Kafka Event
  const producer = req.app.locals.producer;
  if(producer) {
      await producer.send({
          topic: 'post-events',
          messages: [{ value: JSON.stringify({ type: 'PostCreated', category: 'MarketplaceItem' }) }]
      });
  }

  res.json({ message: "Item listed for sale" });
});

module.exports = router;