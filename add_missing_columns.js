const { sequelize } = require('./src/config/database');
const { QueryTypes } = require('sequelize');

async function fixSchema() {
    try {
        console.log('Checking for missing columns...');

        // 1. Check notifications table
        const [notifCols] = await sequelize.query("SHOW COLUMNS FROM notifications");
        const hasPath = notifCols.some(col => col.Field === 'path');

        if (!hasPath) {
            console.log('Adding "path" column to notifications table...');
            await sequelize.query("ALTER TABLE notifications ADD COLUMN path VARCHAR(255) DEFAULT NULL AFTER isRead");
            console.log('Added "path" column.');
        } else {
            console.log('"path" column already exists in notifications.');
        }

        // 2. Check for relatedBorrowingId type - sometimes ENUM issues or missing FKs cause issues
        const hasRelatedId = notifCols.some(col => col.Field === 'relatedBorrowingId');
        if (!hasRelatedId) {
            console.log('Adding "relatedBorrowingId" column to notifications table...');
            await sequelize.query("ALTER TABLE notifications ADD COLUMN relatedBorrowingId INT DEFAULT NULL AFTER path");
            console.log('Added "relatedBorrowingId" column.');
        }

        console.log('Schema update complete.');
    } catch (error) {
        console.error('SCHEMA FIX ERROR:', error.message);
    } finally {
        await sequelize.close();
    }
}

fixSchema();
