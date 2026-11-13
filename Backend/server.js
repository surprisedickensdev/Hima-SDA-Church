/**
 * Hima SDA Church - Node.js Express Backend Alternative
 * Provides identical REST API endpoints to server.py
 */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'church_messages.db');

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    db.run(`
      CREATE TABLE IF NOT EXISTS church_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'new',
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  db.get('SELECT COUNT(*) AS total FROM church_messages', [], (err, rowTotal) => {
    db.get("SELECT COUNT(*) AS unread FROM church_messages WHERE status = 'new'", [], (err2, rowUnread) => {
      res.json({
        status: 'online',
        service: 'Hima SDA Church API (Node.js)',
        total_messages: rowTotal ? rowTotal.total : 0,
        unread_messages: rowUnread ? rowUnread.unread : 0
      });
    });
  });
});

// Get all messages
app.get('/api/messages', (req, res) => {
  const { status, search } = req.query;
  let sql = 'SELECT * FROM church_messages WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (full_name LIKE ? OR message LIKE ? OR phone LIKE ? OR subject LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  sql += ' ORDER BY id DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, count: rows.length, data: rows });
  });
});

// Get single message
app.get('/api/messages/:id', (req, res) => {
  db.get('SELECT * FROM church_messages WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!row) return res.status(404).json({ success: false, error: 'Message not found' });
    res.json({ success: true, data: row });
  });
});

// Create new message
app.post('/api/messages', (req, res) => {
  const { full_name, phone, email, subject, message } = req.body;
  if (!full_name || !phone || !message) {
    return res.status(400).json({
      success: false,
      error: 'full_name, phone, and message are required fields'
    });
  }

  const clientIp = req.ip || req.connection.remoteAddress;
  const sql = `
    INSERT INTO church_messages (full_name, phone, email, subject, message, status, ip_address)
    VALUES (?, ?, ?, ?, ?, 'new', ?)
  `;

  db.run(sql, [full_name.trim(), phone.trim(), email ? email.trim() : null, subject || 'General Message', message.trim(), clientIp], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    db.get('SELECT * FROM church_messages WHERE id = ?', [this.lastID], (fetchErr, row) => {
      res.status(201).json({
        success: true,
        message: 'Thank you. Your message has been sent to Hima SDA Church.',
        data: row
      });
    });
  });
});

// Update status
app.patch('/api/messages/:id', (req, res) => {
  const { status } = req.body;
  db.run('UPDATE church_messages SET status = ? WHERE id = ?', [status || 'read', req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, error: 'Message not found' });
    res.json({ success: true, message: `Message updated to ${status}` });
  });
});

// Delete message
app.delete('/api/messages/:id', (req, res) => {
  db.run('DELETE FROM church_messages WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, error: 'Message not found' });
    res.json({ success: true, message: 'Message deleted successfully' });
  });
});

// Admin dashboard route
app.get(['/', '/admin', '/messages'], (req, res) => {
  res.redirect('/api/messages');
});

app.listen(PORT, () => {
  console.log(`Hima SDA Church Node.js Backend running on http://localhost:${PORT}`);
});
