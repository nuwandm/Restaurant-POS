const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./electron/database/init');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

let db;

async function start() {
  // Use local db file next to server.js
  process.env.DB_PATH = path.join(__dirname, 'hotel_pos.db');
  db = await initDatabase();
  console.log('Database ready');

  app.post('/api/db', (req, res) => {
    try {
      const { action, data } = req.body;
      const result = db.query(action, data);
      res.json({ success: true, data: result });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  app.post('/api/payment', (req, res) => {
    try {
      const { order, payment, table } = req.body;

      // If order was already created in DB, use it; otherwise create now
      let orderId = order.orderId;
      let orderNumber = order.orderNumber;
      console.log('[payment] orderId received:', orderId, '| table:', table?.id, '| table.active_order_id:', table?.active_order_id);

      if (!orderId) {
        const orderResult = db.query('createOrder', {
          table_id: table.id,
          waiter_id: 1,
          order_type: 'dine-in',
          total_amount: order.total,
          tax_amount: order.tax,
          items: order.items,
        });
        orderId = orderResult.orderId;
        orderNumber = orderResult.orderNumber;
      }

      const paymentResult = db.query('processPayment', {
        orderId,
        method: payment.method,
        amount: payment.amount,
        change: payment.change,
        cashierId: 1,
      });

      // Cancel any OTHER stale pending orders for the same table (skip for takeaway — null table)
      if (table.id) {
        db.db.prepare(
          "UPDATE orders SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE table_id=? AND status IN ('pending','preparing') AND id != ?"
        ).run(table.id, orderId);
      }

      console.log('[payment] completed orderId:', orderId, '| cleared stale orders for table:', table.id);

      res.json({
        success: true,
        orderNumber,
        transactionNumber: paymentResult.transactionNumber,
      });
    } catch (err) {
      res.json({ success: false, error: err.message });
    }
  });

  // Serve React app — never cache index.html so new builds are picked up
  app.get('/{*path}', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Hotel POS running at http://localhost:${PORT}`);
    console.log('Open this URL in your browser (Chrome recommended)');
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
