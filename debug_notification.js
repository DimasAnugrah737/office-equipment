const Notification = require('./src/models/Notification');
const User = require('./src/models/User');
const Borrowing = require('./src/models/Borrowing');
const { connectDB, sequelize } = require('./src/config/database');
const fs = require('fs');
require('./src/models/associations')();

async function debug() {
    const logFile = 'debug_output.txt';
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    try {
        if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
        await connectDB();
        log('Database connected');

        const count = await Notification.count();
        log('Total notifications: ' + count);

        const first = await Notification.findOne();
        log('First notification: ' + (first ? JSON.stringify(first.toJSON()) : 'None'));

    } catch (error) {
        log('DEBUG ERROR: ' + error.message);
        log('STACK: ' + error.stack);
        if (error.original) {
            log('ORIGINAL ERROR: ' + JSON.stringify(error.original));
        }
    } finally {
        await sequelize.close();
    }
}

debug();
