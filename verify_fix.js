const { sequelize, connectDB } = require('./src/config/database');
const setupAssociations = require('./src/models/associations');
require('./src/models/User');
require('./src/models/Category');
require('./src/models/Item');
require('./src/models/Borrowing');
require('./src/models/Notification');
require('./src/models/ActivityLog');

const verify = async () => {
    try {
        console.log('--- Starting Verification ---');
        setupAssociations();
        await connectDB();
        console.log('Database connected and synchronized.');

        const Borrowing = sequelize.models.Borrowing;
        const Notification = sequelize.models.Notification;
        const User = sequelize.models.User;

        console.log('Testing associations...');
        try {
            const b = await Borrowing.findOne({
                include: [
                    { model: User, as: 'user' },
                    { model: User, as: 'approver' }
                ]
            });
            console.log('Borrowing query success:', !!b);
        } catch (e) {
            console.error('Borrowing query failed:', e.message);
            console.error(e.stack);
        }

        try {
            const n = await Notification.findOne({
                include: [{ model: Borrowing, as: 'borrowing' }]
            });
            console.log('Notification query success:', !!n);
        } catch (e) {
            console.error('Notification query failed:', e.message);
            console.error(e.stack);
        }

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
};

verify();
