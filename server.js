const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

const fs = require('fs');

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  fs.writeFileSync('server_crash.log', `Uncaught Exception: ${err.message}\n${err.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  fs.writeFileSync('server_crash.log', `Unhandled Rejection: ${reason}\n`);
  process.exit(1);
});

const { connectDB } = require('./src/config/database');
const routes = require('./src/routes');
const logActivity = require('./src/middleware/logger');

// Load all models before setting up associations
require('./src/models/User');
require('./src/models/Category');
require('./src/models/Item');
require('./src/models/Borrowing');
require('./src/models/Notification');
require('./src/models/ActivityLog');

const setupAssociations = require('./src/models/associations');

const http = require('http');
const { initSocket } = require('./src/utils/socket');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Activity logging middleware
app.use(logActivity);

// Routes
app.use('/api', routes);
app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  try {
    fs.appendFileSync('error.log', `${new Date().toISOString()} - ${req.method} ${req.url} - ${err.message}\n${err.stack}\n\n`);
  } catch (logErr) {
    console.error('Failed to write to error.log:', logErr);
  }
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;



const startServer = async () => {
  try {
    setupAssociations();
    await connectDB();

    initSocket(server);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      console.log('Server restarted successfully with Socket.io');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    fs.writeFileSync('server_error.log', `Server start error: ${err.message}\n${err.stack}`);
    process.exit(1);
  }
};

startServer();