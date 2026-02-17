const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // userId -> WebSocket connection
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
    
    console.log('WebSocket server started');
  }
  
  async handleConnection(ws, req) {
    try {
      // Extract token from query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        ws.close(1008, 'No token provided');
        return;
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        ws.close(1008, 'User not found');
        return;
      }
      
      // Store connection
      this.clients.set(user._id.toString(), ws);
      
      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'WebSocket connected successfully',
        userId: user._id,
        userRole: user.role
      }));
      
      // Handle messages
      ws.on('message', (data) => {
        this.handleMessage(user, data);
      });
      
      // Handle disconnection
      ws.on('close', () => {
        this.clients.delete(user._id.toString());
        console.log(`User ${user.fullName} disconnected`);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(user._id.toString());
      });
      
      console.log(`User ${user.fullName} connected`);
      
    } catch (error) {
      console.error('Connection error:', error);
      ws.close(1008, 'Authentication failed');
    }
  }
  
  handleMessage(user, data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'ping':
          this.sendToUser(user._id, {
            type: 'pong',
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'subscribe':
          // Handle subscription requests
          this.handleSubscription(user, message);
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Message handling error:', error);
    }
  }
  
  handleSubscription(user, message) {
    // Implement subscription logic if needed
    console.log(`User ${user.fullName} subscribed to:`, message.channel);
  }
  
  // Send notification to specific user
  async sendNotification(userId, notification) {
    const ws = this.clients.get(userId.toString());
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'notification',
        data: notification
      };
      
      ws.send(JSON.stringify(message));
      
      // Mark notification as delivered
      await Notification.findByIdAndUpdate(notification._id, {
        isRead: false // Keep as unread until user opens it
      });
      
      return true;
    }
    
    return false;
  }
  
  // Send to multiple users
  async sendToUsers(userIds, notification) {
    const results = await Promise.all(
      userIds.map(userId => this.sendNotification(userId, notification))
    );
    return results.filter(result => result).length;
  }
  
  // Send to all connected users of specific role
  async sendToRole(role, notification) {
    const usersWithRole = Array.from(this.clients.keys()).filter(async (userId) => {
      // In production, you might want to cache user roles
      const user = await User.findById(userId);
      return user && user.role === role;
    });
    
    return this.sendToUsers(usersWithRole, notification);
  }
  
  // Send to specific user
  sendToUser(userId, message) {
    const ws = this.clients.get(userId.toString());
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    
    return false;
  }
  
  // Broadcast to all connected clients
  broadcast(message) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  // Get connected clients count
  getConnectedCount() {
    return this.clients.size;
  }
  
  // Get connected users
  getConnectedUsers() {
    return Array.from(this.clients.keys());
  }
}

module.exports = WebSocketServer;