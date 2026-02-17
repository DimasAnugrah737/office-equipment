const ActivityLog = require('./src/models/ActivityLog');
const Item = require('./src/models/Item');
const { connectDB, sequelize } = require('./src/config/database');
const { Op } = require('sequelize');
const fs = require('fs');

async function debugBMWLog() {
    const logFile = 'debug_bmw_log_output.txt';
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    try {
        if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
        await connectDB();
        log('Database connected');

        const bmw = await Item.findOne({ where: { name: 'BMW M3' } });
        if (!bmw) return log('BMW M3 not found');

        const logs = await ActivityLog.findAll({
            where: {
                [Op.or]: [
                    { entityType: 'item', entityId: bmw.id },
                    { action: { [Op.like]: '%BMW%' } }
                ]
            },
            order: [['createdAt', 'DESC']]
        });

        log(`Found ${logs.length} log entries for BMW M3`);
        log(JSON.stringify(logs.map(l => l.toJSON()), null, 2));

    } catch (error) {
        log('DEBUG BMW LOG ERROR: ' + error.message);
    } finally {
        await sequelize.close();
    }
}

debugBMWLog();
