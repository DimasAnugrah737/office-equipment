const Item = require('./src/models/Item');
const Borrowing = require('./src/models/Borrowing');
const User = require('./src/models/User');
const { connectDB, sequelize } = require('./src/config/database');
const { Op } = require('sequelize');
const fs = require('fs');
require('./src/models/associations')();

async function testBMW() {
    const logFile = 'test_bmw_borrow.txt';
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

        log(`Initial BMW M3 availableQuantity: ${bmw.availableQuantity}`);

        // Create a borrowing
        const user = await User.findOne();
        const borrowing = await Borrowing.create({
            userId: user.id,
            itemId: bmw.id,
            quantity: 1,
            expectedReturnDate: new Date(Date.now() + 86400000),
            status: 'pending'
        });
        log(`Borrowing created (ID: ${borrowing.id}, status: pending)`);

        // Mock approval logic
        const t = await sequelize.transaction();
        try {
            const b = await Borrowing.findByPk(borrowing.id, {
                include: [{ model: Item, as: 'item' }],
                transaction: t
            });

            log(`Approving... Quantity before: ${b.item.availableQuantity}`);

            await b.update({ status: 'approved' }, { transaction: t });
            await b.item.update({
                availableQuantity: b.item.availableQuantity - b.quantity
            }, { transaction: t });

            await t.commit();
            log('Approved and quantity updated.');
        } catch (e) {
            await t.rollback();
            log(`Error in approval: ${e.message}`);
        }

        const updatedBMW = await Item.findByPk(bmw.id);
        log(`Final BMW M3 availableQuantity: ${updatedBMW.availableQuantity}`);

    } catch (error) {
        log('TEST BMW ERROR: ' + error.message);
    } finally {
        await sequelize.close();
    }
}

testBMW();
