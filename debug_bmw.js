const Item = require('./src/models/Item');
const Borrowing = require('./src/models/Borrowing');
const User = require('./src/models/User');
const { connectDB, sequelize } = require('./src/config/database');
const { Op } = require('sequelize');
const fs = require('fs');
require('./src/models/associations')();

async function debugBMW() {
    const logFile = 'debug_bmw_output.txt';
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    try {
        if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
        await connectDB();
        log('Database connected');

        const bmw = await Item.findOne({ where: { name: { [Op.like]: '%BMW%' } } });
        if (bmw) {
            log('BMW M3 Data: ' + JSON.stringify(bmw.toJSON(), null, 2));

            const borrowings = await Borrowing.findAll({
                where: { itemId: bmw.id },
                include: [{ model: User, as: 'user' }]
            });
            log('BMW M3 Borrowings: ' + JSON.stringify(borrowings.map(b => b.toJSON()), null, 2));
        } else {
            log('BMW M3 not found in database.');
            const allItems = await Item.findAll();
            log('All Items: ' + allItems.map(i => i.name).join(', '));
        }

    } catch (error) {
        log('DEBUG BMW ERROR: ' + error.message);
        log('STACK: ' + error.stack);
    } finally {
        await sequelize.close();
    }
}

debugBMW();
