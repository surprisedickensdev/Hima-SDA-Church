#!/usr/bin/env python3
"""
Hima SDA Church - Backend API Server
Handles storing and managing church messages, prayer requests, and contact inquiries.
Built using Python 3 standard library with SQLite database and CORS support.
"""

import sys
import os
import json
import sqlite3
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from datetime import datetime

PORT = int(os.environ.get("PORT", 5000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "church_messages.db")

def init_db():
    """Initialize the SQLite database with the church_messages table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
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
    """)
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class ChurchRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

    def _send_json(self, status_code, data):
        body = json.dumps(data, default=str).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._send_cors_headers()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, status_code, html_content):
        body = html_content.encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self._send_cors_headers()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        # Health check
        if path == "/api/health":
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM church_messages")
            total = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM church_messages WHERE status = 'new'")
            unread = cursor.fetchone()[0]
            conn.close()
            return self._send_json(200, {
                "status": "online",
                "service": "Hima SDA Church API",
                "timestamp": datetime.now().isoformat(),
                "total_messages": total,
                "unread_messages": unread
            })

        # List all messages
        if path == "/api/messages":
            conn = get_db()
            cursor = conn.cursor()
            status_filter = query.get("status", [None])[0]
            search_query = query.get("search", [None])[0]

            sql = "SELECT * FROM church_messages WHERE 1=1"
            params = []

            if status_filter:
                sql += " AND status = ?"
                params.append(status_filter)
            if search_query:
                sql += " AND (full_name LIKE ? OR message LIKE ? OR phone LIKE ? OR subject LIKE ?)"
                term = f"%{search_query}%"
                params.extend([term, term, term, term])

            sql += " ORDER BY id DESC"
            cursor.execute(sql, params)
            rows = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return self._send_json(200, {
                "success": True,
                "count": len(rows),
                "data": rows
            })

        # Get single message
        if path.startswith("/api/messages/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[2].isdigit():
                msg_id = int(parts[2])
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM church_messages WHERE id = ?", (msg_id,))
                row = cursor.fetchone()
                conn.close()
                if row:
                    return self._send_json(200, {"success": True, "data": dict(row)})
                return self._send_json(404, {"success": False, "error": "Message not found"})

        # Admin UI for church leaders
        if path in ["/", "/admin", "/messages"]:
            return self._send_html(200, self._render_admin_html())

        # Unknown route
        return self._send_json(404, {"success": False, "error": f"Endpoint {path} not found"})

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == "/api/messages":
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                return self._send_json(400, {"success": False, "error": "Empty request body"})

            try:
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode("utf-8"))
            except Exception as e:
                return self._send_json(400, {"success": False, "error": f"Invalid JSON payload: {str(e)}"})

            full_name = str(data.get("full_name", "")).strip()
            phone = str(data.get("phone", "")).strip()
            email = str(data.get("email", "")).strip() or None
            subject = str(data.get("subject", "General Church Inquiry")).strip()
            message = str(data.get("message", "")).strip()
            client_ip = self.client_address[0] if self.client_address else None

            # Validation
            if not full_name:
                return self._send_json(400, {"success": False, "error": "Full name is required"})
            if not phone:
                return self._send_json(400, {"success": False, "error": "Phone number is required"})
            if not message:
                return self._send_json(400, {"success": False, "error": "Message content is required"})

            try:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO church_messages (full_name, phone, email, subject, message, status, ip_address)
                    VALUES (?, ?, ?, ?, ?, 'new', ?)
                """, (full_name, phone, email, subject, message, client_ip))
                msg_id = cursor.lastrowid
                conn.commit()

                cursor.execute("SELECT * FROM church_messages WHERE id = ?", (msg_id,))
                new_record = dict(cursor.fetchone())
                conn.close()

                return self._send_json(201, {
                    "success": True,
                    "message": "Thank you. Your message has been sent to Hima SDA Church.",
                    "data": new_record
                })
            except Exception as e:
                return self._send_json(500, {"success": False, "error": f"Database error: {str(e)}"})

        return self._send_json(404, {"success": False, "error": f"Endpoint {path} not found"})

    def do_PATCH(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/messages/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[2].isdigit():
                msg_id = int(parts[2])
                content_length = int(self.headers.get("Content-Length", 0))
                data = {}
                if content_length > 0:
                    try:
                        data = json.loads(self.rfile.read(content_length).decode("utf-8"))
                    except Exception:
                        pass

                new_status = data.get("status", "read")
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("UPDATE church_messages SET status = ? WHERE id = ?", (new_status, msg_id))
                conn.commit()
                updated = cursor.rowcount > 0
                conn.close()

                if updated:
                    return self._send_json(200, {"success": True, "message": f"Message {msg_id} marked as {new_status}"})
                return self._send_json(404, {"success": False, "error": "Message not found"})

        return self._send_json(404, {"success": False, "error": f"Endpoint {path} not found"})

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/messages/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[2].isdigit():
                msg_id = int(parts[2])
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("DELETE FROM church_messages WHERE id = ?", (msg_id,))
                conn.commit()
                deleted = cursor.rowcount > 0
                conn.close()

                if deleted:
                    return self._send_json(200, {"success": True, "message": f"Message {msg_id} deleted successfully"})
                return self._send_json(404, {"success": False, "error": "Message not found"})

        return self._send_json(404, {"success": False, "error": f"Endpoint {path} not found"})

    def _render_admin_html(self):
        return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hima SDA Church - Messages Dashboard</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
  <style>
    :root {
      --primary: #0A2540;
      --secondary: #D97706;
      --bg: #F8FAFC;
      --card: #FFFFFF;
      --text: #1E293B;
      --muted: #64748B;
      --border: #E2E8F0;
      --green: #10B981;
      --red: #EF4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); }
    header { background: var(--primary); color: white; padding: 18px 28px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    header h1 { font-size: 1.3rem; display: flex; align-items: center; gap: 10px; font-weight: 700; }
    header .status-badge { background: #15803D; color: #DCFCE7; font-size: 0.8rem; padding: 4px 12px; border-radius: 999px; font-weight: 600; }
    .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--card); padding: 20px; border-radius: 12px; border: 1px solid var(--border); box-shadow: 0 2px 4px rgba(0,0,0,0.03); }
    .stat-card .num { font-size: 2rem; font-weight: 800; color: var(--primary); }
    .stat-card .label { font-size: 0.85rem; color: var(--muted); margin-top: 4px; }
    .controls { background: var(--card); padding: 18px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap; }
    .search-box { flex: 1; min-width: 250px; position: relative; }
    .search-box input { width: 100%; padding: 10px 14px 10px 38px; border: 1px solid var(--border); border-radius: 8px; font-size: 0.95rem; }
    .search-box i { position: absolute; left: 14px; top: 12px; color: var(--muted); }
    .filter-btn { padding: 9px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); cursor: pointer; font-weight: 600; font-size: 0.88rem; transition: 0.2s; }
    .filter-btn.active, .filter-btn:hover { background: var(--primary); color: white; border-color: var(--primary); }
    .messages-list { display: flex; flex-direction: column; gap: 14px; }
    .message-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 22px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); transition: 0.2s; }
    .message-card.new { border-left: 5px solid var(--secondary); background: #FFFDF8; }
    .message-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .message-title { font-size: 1.15rem; font-weight: 700; color: var(--primary); }
    .message-meta { font-size: 0.85rem; color: var(--muted); display: flex; gap: 16px; margin-top: 6px; flex-wrap: wrap; }
    .message-meta span { display: flex; align-items: center; gap: 5px; }
    .tag { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; padding: 3px 9px; border-radius: 6px; }
    .tag.new { background: #FEF3C7; color: #92400E; }
    .tag.read { background: #E2E8F0; color: #475569; }
    .message-body { font-size: 0.96rem; line-height: 1.6; color: var(--text); background: #F1F5F9; padding: 14px; border-radius: 8px; margin: 12px 0; }
    .message-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .btn-action { padding: 7px 14px; border-radius: 6px; border: none; cursor: pointer; font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; transition: 0.15s; }
    .btn-read { background: #E0E7FF; color: #3730A3; }
    .btn-delete { background: #FEE2E2; color: #991B1B; }
    .btn-read:hover { background: #C7D2FE; }
    .btn-delete:hover { background: #FECACA; }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--muted); background: white; border-radius: 12px; border: 1px solid var(--border); }
  </style>
</head>
<body>
  <header>
    <h1><i class="fa fa-church"></i> Hima SDA Church - Messages Dashboard</h1>
    <span class="status-badge"><i class="fa fa-circle"></i> Server Active</span>
  </header>

  <div class="container">
    <div class="stats-row">
      <div class="stat-card">
        <div class="num" id="stat-total">0</div>
        <div class="label">Total Inquiries Received</div>
      </div>
      <div class="stat-card">
        <div class="num" id="stat-unread" style="color:var(--secondary);">0</div>
        <div class="label">New / Unread Inquiries</div>
      </div>
      <div class="stat-card">
        <div class="num" id="stat-prayer" style="color:var(--green);">0</div>
        <div class="label">Prayer Requests</div>
      </div>
    </div>

    <div class="controls">
      <div class="search-box">
        <i class="fa fa-search"></i>
        <input type="text" id="search-input" placeholder="Search by sender name, phone, subject, or message...">
      </div>
      <button class="filter-btn active" data-filter="all">All Messages</button>
      <button class="filter-btn" data-filter="new">New Only</button>
      <button class="filter-btn" data-filter="read">Read Only</button>
      <button class="filter-btn" id="btn-refresh"><i class="fa fa-refresh"></i> Refresh</button>
    </div>

    <div class="messages-list" id="messages-container">
      <div class="empty-state">Loading messages...</div>
    </div>
  </div>

  <script>
    let currentFilter = 'all';
    let searchQuery = '';

    async function loadMessages() {
      try {
        let url = '/api/messages';
        const params = [];
        if (currentFilter !== 'all') params.push(`status=${encodeURIComponent(currentFilter)}`);
        if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
        if (params.length) url += '?' + params.join('&');

        const res = await fetch(url);
        const data = await res.json();
        renderMessages(data.data || []);

        const healthRes = await fetch('/api/health');
        const health = await healthRes.json();
        document.getElementById('stat-total').textContent = health.total_messages || 0;
        document.getElementById('stat-unread').textContent = health.unread_messages || 0;
      } catch (err) {
        document.getElementById('messages-container').innerHTML =
          `<div class="empty-state" style="color:var(--red);">Error loading messages: ${err.message}</div>`;
      }
    }

    function renderMessages(messages) {
      const container = document.getElementById('messages-container');
      if (!messages || messages.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fa fa-inbox" style="font-size:2.5rem; margin-bottom:12px; display:block;"></i>No messages found.</div>`;
        return;
      }

      let prayerCount = 0;
      container.innerHTML = messages.map(m => {
        if ((m.subject || '').toLowerCase().includes('prayer')) prayerCount++;
        const isNew = m.status === 'new';
        return `
          <div class="message-card ${isNew ? 'new' : ''}" id="msg-${m.id}">
            <div class="message-header">
              <div>
                <div class="message-title">${escapeHtml(m.subject || 'Church Message')}</div>
                <div class="message-meta">
                  <span><i class="fa fa-user"></i> <strong>${escapeHtml(m.full_name)}</strong></span>
                  <span><i class="fa fa-phone"></i> ${escapeHtml(m.phone)}</span>
                  ${m.email ? `<span><i class="fa fa-envelope"></i> ${escapeHtml(m.email)}</span>` : ''}
                  <span><i class="fa fa-clock-o"></i> ${new Date(m.created_at).toLocaleString()}</span>
                </div>
              </div>
              <span class="tag ${isNew ? 'new' : 'read'}">${isNew ? 'NEW' : 'READ'}</span>
            </div>
            <div class="message-body">${escapeHtml(m.message)}</div>
            <div class="message-actions">
              ${isNew ? `<button class="btn-action btn-read" onclick="markStatus(${m.id}, 'read')"><i class="fa fa-check"></i> Mark as Read</button>` : `<button class="btn-action btn-read" onclick="markStatus(${m.id}, 'new')"><i class="fa fa-envelope"></i> Mark as New</button>`}
              <button class="btn-action btn-delete" onclick="deleteMessage(${m.id})"><i class="fa fa-trash"></i> Delete</button>
            </div>
          </div>
        `;
      }).join('');
      document.getElementById('stat-prayer').textContent = prayerCount;
    }

    async function markStatus(id, status) {
      await fetch(`/api/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      loadMessages();
    }

    async function deleteMessage(id) {
      if (!confirm('Are you sure you want to delete this message?')) return;
      await fetch(`/api/messages/${id}`, { method: 'DELETE' });
      loadMessages();
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, s => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[s]));
    }

    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        loadMessages();
      });
    });

    document.getElementById('btn-refresh').addEventListener('click', loadMessages);

    let debounceTimer;
    document.getElementById('search-input').addEventListener('input', e => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = e.target.value.trim();
        loadMessages();
      }, 300);
    });

    loadMessages();
    setInterval(loadMessages, 30000); // auto-poll every 30s
  </script>
</body>
</html>
"""

def run(port=PORT):
    init_db()
    server_address = ("", port)
    try:
        httpd = ThreadedHTTPServer(server_address, ChurchRequestHandler)
        print(f"============================================================")
        print(f" Hima SDA Church Backend Server Running")
        print(f" Local Address:   http://localhost:{port}")
        print(f" Messages API:    http://localhost:{port}/api/messages")
        print(f" Health API:      http://localhost:{port}/api/health")
        print(f" Admin Dashboard: http://localhost:{port}/admin")
        print(f" Database:        {DB_PATH}")
        print(f"============================================================")
        httpd.serve_forever()
    except OSError as e:
        if "Address already in use" in str(e) or e.errno == 10048:
            print(f"Port {port} busy, attempting port {port + 1}...")
            run(port + 1)
        else:
            raise

if __name__ == "__main__":
    run()
