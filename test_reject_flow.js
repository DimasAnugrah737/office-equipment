const Borrowing = require('./src/models/Borrowing');
const Notification = require('./src/models/Notification');
const User = require('./src/models/User');
const Item = require('./src/models/Item');
const { connectDB, sequelize } = require('./src/config/database');
require('./src/models/associations')();

async function testReject() {
    const logFile = 'test_reject_output.txt';
    const fs = require('fs');
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    try {
        if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
        await connectDB();
        log('Database connected');

        // 1. Find a pending borrowing or create one
        let borrowing = await Borrowing.findOne({ where: { status: 'pending' }, include: ['item'] });

        if (!borrowing) {
            log('No pending borrowing found, creating one for test...');
            const user = await User.findOne();
            const item = await Item.findOne();
            borrowing = await Borrowing.create({
                userId: user.id,
                itemId: item.id,
                quantity: 1,
                expectedReturnDate: new Date(Date.now() + 86400000),
                status: 'pending'
            });
            borrowing = await Borrowing.findByPk(borrowing.id, { include: ['item'] });
        }

        log('Testing reject for borrowing ID: ' + borrowing.id);

        // Mocking the rejectBorrowing logic manually to test transaction behavior
        const officer = await User.findOne({ where: { role: 'officer' } });
        if (!officer) {
            log('No officer found for testing, using admin or any user...');
        }
        const testUserId = officer ? officer.id : 1;

        const t = await sequelize.transaction();
        try {
            await borrowing.update({
                status: 'rejected',
                approvedBy: testUserId,
                approvedAt: new Date(),
                notes: 'Test rejection'
            }, { transaction: t });

            await Notification.create({
                userId: borrowing.userId,
                title: 'Borrowing Rejected',
                message: `Your request to borrow ${borrowing.item.name} was rejected. Reason: Test rejection`,
                type: 'borrow_rejected',
                path: '/my-borrowings',
                relatedBorrowingId: borrowing.id
            }, { transaction: t });

            await t.commit();
            log('Transaction committed successfully');
        } catch (innerError) {
            await t.rollback();
            log('Transaction rolled back due to error: ' + innerError.message);
            throw innerError;
        }

        // Verify
        const updated = await Borrowing.findByPk(borrowing.id);
        log('Updated status: ' + updated.status);

        const notif = await Notification.findOne({
            where: { relatedBorrowingId: borrowing.id, type: 'borrow_rejected' }
        });
        log('Notification created: ' + (notif ? 'Yes' : 'No'));

    } catch (error) {
        log('TEST REJECT ERROR: ' + error.message);
        log('STACK: ' + error.stack);
    } finally {
        await sequelize.close();
    }
}

testReject();
