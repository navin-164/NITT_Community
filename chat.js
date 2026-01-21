const router = require('express').Router();
const Chat = require('../models/Chat'); // <--- IMPORT HERE
const { verifyToken } = require('../middleware/authMiddleware');

// 1. Show Interest (Start Chat)
router.post('/interest', verifyToken, async (req, res) => {
    const { targetUserId, itemId, itemTitle } = req.body;
    const myId = req.user.id;

    // Unique Room ID: smaller_ID-larger_ID-ItemId
    const p1 = Math.min(myId, targetUserId);
    const p2 = Math.max(myId, targetUserId);
    const roomId = `chat_${p1}_${p2}_${itemId}`;

    try {
        let chat = await Chat.findOne({ room_id: roomId });
        if (!chat) {
            chat = new Chat({
                room_id: roomId,
                participants: [myId, targetUserId],
                messages: [{
                    senderId: myId,
                    text: `Hi, I am interested in your post: "${itemTitle}"`
                }]
            });
            await chat.save();
        }
        res.json({ message: "Chat started", roomId, chat });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Get My Chats
router.get('/my-chats', verifyToken, async (req, res) => {
    try {
        const chats = await Chat.find({ participants: req.user.id }).sort({ updated_at: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Specific Chat History
router.get('/:roomId', verifyToken, async (req, res) => {
    try {
        const chat = await Chat.findOne({ room_id: req.params.roomId });
        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;