const Borrowing = require('../models/Borrowing');
const Item = require('../models/Item');
const User = require('../models/User');
const Category = require('../models/Category');
const ActivityLog = require('../models/ActivityLog');
const { Op, Sequelize } = require('sequelize');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const generateBorrowingReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.method === 'POST' ? req.body : req.query;

    const whereClause = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        whereClause.createdAt = {
          [Op.between]: [start, end]
        };
      }
    }

    const borrowings = await Borrowing.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['fullName', 'email', 'department'] },
        { model: Item, as: 'item', attributes: ['name', 'serialNumber'] },
        { model: User, as: 'approver', attributes: ['fullName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Borrowing Report');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'User', key: 'user', width: 25 },
        { header: 'Item', key: 'item', width: 25 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Borrow Date', key: 'borrowDate', width: 15 },
        { header: 'Expected Return', key: 'expectedReturnDate', width: 15 },
        { header: 'Approver', key: 'approver', width: 25 }
      ];

      borrowings.forEach(b => {
        worksheet.addRow({
          id: b.id,
          user: b.user?.fullName || 'N/A',
          item: b.item?.name || 'N/A',
          quantity: b.quantity,
          status: b.status,
          borrowDate: b.borrowDate ? new Date(b.borrowDate).toLocaleDateString() : 'N/A',
          expectedReturnDate: new Date(b.expectedReturnDate).toLocaleDateString(),
          approver: b.approver?.fullName || 'Pending'
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=borrowing_report.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=borrowing_report.pdf');
      doc.pipe(res);

      doc.fontSize(18).text('Borrowing Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      borrowings.forEach(b => {
        doc.fontSize(12).text(`ID: ${b.id} | ${b.user?.fullName || 'N/A'}`);
        doc.fontSize(10).text(`Item: ${b.item?.name || 'N/A'} (Qty: ${b.quantity})`);
        doc.text(`Status: ${b.status} | Date: ${b.borrowDate ? new Date(b.borrowDate).toLocaleDateString() : 'N/A'}`);
        doc.moveDown();
      });

      doc.end();
    } else {
      res.json({ message: 'Report generated', data: borrowings });
    }
  } catch (error) {
    console.error('Generate report error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows: logs } = await ActivityLog.findAndCountAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['fullName', 'email', 'role']
      }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      logs,
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get activity logs error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getInventoryReport = async (req, res) => {
  try {
    const items = await Item.findAll({
      include: [{ model: Category, as: 'category', attributes: ['name'] }]
    });

    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const availableItems = items.filter(i => i.isAvailable).length;
    const borrowedItems = items.reduce((sum, item) => sum + (item.quantity - item.availableQuantity), 0);

    const categories = await Category.count();

    // Category stats
    const categoryStats = await Item.findAll({
      attributes: [
        'categoryId',
        [Sequelize.fn('COUNT', Sequelize.col('Item.id')), 'itemCount'],
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
        [Sequelize.fn('SUM', Sequelize.col('availableQuantity')), 'availableQuantity']
      ],
      include: [{ model: Category, as: 'category', attributes: ['name'] }],
      group: ['categoryId', 'category.id', 'category.name'],
      raw: true,
      nest: true
    });

    // Condition stats
    const conditions = await Item.findAll({
      attributes: [
        'condition',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['condition'],
      raw: true
    });

    const conditionStats = conditions.map(c => ({
      condition: c.condition,
      count: parseInt(c.count) || 0
    }));

    res.json({
      summary: {
        totalItems,
        totalQuantity,
        availableItems,
        borrowedItems,
        categories
      },
      categoryStats: categoryStats.map(c => ({
        categoryName: c.category?.name || 'Uncategorized',
        itemCount: parseInt(c.itemCount) || 0,
        totalQuantity: parseInt(c.totalQuantity) || 0,
        availableQuantity: parseInt(c.availableQuantity) || 0
      })),
      conditionStats,
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        category: i.category?.name || 'N/A',
        quantity: i.quantity,
        availableQuantity: i.availableQuantity,
        status: i.isAvailable ? 'Available' : 'Unavailable'
      }))
    });
  } catch (error) {
    console.error('Get inventory report error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  generateBorrowingReport,
  getActivityLogs,
  getInventoryReport
};