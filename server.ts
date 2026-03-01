import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize SQLite Database
const db = new Database('database.sqlite');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'pm',
    status TEXT NOT NULL DEFAULT 'pending',
    last_viewed_products_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_viewed_orders_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    picture TEXT,
    keyword TEXT,
    sold_by TEXT,
    asin TEXT,
    link TEXT,
    country TEXT,
    condition TEXT,
    price TEXT,
    commission TEXT,
    limit_count TEXT,
    status TEXT DEFAULT 'enabled',
    added_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    pm_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    review_type TEXT,
    order_picture TEXT,
    summary_picture TEXT,
    review_picture TEXT,
    refund_picture TEXT,
    status TEXT NOT NULL DEFAULT 'ordered',
    admin_notes TEXT,
    buyer_profile_link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(pm_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    text TEXT,
    image TEXT,
    reply_to_id TEXT,
    reply_to_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Add commission column to existing products table if it doesn't exist
try {
  db.exec("ALTER TABLE products ADD COLUMN commission TEXT");
} catch (e) {
  // Column likely already exists
}

try {
  db.exec("ALTER TABLE products ADD COLUMN limit_count TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'enabled'");
} catch (e) {}

// Add new columns to existing orders table if they don't exist
try {
  db.exec("ALTER TABLE orders ADD COLUMN admin_notes TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE orders ADD COLUMN buyer_profile_link TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE orders ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP");
} catch (e) {}

try {
  db.exec("ALTER TABLE messages ADD COLUMN reactions TEXT DEFAULT '{}'");
} catch (e) {}

try {
  db.exec("ALTER TABLE messages ADD COLUMN deleted_for TEXT DEFAULT '[]'");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN last_viewed_products_at DATETIME DEFAULT CURRENT_TIMESTAMP");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN last_viewed_orders_at DATETIME DEFAULT CURRENT_TIMESTAMP");
} catch (e) {}

try {
  db.exec("ALTER TABLE products ADD COLUMN added_by TEXT");
} catch (e) {}

// API Routes

// Settings
app.get('/api/settings', (req, res) => {
  try {
    const stmt = db.prepare('SELECT key, value FROM settings');
    const rows = stmt.all() as { key: string, value: string }[];
    const settings = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/settings', (req, res) => {
  const { settings } = req.body;
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const insertMany = db.transaction((settingsObj) => {
      for (const [key, value] of Object.entries(settingsObj)) {
        stmt.run(key, value as string);
      }
    });
    insertMany(settings);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// User Auth & Management
app.post('/api/signup', (req, res) => {
  const { id, name, email, password, phone } = req.body;
  
  try {
    const checkStmt = db.prepare('SELECT status FROM users WHERE email = ?');
    const existingUser = checkStmt.get(email) as any;
    
    if (existingUser) {
      if (existingUser.status === 'rejected') {
        return res.status(400).json({ error: 'Your registration has been rejected. You cannot sign up again with this email.' });
      } else if (existingUser.status === 'pending') {
        return res.status(400).json({ error: 'Your registration is already pending approval.' });
      } else {
        return res.status(400).json({ error: 'This email is already registered. Try with another email.' });
      }
    }

    const stmt = db.prepare('INSERT INTO users (id, name, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, name, email, password, phone, 'pm', 'pending');
    res.json({ success: true, message: 'Signup successful. Pending admin approval.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  // Hardcoded Main Owner
  if (email === 'alihamzaansari9006@gmail.com' && password === 'alihamza') {
    return res.json({ success: true, user: { id: 'owner', name: 'Main Owner', email, role: 'owner', status: 'approved' } });
  }

  try {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?');
    const user = stmt.get(email, password) as any;
    
    if (user) {
      if (user.status === 'pending') {
        return res.status(403).json({ error: 'Account pending admin approval' });
      }
      if (user.status === 'rejected') {
        return res.status(403).json({ error: 'Your registration has been rejected. You cannot log in.' });
      }
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/users', (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, name, email, phone, role, status, password, created_at FROM users');
    const users = stmt.all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/users/approve', (req, res) => {
  const { id } = req.body;
  try {
    const stmt = db.prepare("UPDATE users SET status = 'approved' WHERE id = ?");
    stmt.run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/users/reject', (req, res) => {
  const { id } = req.body;
  try {
    const stmt = db.prepare("UPDATE users SET status = 'rejected' WHERE id = ?");
    stmt.run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/users/add-admin', (req, res) => {
  const { id, name, email, password, phone } = req.body;
  try {
    const stmt = db.prepare("INSERT INTO users (id, name, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, 'admin', 'approved')");
    stmt.run(id, name || 'Admin', email, password, phone || null);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/users/add-pm', (req, res) => {
  const { id, name, email, password, phone } = req.body;
  try {
    const stmt = db.prepare("INSERT INTO users (id, name, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, 'pm', 'approved')");
    stmt.run(id, name || 'PM', email, password, phone || null);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  if (id === 'owner') {
    return res.json({ id: 'owner', name: 'Main Owner', email: 'alihamzaansari9006@gmail.com', role: 'owner', status: 'approved', last_viewed_products_at: new Date().toISOString(), last_viewed_orders_at: new Date().toISOString() });
  }
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/users/:id/view-products', (req, res) => {
  const { id } = req.params;
  if (id === 'owner') return res.json({ success: true });
  try {
    const stmt = db.prepare("UPDATE users SET last_viewed_products_at = CURRENT_TIMESTAMP WHERE id = ?");
    stmt.run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/users/:id/view-orders', (req, res) => {
  const { id } = req.params;
  if (id === 'owner') return res.json({ success: true });
  try {
    const stmt = db.prepare("UPDATE users SET last_viewed_orders_at = CURRENT_TIMESTAMP WHERE id = ?");
    stmt.run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone, password } = req.body;
  try {
    const updates = [];
    const values = [];
    if (name) { updates.push('name = ?'); values.push(name); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (password) { updates.push('password = ?'); values.push(password); }
    
    if (updates.length > 0) {
      values.push(id);
      const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Products
app.post('/api/products', (req, res) => {
  const { id, picture, keyword, sold_by, asin, link, country, condition, price, commission, limit_count, added_by } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO products (id, picture, keyword, sold_by, asin, link, country, condition, price, commission, limit_count, status, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, picture, keyword, sold_by, asin, link, country, condition, price, commission, limit_count, 'enabled', added_by || null);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { picture, keyword, sold_by, asin, link, country, condition, price, commission, limit_count, status } = req.body;
  try {
    const stmt = db.prepare('UPDATE products SET picture = ?, keyword = ?, sold_by = ?, asin = ?, link = ?, country = ?, condition = ?, price = ?, commission = ?, limit_count = ?, status = ? WHERE id = ?');
    stmt.run(picture, keyword, sold_by, asin, link, country, condition, price, commission, limit_count, status, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/products', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM products ORDER BY created_at DESC');
    const products = stmt.all();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Orders
app.post('/api/orders', (req, res) => {
  const { id, pm_id, order_number, customer_email, review_type, order_picture, summary_picture, buyer_profile_link } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO orders (id, pm_id, order_number, customer_email, review_type, order_picture, summary_picture, status, buyer_profile_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, pm_id, order_number, customer_email, review_type, order_picture, summary_picture, 'ordered', buyer_profile_link);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/orders', (req, res) => {
  const { pm_id } = req.query;
  try {
    let stmt;
    if (pm_id) {
      stmt = db.prepare('SELECT * FROM orders WHERE pm_id = ? ORDER BY created_at DESC');
      res.json(stmt.all(pm_id));
    } else {
      stmt = db.prepare('SELECT orders.*, users.name as pm_name FROM orders LEFT JOIN users ON orders.pm_id = users.id ORDER BY orders.created_at DESC');
      res.json(stmt.all());
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status, review_picture, refund_picture, customer_email, admin_notes, buyer_profile_link } = req.body;
  
  try {
    const updates = [];
    const values = [];
    
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (review_picture !== undefined) { updates.push('review_picture = ?'); values.push(review_picture); }
    if (refund_picture !== undefined) { updates.push('refund_picture = ?'); values.push(refund_picture); }
    if (customer_email !== undefined) { updates.push('customer_email = ?'); values.push(customer_email); }
    if (admin_notes !== undefined) { updates.push('admin_notes = ?'); values.push(admin_notes); }
    if (buyer_profile_link !== undefined) { updates.push('buyer_profile_link = ?'); values.push(buyer_profile_link); }
    
    if (updates.length === 0) return res.json({ success: true });
    
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    const stmt = db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Messages / Chat
app.get('/api/orders/:id/messages', (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare('SELECT * FROM messages WHERE order_id = ? ORDER BY created_at ASC');
    const messages = stmt.all(id);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/orders/:id/messages', (req, res) => {
  const { id } = req.params;
  const { message_id, sender_id, sender_name, sender_role, text, image, reply_to_id, reply_to_text } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO messages (id, order_id, sender_id, sender_name, sender_role, text, image, reply_to_id, reply_to_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(message_id, id, sender_id, sender_name, sender_role, text, image, reply_to_id, reply_to_text);
    
    // Update order's updated_at
    const updateOrderStmt = db.prepare('UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    updateOrderStmt.run(id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/messages/:messageId/react', (req, res) => {
  const { messageId } = req.params;
  const { reaction, userId } = req.body;
  
  try {
    const getStmt = db.prepare('SELECT reactions FROM messages WHERE id = ?');
    const message = getStmt.get(messageId) as any;
    if (!message) return res.status(404).json({ error: 'Message not found' });

    let reactions = JSON.parse(message.reactions || '{}');
    if (reactions[userId] === reaction) {
      delete reactions[userId]; // Toggle off
    } else {
      reactions[userId] = reaction;
    }

    const updateStmt = db.prepare('UPDATE messages SET reactions = ? WHERE id = ?');
    updateStmt.run(JSON.stringify(reactions), messageId);
    
    res.json({ success: true, reactions });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/messages/:messageId', (req, res) => {
  const { messageId } = req.params;
  const { userId, type } = req.body; // type: 'me' or 'everyone'
  
  try {
    if (type === 'everyone') {
      // Just clear the text and image, or mark as deleted for everyone
      const updateStmt = db.prepare('UPDATE messages SET text = ?, image = NULL, deleted_for = ? WHERE id = ?');
      updateStmt.run('This message was deleted', '["everyone"]', messageId);
    } else {
      const getStmt = db.prepare('SELECT deleted_for FROM messages WHERE id = ?');
      const message = getStmt.get(messageId) as any;
      if (!message) return res.status(404).json({ error: 'Message not found' });

      let deletedFor = JSON.parse(message.deleted_for || '[]');
      if (!deletedFor.includes(userId) && !deletedFor.includes('everyone')) {
        deletedFor.push(userId);
      }
      
      const updateStmt = db.prepare('UPDATE messages SET deleted_for = ? WHERE id = ?');
      updateStmt.run(JSON.stringify(deletedFor), messageId);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Gemini AI Image Edit
app.post('/api/ai/edit-image', async (req, res) => {
  const { prompt, imageBase64 } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Extract mime type and base64 data
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid image format' });
    }
    
    const mimeType = matches[1];
    const data = matches[2];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    let editedImageUrl = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        editedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (editedImageUrl) {
      res.json({ success: true, imageUrl: editedImageUrl });
    } else {
      res.status(500).json({ error: 'Failed to generate image' });
    }
  } catch (error: any) {
    console.error('AI Edit Error:', error);
    res.status(500).json({ error: error.message || 'Failed to edit image' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
