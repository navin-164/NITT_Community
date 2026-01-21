const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// 1. Define Role Model
const Role = sequelize.define('Role', {
  role_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, unique: true, allowNull: false },
  description: { type: DataTypes.STRING }
}, { timestamps: false, tableName: 'roles' });

// 2. Define User Model
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  full_name: { type: DataTypes.STRING },
  role_id: { 
    type: DataTypes.INTEGER,
    references: { model: Role, key: 'role_id' }
  },
  status: { 
    type: DataTypes.ENUM('unverified','active','frozen','deleted'), 
    defaultValue: 'active' // Auto-active for simplicity in this demo
  }
}, { 
  tableName: 'users',
  createdAt: 'created_at',
  updatedAt: false // You handle last_login manually if needed
});

User.belongsTo(Role, { foreignKey: 'role_id', targetKey: 'role_id' });

module.exports = { User, Role };