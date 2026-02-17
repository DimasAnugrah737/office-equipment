const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Item = require('./src/models/Item');
const Borrowing = require('./src/models/Borrowing');
require('dotenv').config();

const categories = [
  'Laptops',
  'Projectors',
  'Printers',
  'Network Equipment',
  'Office Furniture',
  'Stationery',
  'Electronics',
  'Vehicles'
];

const items = [
  { name: 'Dell Latitude Laptop', category: 'Laptops', quantity: 10 },
  { name: 'HP LaserJet Printer', category: 'Printers', quantity: 5 },
  { name: 'Epson Projector', category: 'Projectors', quantity: 3 },
  { name: 'Cisco Router', category: 'Network Equipment', quantity: 8 },
  { name: 'Office Chair', category: 'Office Furniture', quantity: 20 },
  { name: 'Whiteboard', category: 'Office Furniture', quantity: 15 },
  { name: 'Notebook Pack', category: 'Stationery', quantity: 100 },
  { name: 'UPS Battery', category: 'Electronics', quantity: 12 },
  { name: 'Company Car', category: 'Vehicles', quantity: 2 }
];

const users = [
  {
    fullName: 'John Doe',
    nip: 'EMP001',
    email: 'john@office.com',
    password: 'password123',
    role: 'user',
    department: 'IT',
    position: 'Software Developer'
  },
  {
    fullName: 'Jane Smith',
    nip: 'EMP002',
    email: 'jane@office.com',
    password: 'password123',
    role: 'user',
    department: 'HR',
    position: 'HR Manager'
  },
  {
    fullName: 'Bob Wilson',
    nip: 'OFF001',
    email: 'bob@office.com',
    password: 'password123',
    role: 'officer',
    department: 'Operations',
    position: 'Operations Officer'
  }
];

const seedDummyData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Clear existing data
    await Borrowing.deleteMany({});
    await Item.deleteMany({});
    await Category.deleteMany({});
    await User.deleteMany({ role: { $in: ['user', 'officer'] } });
    
    console.log('Cleared existing dummy data');
    
    // Create categories
    const createdCategories = [];
    for (const categoryName of categories) {
      const category = await Category.create({
        name: categoryName,
        description: `${categoryName} category for office equipment`,
        createdBy: (await User.findOne({ email: 'admin@office.com' }))._id
      });
      createdCategories.push(category);
      console.log(`Created category: ${categoryName}`);
    }
    
    // Create users
    const createdUsers = [];
    for (const userData of users) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const user = await User.create({
        ...userData,
        password: hashedPassword
      });
      createdUsers.push(user);
      console.log(`Created user: ${userData.fullName}`);
    }
    
    // Create items
    const createdItems = [];
    for (const itemData of items) {
      const category = createdCategories.find(c => c.name === itemData.category);
      
      const item = await Item.create({
        name: itemData.name,
        description: `High-quality ${itemData.name.toLowerCase()}`,
        category: category._id,
        serialNumber: `SN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        quantity: itemData.quantity,
        availableQuantity: itemData.quantity,
        condition: 'good',
        location: 'Main Storage',
        createdBy: (await User.findOne({ email: 'admin@office.com' }))._id
      });
      createdItems.push(item);
      console.log(`Created item: ${itemData.name}`);
    }
    
    // Create sample borrowings
    const statuses = ['pending', 'approved', 'borrowed', 'returned', 'rejected'];
    
    for (let i = 0; i < 20; i++) {
      const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const item = createdItems[Math.floor(Math.random() * createdItems.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      const borrowDate = new Date();
      borrowDate.setDate(borrowDate.getDate() - Math.floor(Math.random() * 30));
      
      const expectedReturnDate = new Date(borrowDate);
      expectedReturnDate.setDate(expectedReturnDate.getDate() + 7);
      
      const actualReturnDate = status === 'returned' 
        ? new Date(expectedReturnDate)
        : undefined;
      
      if (actualReturnDate) {
        actualReturnDate.setDate(actualReturnDate.getDate() + Math.floor(Math.random() * 3));
      }
      
      await Borrowing.create({
        user: user._id,
        item: item._id,
        quantity: Math.min(item.quantity, Math.floor(Math.random() * 3) + 1),
        borrowDate,
        expectedReturnDate,
        actualReturnDate,
        status,
        conditionBefore: 'good',
        conditionAfter: status === 'returned' ? 'good' : undefined,
        purpose: 'Office work and project requirements'
      });
    }
    
    console.log('Created 20 sample borrowing records');
    console.log('\nDummy data seeding completed!');
    
    console.log('\nTest Credentials:');
    console.log('================');
    console.log('Admin:');
    console.log('  Email: admin@office.com');
    console.log('  Password: admin123');
    console.log('  NIP: ADMIN001');
    console.log('\nOfficer:');
    console.log('  Email: bob@office.com');
    console.log('  Password: password123');
    console.log('  NIP: OFF001');
    console.log('\nUsers:');
    console.log('  Email: john@office.com / jane@office.com');
    console.log('  Password: password123');
    console.log('  NIP: EMP001 / EMP002');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding dummy data:', error);
    process.exit(1);
  }
};

seedDummyData();