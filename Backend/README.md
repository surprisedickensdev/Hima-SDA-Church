# Hima SDA Church - Backend Server

This backend handles receiving, storing, querying, and managing all church messages, prayer requests, and contact inquiries submitted through the Hima Seventh-day Adventist Church website.

## Features
- **Zero-Dependency Python Server**: Runs immediately using Python's standard library (`http.server`, `sqlite3`, `json`).
- **SQLite Database**: Persistent relational database stored at `church_messages.db`.
- **CORS Support**: Ready for frontend integration across any local or production domain/origin.
- **Church Leadership Admin Dashboard**: Live web interface at `http://localhost:5000/admin` to view, search, filter, and mark messages.
- **Node.js Alternative**: Also includes `server.js` and `package.json` for Express.js users.

---

## Quick Start

### Option 1: Run with Python (Recommended - No install required)
1. Double-click `start_server.bat` or run:
   ```powershell
   python Backend/server.py
   ```
2. The server will start on `http://localhost:5000`.
3. Open `http://localhost:5000/admin` in any browser to see the church messages dashboard.

### Option 2: Run with Node.js
1. Open terminal in the `Backend` directory:
   ```bash
   npm install
   npm start
   ```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/messages` | Submit a new church message / prayer request |
| `GET` | `/api/messages` | Retrieve messages (`?status=new`, `?search=term`) |
| `GET` | `/api/messages/:id` | Get details of a single message |
| `PATCH` | `/api/messages/:id` | Update status (`read`, `new`, `archived`) |
| `DELETE` | `/api/messages/:id` | Delete a message |
| `GET` | `/api/health` | Health check & message counts |
| `GET` | `/admin` | Interactive Church Message Dashboard UI |

### POST `/api/messages` Payload Format
```json
{
  "full_name": "Enoch Mukasa",
  "phone": "+256 772 123456",
  "email": "enoch@example.com",
  "subject": "Prayer Request",
  "message": "Please pray for my family and healing for my mother."
}
```

---

## Frontend Integration
The frontend JavaScript (`code.js`) connects to this backend at:
```javascript
const API_BASE_URL = window.API_BASE_URL || "http://localhost:5000/api";
```
When submitted, the form automatically sends a `POST` request to `/api/messages`. If the backend is temporarily offline, messages are safely cached locally until the server is reachable.
