const router = require('express').Router();
const Chat = require('../models/Chat');
const { verifyToken } = require('../middleware/authMiddleware');
const neo4j = require('neo4j-driver');

// 1. Initialize Neo4j Driver
const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j', 
        process.env.NEO4J_PASSWORD || 'password'
    )
);

// 2. Show Interest (Start Chat & Upsert Graph Relation)
router.post('/interest', verifyToken, async (req, res) => {
    const { targetUserId, itemId, itemTitle } = req.body;
    const myId = req.user.id;

    // Ensure IDs are Integers (MySQL uses ints, but legacy test data might be strings)
    // If parseInt returns NaN (e.g. for "test-user"), we keep it as a string to avoid crashes.
    const myIdInt = isNaN(parseInt(myId)) ? myId : parseInt(myId);
    const targetIdInt = isNaN(parseInt(targetUserId)) ? targetUserId : parseInt(targetUserId);

    // Unique Room ID for Mongo
    // We sort IDs to ensure User A -> User B and User B -> User A open the SAME room.
    const p1 = myIdInt < targetIdInt ? myIdInt : targetIdInt;
    const p2 = myIdInt > targetIdInt ? myIdInt : targetIdInt;
    const roomId = `chat_${p1}_${p2}_${itemId}`;

    const session = driver.session(); // Start Neo4j Session

    try {
        // --- A. MongoDB Logic: Create Chat Room (Keep history) ---
        let chat = await Chat.findOne({ room_id: roomId });
        if (!chat) {
            chat = new Chat({
                room_id: roomId,
                participants: [myId, targetUserId], // Store original values for flexibility
                messages: [{
                    senderId: myId,
                    text: `Hi, I am interested in your post: "${itemTitle}"`
                }]
            });
            await chat.save();
        }

        // --- B. Neo4j Logic: "Upsert" Relationship ---
        // CRITICAL FIX: We use MERGE for the nodes too. 
        // If the user doesn't exist in Neo4j, this creates a "Skeleton Node" for them
        // so the relationship creation NEVER fails.
        const cypherQuery = `
            MERGE (a:User {user_id: $myId})
            MERGE (b:User {user_id: $targetId})
            MERGE (a)-[r:INTERESTED_IN {itemId: $itemId}]->(b)
            SET r.date = datetime(), r.itemTitle = $itemTitle
            RETURN type(r)
        `;

        await session.run(cypherQuery, { 
            myId: myIdInt, 
            targetId: targetIdInt, 
            itemId: itemId,
            itemTitle: itemTitle || 'Unknown Item'
        });

        res.json({ message: "Chat started and Graph connection secured", roomId, chat });
    } catch (err) {
        console.error("Chat/Graph Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close(); 
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