import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDB } from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize the Database Tables
initDB();

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- API ROUTES ---

/**
 * GET /api/config
 * Retrieve site-wide configurations
 */
app.get('/api/config', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM admin_config').all();
    const config = {};
    rows.forEach(row => {
      config[row.key] = row.value;
    });
    res.json({ success: true, config });
  } catch (err) {
    console.error('Error fetching config:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/deals
 * Retrieve active premium deals
 */
app.get('/api/deals', (req, res) => {
  try {
    const { category, sort, limit = 20, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM active_deals WHERE is_active = 1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    // Sorting logic
    if (sort === 'discount') {
      query += ' ORDER BY discount_percentage DESC';
    } else if (sort === 'price_asc') {
      query += ' ORDER BY discount_price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY discount_price DESC';
    } else if (sort === 'commission') {
      query += ' ORDER BY estimated_commission DESC';
    } else {
      // Default: Sort by calculated custom priority score
      query += ' ORDER BY score DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const deals = db.prepare(query).all(...params);
    res.json({ success: true, count: deals.length, deals });
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * POST /api/subscribe
 * Add or re-activate a subscriber for personalized deals
 */
app.post('/api/subscribe', (req, res) => {
  const { email, phone, name, categories = [], channel = 'email' } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ success: false, error: 'Email or Phone is required.' });
  }

  try {
    // Check if subscriber already exists
    let existing = null;
    if (email) {
      existing = db.prepare('SELECT * FROM alert_subscribers WHERE email = ?').get(email);
    } else if (phone) {
      existing = db.prepare('SELECT * FROM alert_subscribers WHERE phone = ?').get(phone);
    }

    let subscriberId;

    if (existing) {
      subscriberId = existing.id;
      // Re-activate if previously unsubscribed
      db.prepare(`
        UPDATE alert_subscribers 
        SET status = 'active', channel = ?, name = ?, unsubscribed_at = NULL 
        WHERE id = ?
      `).run(channel, name || existing.name, subscriberId);
    } else {
      // Create new subscriber
      subscriberId = 'sub-' + crypto.randomUUID();
      db.prepare(`
        INSERT INTO alert_subscribers (id, email, phone, name, status, channel)
        VALUES (?, ?, ?, ?, 'active', ?)
      `).run(subscriberId, email || null, phone || null, name || null, channel);
    }

    // Update categories (delete existing and rewrite)
    db.prepare('DELETE FROM subscriber_categories WHERE subscriber_id = ?').run(subscriberId);
    
    if (categories.length > 0) {
      const insertCategory = db.prepare('INSERT INTO subscriber_categories (subscriber_id, category) VALUES (?, ?)');
      const transaction = db.transaction((cats) => {
        for (const cat of cats) {
          insertCategory.run(subscriberId, cat);
        }
      });
      transaction(categories);
    }

    res.json({ 
      success: true, 
      message: 'Subscription successful!', 
      subscriberId, 
      status: 'active' 
    });
  } catch (err) {
    console.error('Error subscribing:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * POST /api/unsubscribe
 * Unsubscribe from alerts
 */
app.post('/api/unsubscribe', (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ success: false, error: 'Email or Phone is required to unsubscribe.' });
  }

  try {
    let existing = null;
    if (email) {
      existing = db.prepare('SELECT * FROM alert_subscribers WHERE email = ?').get(email);
    } else if (phone) {
      existing = db.prepare('SELECT * FROM alert_subscribers WHERE phone = ?').get(phone);
    }

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subscriber not found.' });
    }

    db.prepare(`
      UPDATE alert_subscribers 
      SET status = 'unsubscribed', unsubscribed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(existing.id);

    res.json({ success: true, message: 'Successfully unsubscribed.' });
  } catch (err) {
    console.error('Error unsubscribing:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/clicks/track
 * Track outbound affiliate clicks and redirect the user to Amazon
 */
app.get('/api/clicks/track', (req, res) => {
  const { dealId, subscriberId, channel = 'web' } = req.query;

  if (!dealId) {
    return res.status(400).json({ success: false, error: 'dealId is required.' });
  }

  try {
    // Check if the deal exists to get its affiliate link & commission rate
    const deal = db.prepare('SELECT * FROM active_deals WHERE id = ?').get(dealId);
    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found.' });
    }

    // Log the click
    const clickId = 'click-' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO click_logs (id, subscriber_id, deal_id, click_channel, commission_earned)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      clickId, 
      subscriberId || null, 
      dealId, 
      channel, 
      deal.estimated_commission || 0.0
    );

    console.log(`Tracked click ${clickId} for deal ${dealId}. Redirecting to ${deal.affiliate_url}`);

    // Perform HTTP 302 Redirect to the Amazon affiliate link
    res.redirect(302, deal.affiliate_url);
  } catch (err) {
    console.error('Error tracking click:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/stats
 * Administrative dashboard metrics
 */
app.get('/api/stats', (req, res) => {
  try {
    const subscriberCount = db.prepare(`SELECT COUNT(*) as count FROM alert_subscribers WHERE status = 'active'`).get();
    const unsubscribedCount = db.prepare(`SELECT COUNT(*) as count FROM alert_subscribers WHERE status = 'unsubscribed'`).get();
    const clickCount = db.prepare(`SELECT COUNT(*) as count FROM click_logs`).get();
    const commissionStats = db.prepare(`SELECT SUM(commission_earned) as total FROM click_logs`).get();

    // Group clicks by channel
    const clicksByChannel = db.prepare(`
      SELECT click_channel as channel, COUNT(*) as count, SUM(commission_earned) as commission 
      FROM click_logs 
      GROUP BY click_channel
    `).all();

    // Group subscribers by channel type
    const subscribersByChannel = db.prepare(`
      SELECT channel, COUNT(*) as count 
      FROM alert_subscribers 
      WHERE status = 'active'
      GROUP BY channel
    `).all();

    res.json({
      success: true,
      stats: {
        active_subscribers: subscriberCount.count,
        unsubscribed: unsubscribedCount.count,
        total_clicks: clickCount.count,
        total_estimated_commission: commissionStats.total || 0.0,
        clicks_by_channel: clicksByChannel,
        subscribers_by_channel: subscribersByChannel
      }
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// --- SERVE FRONTEND STATIC FILES ---

// Serve React production build from static assets folder
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback all non-API requests to React SPA's index.html
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API Route Not Found' });
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      // If index.html is missing (not built yet), show a friendly message
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>The Mom Drop - API Active</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 50px; background-color: #fff5f5; color: #4a5568; }
            h1 { color: #f56565; margin-bottom: 10px; }
            p { font-size: 1.1em; }
            .status { display: inline-block; padding: 5px 15px; background: #c6f6d5; color: #22543d; border-radius: 20px; font-weight: bold; margin-top: 15px; }
          </style>
        </head>
        <body>
          <h1>🙋‍♀️ The Mom Drop</h1>
          <p>The Express API backend is running perfectly on Port ${PORT}!</p>
          <p>Please build the React frontend or check the API endpoints.</p>
          <div class="status">Backend Status: Online</div>
        </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`The Mom Drop server is listening at http://0.0.0.0:${PORT}`);
});
