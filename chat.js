const router = require('express').Router();
const Chat = require('../models/Chat');
const { verifyToken } = require('../middleware/authMiddleware');
const neo4j = require('neo4j-driver');

// 1. Initialize Neo4j Driver (Using credentials from api_gateway/.env)
const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j', 
        process.env.NEO4J_PASSWORD || 'password'
    )
);

// 2. Show Interest (Start Chat & Update Graph)
router.post('/interest', verifyToken, async (req, res) => {
    const { targetUserId, itemId, itemTitle } = req.body;
    const myId = req.user.id;

    // Unique Room ID for Mongo
    const p1 = Math.min(myId, targetUserId);
    const p2 = Math.max(myId, targetUserId);
    const roomId = `chat_${p1}_${p2}_${itemId}`;

    const session = driver.session(); // Start Neo4j Session

    try {
        // --- A. MongoDB Logic: Create Chat Room ---
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

        // --- B. Neo4j Logic: Create Relationship ---
        // We look for nodes with the matching 'user_id' (from MySQL)
        // We use MERGE so we don't create duplicate relationships
        await session.run(
            `MATCH (a {user_id: $myId}), (b {user_id: $targetId})
             MERGE (a)-[r:INTERESTED_IN {itemId: $itemId, date: datetime()}]->(b)
             RETURN type(r)`,
            { 
                myId: parseInt(myId),        // Ensure IDs are integers
                targetId: parseInt(targetUserId), 
                itemId: itemId 
            }
        );

        res.json({ message: "Chat started and Graph updated", roomId, chat });
    } catch (err) {
        console.error("Chat/Graph Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close(); // Always close the session
    }
});

// 3. Get My Chats
router.get('/my-chats', verifyToken, async (req, res) => {
    try {
        const chats = await Chat.find({ participants: req.user.id }).sort({ updated_at: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Get Specific Chat History
router.get('/:roomId', verifyToken, async (req, res) => {
    try {
        const chat = await Chat.findOne({ room_id: req.params.roomId });
        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;