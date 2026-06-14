import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const DB_PATH = '/home/team/shared/app.db';

// Ensure the database file's directory exists
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Define Schema
export function initDB() {
  console.log('Initializing application database schema...');

  // 1. admin_config
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. active_deals
  db.exec(`
    CREATE TABLE IF NOT EXISTS active_deals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      asin TEXT UNIQUE NOT NULL,
      original_price REAL NOT NULL,
      discount_price REAL NOT NULL,
      discount_percentage REAL NOT NULL,
      rating REAL NOT NULL,
      reviews_count INTEGER NOT NULL,
      affiliate_url TEXT NOT NULL,
      image_url TEXT,
      commission_rate REAL NOT NULL,
      estimated_commission REAL NOT NULL,
      score REAL NOT NULL,
      coupon_code TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    );
  `);

  // Indexing for active_deals for quick querying
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_active_deals_category ON active_deals (category);
    CREATE INDEX IF NOT EXISTS idx_active_deals_is_active ON active_deals (is_active);
    CREATE INDEX IF NOT EXISTS idx_active_deals_score ON active_deals (score DESC);
  `);

  // 3. alert_subscribers
  db.exec(`
    CREATE TABLE IF NOT EXISTS alert_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      channel TEXT NOT NULL DEFAULT 'email',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      unsubscribed_at DATETIME
    );
  `);

  // 4. subscriber_categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriber_categories (
      subscriber_id TEXT NOT NULL,
      category TEXT NOT NULL,
      PRIMARY KEY (subscriber_id, category),
      FOREIGN KEY (subscriber_id) REFERENCES alert_subscribers (id) ON DELETE CASCADE
    );
  `);

  // 5. click_logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS click_logs (
      id TEXT PRIMARY KEY,
      subscriber_id TEXT,
      deal_id TEXT NOT NULL,
      click_channel TEXT NOT NULL,
      commission_earned REAL NOT NULL DEFAULT 0.0,
      clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deal_id) REFERENCES active_deals (id) ON DELETE CASCADE,
      FOREIGN KEY (subscriber_id) REFERENCES alert_subscribers (id) ON DELETE SET NULL
    );
  `);

  // Seed default admin config if empty
  const configCount = db.prepare('SELECT COUNT(*) as count FROM admin_config').get();
  if (configCount.count === 0) {
    const insertConfig = db.prepare('INSERT INTO admin_config (key, value) VALUES (?, ?)');
    insertConfig.run('site_name', 'The Mom Drop');
    insertConfig.run('tagline', 'The ultimate autonomous deal-finder for modern parents.');
    insertConfig.run('min_discount_pct', '20');
    insertConfig.run('min_rating', '4.0');
    insertConfig.run('min_reviews', '100');
    insertConfig.run('commission_rate_luxury_beauty', '0.10');
    insertConfig.run('commission_rate_baby_gear', '0.07');
    insertConfig.run('commission_rate_home_organization', '0.06');
    console.log('Seeded default admin configuration.');
  }

  // Seed dummy deals if empty
  const dealsCount = db.prepare('SELECT COUNT(*) as count FROM active_deals').get();
  if (dealsCount.count === 0) {
    const insertDeal = db.prepare(`
      INSERT INTO active_deals (
        id, title, category, asin, original_price, discount_price, 
        discount_percentage, rating, reviews_count, affiliate_url, 
        image_url, commission_rate, estimated_commission, score, 
        coupon_code, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. Luxury Beauty Deal (10% commission)
    insertDeal.run(
      'deal-1',
      'Laneige Lip Sleeping Mask (Berry) - Intense Moisture & Nourishment',
      'luxury-beauty',
      'B00BO8B036',
      24.00,
      18.00,
      25.0,
      4.7,
      12400,
      'https://amzn.to/3XlLaneigeDummy',
      'https://images-na.ssl-images-amazon.com/images/I/51AALQnQ1OL._SL1000_.jpg',
      0.10,
      1.80,
      9.4, // Score: discount % * rating / 100 or some custom formula
      null,
      'A leave-on lip mask that delivers intense moisture and antioxidants while you sleep.'
    );

    // 2. High-end Baby Gear Deal (7% commission)
    insertDeal.run(
      'deal-2',
      'UPPAbaby VISTA V2 Stroller - Declan (Oat/Chestnut Leather)',
      'baby-gear',
      'B083F3F7Z1',
      999.99,
      799.99,
      20.0,
      4.8,
      1250,
      'https://amzn.to/3XlUppababyDummy',
      'https://images-na.ssl-images-amazon.com/images/I/71uK-Vv0rJL._SL1500_.jpg',
      0.07,
      56.00, // 7% of 799.99
      112.0, // Extremely high commission score
      null,
      'The Vista is designed to grow with your family. It starts as a single stroller and can expand to accommodate up to three children.'
    );

    // 3. Home Organization Deal (6% commission)
    insertDeal.run(
      'deal-3',
      'Large Clear Plastic Storage Bins with Lids - 6 Pack Organizer',
      'home-organization',
      'B09DFH556S',
      45.00,
      31.50,
      30.0,
      4.5,
      3400,
      'https://amzn.to/3XlStorageBinsDummy',
      'https://images-na.ssl-images-amazon.com/images/I/81MclbHkaYL._SL1500_.jpg',
      0.06,
      1.89,
      7.5,
      'SAVE30',
      'Stackable clear plastic organization bins perfect for closet, pantry, or nursery storage.'
    );

    console.log('Seeded initial premium dummy deals.');
  }

  console.log('Database initialization complete.');
}

export default db;
