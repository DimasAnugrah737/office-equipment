const { sequelize, connectDB } = require('./src/config/database');
const setupAssociations = require('./src/models/associations');
require('./src/models/User');
require('./src/models/Category');
require('./src/models/Item');
require('./src/models/Borrowing');
require('./src/models/Notification');
require('./src/models/ActivityLog');

const { createBorrowing } = require('./src/controllers/borrowingController');

const test = async () => {
    try {
        setupAssociations();
        await connectDB();

        const User = sequelize.models.User;
        const Item = sequelize.models.Item;

        const user = await User.findOne();
        const item = await Item.findOne();

        if (!user || !item) {
            console.error('Need at least one user and one item in DB to test.');
            process.exit(1);
        }

        const req = {
            user: { id: user.id, fullName: user.fullName },
            body: {
                itemId: item.id,
                quantity: 1,
                expectedReturnDate: new Date(Date.now() + 86400000), // tomorrow
                purpose: 'Test'
            }
        };

        const res = {
            status: function (code) {
                this.statusCode = code;
                return this;
            },
            json: function (data) {
                console.log('Response status:', this.statusCode || 200);
                console.log('Response data:', JSON.stringify(data, null, 2));
            }
        };

        console.log('Executing createBorrowing...');
        await createBorrowing(req, res);

    } catch (error) {
        console.error('Test execution error:', error);
    } finally {
        process.exit(0);
    }
};

test();
