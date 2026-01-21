const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../models/User');
const neo4j = require('neo4j-driver');

// Neo4j Driver (Quick connection for syncing)
const driver = neo4j.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'));

router.post('/register', async (req, res) => {
  const session = driver.session();
  try {
    const { email, password, full_name, role_name, year } = req.body; // 'year' if student

    // 1. Find Role ID
    const role = await Role.findOne({ where: { name: role_name.toLowerCase() } });
    if (!role) return res.status(400).json({ error: "Invalid Role" });

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create in MySQL
    const newUser = await User.create({
      email,
      password_hash: hashedPassword,
      full_name,
      role_id: role.role_id,
      status: 'active'
    });

    // 4. Create Node in Neo4j (Syncing Graph)
    // Capitalize role for Label (e.g., 'Student')
    const neoLabel = role_name.charAt(0).toUpperCase() + role_name.slice(1);
    await session.run(
      `CREATE (u:${neoLabel} {user_id: $id, name: $name, email: $email})`,
      { id: newUser.id, name: full_name, email: email }
    );

    res.json({ message: "User registered successfully", userId: newUser.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1. Check User
    const user = await User.findOne({ where: { email }, include: Role });
    if (!user) return res.status(401).json({ error: "User not found" });

    // 2. Verify Password
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) return res.status(401).json({ error: "Invalid password" });

    if (user.status === 'frozen') return res.status(403).json({ error: "Account Frozen" });

    // 3. Generate Token
    const token = jwt.sign(
      { id: user.id, role: user.Role.name, name: user.full_name },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1d' }
    );

    res.json({ token, role: user.Role.name, userId: user.id, name: user.full_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;