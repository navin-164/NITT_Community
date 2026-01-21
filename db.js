const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');

/* ---------- MySQL (Sequelize) ---------- */
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    dialect: 'mysql',
    logging: false,
  }
);

async function connectMySQL() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected');
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  }
}

/* ---------- MongoDB (Mongoose) ---------- */
async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = {
  connectMySQL,
  connectMongo,
  sequelize,
};

