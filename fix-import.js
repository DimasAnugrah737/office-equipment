// fix-imports.js
const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/controllers/authController.js',
  'src/controllers/categoryController.js',
  'src/controllers/itemController.js',
  'src/controllers/userController.js',
  'src/routes/authRoutes.js',
  'src/routes/categoryRoutes.js',
  'src/routes/itemRoutes.js',
  'src/routes/userRoutes.js',
  'seed.js',
  'src/models/associations.js'
];

const patterns = {
  // Model imports
  "require\\(['\"]\\./src/models/": "require('../models/",
  "require\\(['\"]\\.\\./models/": "require('../models/",
  "require\\(['\"]\\.\\./\\.\\./models/": "require('../models/",
  "require\\(['\"]\\./models/": "require('../models/",
  
  // Controller imports (in routes)
  "require\\(['\"]\\./src/controllers/": "require('../controllers/",
  "require\\(['\"]\\.\\./controllers/": "require('../controllers/",

  // Fix casing for models (lowercase -> PascalCase)
  "/models/user'": "/models/User'",
  "/models/user\"": "/models/User\"",
  "/models/category'": "/models/Category'",
  "/models/category\"": "/models/Category\"",
  "/models/item'": "/models/Item'",
  "/models/item\"": "/models/Item\"",
  "/models/borrowing'": "/models/Borrowing'",
  "/models/borrowing\"": "/models/Borrowing\"",
  "/models/notification'": "/models/Notification'",
  "/models/notification\"": "/models/Notification\"",
  "/models/activityLog'": "/models/ActivityLog'",
  "/models/activityLog\"": "/models/ActivityLog\"",
  "/models/activitylog'": "/models/ActivityLog'",
  "/models/activitylog\"": "/models/ActivityLog\""
};

filesToFix.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    Object.keys(patterns).forEach(pattern => {
      const regex = new RegExp(pattern, 'g');
      content = content.replace(regex, patterns[pattern]);
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed imports in ${filePath}`);
    } else {
      console.log(`✓ No changes needed for ${filePath}`);
    }
  } else {
    console.log(`⚠️ File not found: ${filePath}`);
  }
});