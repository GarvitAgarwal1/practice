const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Use SQLite as the sole database
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('database.sqlite');
const dbQuery = (sql, params) => db.prepare(sql).all(params || []);
const dbRun = (sql, params) => db.prepare(sql).run(params || []);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
// Prepared statements for SQLite
const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const getSession = db.prepare('SELECT * FROM sessions WHERE session_token = ?');
const insertUser = db.prepare('INSERT INTO users (email, password_hash, salt) VALUES (?, ?, ?)');
const insertSession = db.prepare('INSERT INTO sessions (session_token, user_id) VALUES (?, ?)');
const deleteSession = db.prepare('DELETE FROM sessions WHERE session_token = ?');
const insertMessage = db.prepare('INSERT INTO messages (user_id, name, email, message) VALUES (?, ?, ?, ?)');
// Helper functions for Auth
function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function parseCookies(request) {
    const list = {};
    const rc = request.headers.cookie;
    rc && rc.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    return list;
}

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // Parse body utility
  const readBody = () => new Promise(resolve => {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => resolve(body ? JSON.parse(body) : {}));
  });

  const cookies = parseCookies(req);
  const sessionToken = cookies.session_token;
  let currentUser = null;
    if (sessionToken) {
       try {
           const session = getSession.get(sessionToken);
           if (session) {
               currentUser = getUserById.get(session.user_id);
           }
       } catch (e) { console.error(e); }
   }

  // --- Auth Endpoints ---

  if (req.method === 'POST' && req.url === '/auth/signup') {
      readBody().then(data => {
          const { email, password } = data;
          if (!email || !password) return res.writeHead(400).end(JSON.stringify({ error: 'Email and password required' }));
          
          try {
              const existing = getUserByEmail.get(email);
              if (existing) {
                  return res.writeHead(400).end(JSON.stringify({ error: 'This email is already registered. Please switch to Sign In below.' }));
              }
              const salt = crypto.randomBytes(16).toString('hex');
              const hash = hashPassword(password, salt);
              
              const result = insertUser.run(email, hash, salt);
              const userId = result.lastInsertRowid;
              
              const token = crypto.randomBytes(32).toString('hex');
              insertSession.run(token, userId);
              
              res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Set-Cookie': `session_token=${token}; HttpOnly; Path=/; Max-Age=86400`
              });
              res.end(JSON.stringify({ success: true }));
          } catch (err) {
              res.writeHead(500).end(JSON.stringify({ error: err.message }));
          }
      });
      return;
  }

  if (req.method === 'POST' && req.url === '/auth/login') {
      readBody().then(data => {
          const { email, password } = data;
          if (!email || !password) return res.writeHead(400).end(JSON.stringify({ error: 'Email and password required' }));
          
          try {
              const user = getUserByEmail.get(email);
              if (!user) {
                  return res.writeHead(401).end(JSON.stringify({ error: 'Invalid email or password' }));
              }
              const hash = hashPassword(password, user.salt);
              if (hash !== user.password_hash) {
                  return res.writeHead(401).end(JSON.stringify({ error: 'Invalid email or password' }));
              }
              
              const token = crypto.randomBytes(32).toString('hex');
              insertSession.run(token, user.id);
              
              res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Set-Cookie': `session_token=${token}; HttpOnly; Path=/; Max-Age=86400`
              });
              res.end(JSON.stringify({ success: true }));
          } catch (err) {
              res.writeHead(500).end(JSON.stringify({ error: err.message }));
          }
      });
      return;
  }

  if (req.method === 'POST' && req.url === '/auth/logout') {
      if (sessionToken) {
          try { deleteSession.run(sessionToken); } catch(e){}
      }
      res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `session_token=; HttpOnly; Path=/; Max-Age=0`
      });
      res.end(JSON.stringify({ success: true }));
      return;
  }

   if (req.method === 'GET' && req.url === '/auth/me') {
       if (currentUser) {
           res.writeHead(200, { 'Content-Type': 'application/json' });
           res.end(JSON.stringify({ user: { email: currentUser.email, id: currentUser.id } }));
       } else {
           res.writeHead(200, { 'Content-Type': 'application/json' });
           res.end(JSON.stringify({ user: null }));
       }
       return;
   }

  // --- Form Submission ---

  if (req.method === 'POST' && req.url === '/submit') {
      if (!currentUser) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'You must be logged in to submit a message.' }));
      }

      readBody().then(data => {
          try {
              insertMessage.run(currentUser.id, data.name, currentUser.email, data.message);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Form Submitted Successfully' }));
          } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
          }
      });
      return;
  }

  // --- Serve Static Files ---
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if(error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
