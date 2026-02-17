require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/config/database');
const User = require('./src/models/User');

const seedAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log('Database synced');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Upsert admin user
    const [user, created] = await User.upsert({
      fullName: 'System Administrator',
      nip: 'ADMIN001',
      email: 'admin@office.com',
      password: hashedPassword,
      role: 'admin',
      department: 'IT',
      position: 'System Administrator',
      isActive: true
    });
    
    if (created) {
      console.log('✅ Admin user created successfully');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
    
    console.log('Credentials:');
    console.log('Email: admin@office.com');
    console.log('Password: admin123');
    console.log('NIP: ADMIN001');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

seedAdmin();