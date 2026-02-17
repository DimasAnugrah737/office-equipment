const ActivityLog = require('../models/ActivityLog');

const logActivity = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log after response is sent
    if (req.user && !req.path.includes('/logs')) {
      setTimeout(async () => {
        try {
          await ActivityLog.create({
            userId: req.user.id,
            action: `${req.method} ${req.path}`,
            entityType: getEntityType(req.path),
            details: {
              params: req.params,
              query: req.query,
              body: req.method !== 'GET' ? req.body : null,
              statusCode: res.statusCode
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
        } catch (error) {
          console.error('Activity log error:', error);
        }
      }, 0);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

function getEntityType(path) {
  if (path.includes('/users')) return 'user';
  if (path.includes('/items')) return 'item';
  if (path.includes('/categories')) return 'category';
  if (path.includes('/borrowings')) return 'borrowing';
  return 'system';
}

module.exports = logActivity;