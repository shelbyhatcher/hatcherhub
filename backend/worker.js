import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import db, { initDB } from './database.js';
import { sendEmail } from './email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directory structures exist
const LOGS_DIR = path.join(__dirname, 'logs');
const SEO_DIR = path.join(__dirname, 'seo-compiled');
fs.mkdirSync(LOGS_DIR, { recursive: true });
fs.mkdirSync(SEO_DIR, { recursive: true });

// Configurable constants from environment variables
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
const AMAZON_ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || 'shopwitshelby-20';
const ENABLE_SMS = process.env.ENABLE_SMS === 'true'; // defaults to false (Email-only for MVP launch)

console.log(`[WORKER CONFIG] PUBLIC_BASE_URL: ${PUBLIC_BASE_URL}`);
console.log(`[WORKER CONFIG] AMAZON_ASSOCIATE_TAG: ${AMAZON_ASSOCIATE_TAG}`);
console.log(`[WORKER CONFIG] ENABLE_SMS (SMS Dispatch Active): ${ENABLE_SMS}`);

const NOTIFICATIONS_LOG_PATH = path.join(LOGS_DIR, 'notifications.log');

// Brand voice relatable taglines/hooks lookup
const RELATABLE_TAGLINES = {
  'B00BO8B036': 'Let\'s face it, dry lips are a constant parenting accessory. This is the ultimate purse essential. It gives you the hydration of the famous Laneige mask but with a gorgeous tint for when you need to look put together in 2 seconds flat for the school pickup line.',
  'B083F3F7Z1': 'The undisputed gold standard of baby transport. With its buttery-smooth suspension (for navigating cracked suburban sidewalks) and premium leather accents, this stroller drives like a luxury SUV. Getting a genuine 20%+ price drop on this is like finding a unicorn in your backyard!',
  'B09DFH556S': 'Clear plastic organization therapy is real, bestie. Say goodbye to the toy box abyss where Barbie shoes go to die. These are stackable, sturdy, and make your playrooms or closets look like a professional Home Edit board.',
  'B07Y7F7P8B': 'Yes, it\'s an investment. But it curls, shapes, and hides flyaways using air instead of extreme heat. When you can get it for 20% off, you run, not walk. Because your hair deserves some love too!',
  'B01H0A9NPE': 'The sleep savior of parenting. Whether you\'re trying to sleep train your toddler or trying to create a cozy nursery, this customizable sound machine and sunrise alarm is a total life-changer. Soft warm light and soothing white noise to save your sanity.',
  'B08F9N1SKH': 'Say goodbye to the endless parade of single-use plastic bags. These Stasher bags are durable, dishwasher-safe, and perfect for diaper bag snacks (looking at you, goldfish crumbs).',
  'B0GD59QJ7': 'This is literally a spa in a jar. If you are exhausted and your skin is showing it, this melting balm dissolves makeup and leaves your face feeling like silk. It rarely drops in price, but it\'s a steal today.',
  'B07M8DGD6G': 'Finally, a diaper bag that doesn\'t scream "I have spit-up on my shirt." It\'s made of premium water-resistant neoprene, has a slot for your tablet, includes a changing pad, and clips directly to your stroller. Plus, it looks incredibly chic.',
  'B07F19U8F1': '100% leak-proof, crystal-clear Tritan plastic, and they stack perfectly. Say goodbye to the cabinet avalanche of mismatched plastic lids.',
  'B08GD1L9S7': 'The ultimate scent of self-care. It smells like a tropical vacation in a bottle—perfect for spraying on before school run to mask the baby-spitup scent.',
  'B08F9S8FJK': 'If you’re a new mom, sleep is your currency, and anxiety is your shadow. The Owlet tracks your baby’s oxygen, heart rate, and sleep trends, giving you back your peace of mind so you can actually get some rest.',
  'B07M9M8D6S': 'Diaper bag crumbs, spilled Cheerios, dried playdough... parenting is messy. This cordless vacuum is lightweight, ultra-powerful, and has detangling tech for pet and mom-hair. An absolute lifesaver.',
  'B083F8DGD1': 'Premium ultra-lightweight infant car seat with steel-reinforced RELX stability base. Your baby\'s safety is everything, and this car seat provides world-class security and premium comfort for worry-free car rides.',
  'B07Y7N1S9A': 'Stainless steel dual compartment step recycling trash can. Sleek, silent, and fingerprint-proof. Fits perfectly in any modern kitchen and keeps toddler hands out.',
  'B0GD9FJS2': 'If parenting has left you with dark circles and tired skin, this advanced recovery complex is the ultimate overnight hydration serum. Wake up looking like you slept a full 8 hours!'
};

// Premium Products Pool for Deal Simulation
const PREMIUM_PRODUCTS_POOL = [
  {
    asin: 'B00BO8B036',
    title: 'Laneige Lip Sleeping Mask (Berry) - Intense Moisture & Nourishment',
    brand: 'Laneige',
    productName: 'Lip Sleeping Mask (Berry)',
    category: 'luxury-beauty',
    original_price: 24.00,
    rating: 4.7,
    reviews_count: 12400,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/51AALQnQ1OL._SL1000_.jpg',
    affiliate_url: 'https://amzn.to/3XlLaneigeDummy',
    description: 'A leave-on lip balm that delivers intense moisture and antioxidants while you sleep.'
  },
  {
    asin: 'B083F3F7Z1',
    title: 'UPPAbaby VISTA V2 Stroller - Declan (Oat/Chestnut Leather)',
    brand: 'UPPAbaby',
    productName: 'VISTA V2 Stroller',
    category: 'baby-gear',
    original_price: 999.99,
    rating: 4.8,
    reviews_count: 1250,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/71uK-Vv0rJL._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlUppababyDummy',
    description: 'The Vista is designed to grow with your family. It starts as a single stroller and can expand to accommodate up to three children.'
  },
  {
    asin: 'B09DFH556S',
    title: 'Large Clear Plastic Storage Bins with Lids - 6 Pack Organizer',
    brand: 'Storage Bins',
    productName: 'Clear Plastic Organizer Bins with Lids (6-Pack)',
    category: 'home-organization',
    original_price: 45.00,
    rating: 4.5,
    reviews_count: 3400,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/81MclbHkaYL._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlStorageBinsDummy',
    description: 'Stackable clear plastic organization bins perfect for closet, pantry, or nursery storage.'
  },
  {
    asin: 'B07Y7F7P8B',
    title: 'Dyson Airwrap Multi-Styler (Special Edition)',
    brand: 'Dyson',
    productName: 'Airwrap Multi-Styler',
    category: 'luxury-beauty',
    original_price: 599.99,
    rating: 4.4,
    reviews_count: 2100,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/61fW8-3B9UL._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlDysonAirwrap',
    description: 'The Dyson Airwrap is a premium hair styler that curls, shapes, and smooths using air instead of extreme heat.'
  },
  {
    asin: 'B01H0A9NPE',
    title: 'Hatch Baby Rest Sound Machine & Sunrise Alarm Clock',
    brand: 'Hatch',
    productName: 'Baby Rest Sound Machine',
    category: 'baby-gear',
    original_price: 129.99,
    rating: 4.5,
    reviews_count: 8500,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/61NlUvGk2JL._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlHatchRest',
    description: 'A customizable nightlight, sound machine, and time-to-rise sleep trainer in one aesthetic device.'
  },
  {
    asin: 'B08F9N1SKH',
    title: 'Stasher Reusable Silicone Food Grade Storage Bags - 4 Pack',
    brand: 'Stasher',
    productName: 'Reusable Silicone Bags (4-Pack)',
    category: 'home-organization',
    original_price: 54.99,
    rating: 4.7,
    reviews_count: 22000,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/71u96L4rBwL._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlStasherBags',
    description: 'Non-toxic, reusable platinum silicone storage bags that are dishwasher, microwave, and oven safe.'
  },
  {
    asin: 'B0GD59QJ7',
    title: 'Elemis Pro-Collagen Cleansing Balm - Spa in a Jar Cleanser',
    brand: 'Elemis',
    productName: 'Pro-Collagen Cleansing Balm',
    category: 'luxury-beauty',
    original_price: 68.00,
    rating: 4.7,
    reviews_count: 16000,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/61l6-Vv3b3L._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlElemisBalm',
    description: 'A deeply hydrating melting cleanser that dissolves makeup, grime, and environmental pollutants.'
  },
  {
    asin: 'B07M8DGD6G',
    title: 'Dagne Dover Indi Neoprene Diaper Backpack (Large)',
    brand: 'Dagne Dover',
    productName: 'Indi Neoprene Diaper Backpack',
    category: 'baby-gear',
    original_price: 165.00,
    rating: 4.6,
    reviews_count: 800,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/71v1UvCkeqL._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlDagneDoverIndi',
    description: 'The ultimate chic water-resistant neoprene diaper backpack with stroller clips and a changing pad.'
  },
  {
    asin: 'B07F19U8F1',
    title: 'Rubbermaid Brilliance Leak-Proof Food Storage Containers - 14 Piece Set',
    brand: 'Rubbermaid',
    productName: 'Brilliance Leak-Proof Containers (14-Piece Set)',
    category: 'home-organization',
    original_price: 39.99,
    rating: 4.8,
    reviews_count: 72000,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/81I-gI8gPFL._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlRubbermaidBrilliance',
    description: '100% leak-proof airtight Tritan food containers. Crystal clear, stackable, and microwave/dishwasher safe.'
  },
  {
    asin: 'B08GD1L9S7',
    title: 'Sol de Janeiro Cheirosa 68 Beija Flor Perfume Mist',
    brand: 'Sol de Janeiro',
    productName: 'Cheirosa 68 Perfume Mist',
    category: 'luxury-beauty',
    original_price: 38.00,
    rating: 4.6,
    reviews_count: 19500,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/61Nl-X7JL2L._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlSolDeJaneiro68',
    description: 'An immersive pink-floral body mist inspired by Rio’s tropical energy. Light, fresh, and deeply addictive.'
  },
  {
    asin: 'B08F9S8FJK',
    title: 'Owlet Dream Sock Smart Baby Monitor with Oxygen & Heart Rate',
    brand: 'Owlet',
    productName: 'Dream Sock Smart Baby Monitor',
    category: 'baby-gear',
    original_price: 299.00,
    rating: 4.5,
    reviews_count: 3400,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/61E9gPFLN5L._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlOwletDreamSock',
    description: 'Smart baby sock monitor that tracks baby’s sleep, heart rate, and oxygen levels for ultimate peace of mind.'
  },
  {
    asin: 'B07M9M8D6S',
    title: 'Dyson V8 Cordless Vacuum Cleaner (Silver/Yellow)',
    brand: 'Dyson',
    productName: 'V8 Cordless Vacuum Cleaner',
    category: 'home-organization',
    original_price: 469.99,
    rating: 4.5,
    reviews_count: 15000,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/61AALV-v7LL._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlDysonV8Vac',
    description: 'Powerful, lightweight cordless vacuum with detangling motor head. Perfect for quick home cleanup.'
  },
  {
    asin: 'B083F8DGD1',
    title: 'Nuna PIPA RX Infant Car Seat with RELX Base',
    brand: 'Nuna',
    productName: 'PIPA RX Infant Car Seat',
    category: 'baby-gear',
    original_price: 399.99,
    rating: 4.7,
    reviews_count: 450,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/61vL-v0v7LL._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlNunaPipa',
    description: 'Premium ultra-lightweight infant car seat with robust steel-reinforced RELX stability base.'
  },
  {
    asin: 'B07Y7N1S9A',
    title: 'Simplehuman Dual Compartment Rectangular Trash Can Recycler - 58L',
    brand: 'simplehuman',
    productName: 'Dual Compartment Trash Can (58L)',
    category: 'home-organization',
    original_price: 219.99,
    rating: 4.7,
    reviews_count: 9800,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/71X8X-LAL1L._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlSimplehumanTrash',
    description: 'Stainless steel dual compartment step recycling trash can. Sleek, silent, and fingerprint-proof.'
  },
  {
    asin: 'B0GD9FJS2',
    title: 'Estée Lauder Advanced Night Repair Synchronized Recovery Complex',
    brand: 'Estée Lauder',
    productName: 'Advanced Night Repair Serum',
    category: 'luxury-beauty',
    original_price: 115.00,
    rating: 4.6,
    reviews_count: 6500,
    image_url: 'https://images-na.ssl-images-amazon.com/images/I/61NlS7v7LL._SL1500_.jpg',
    affiliate_url: 'https://amzn.to/3XlEsteeLauderANR',
    description: 'The revolutionary deep-penetrating face serum that reduces multiple signs of skin aging dramatically.'
  }
];

// Helper to log notifications to file
function logNotification(type, message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${type}] \n${message}\n----------------------------------------\n`;
  console.log(`[${type}] Dispatching simulated alert...`);
  fs.appendFileSync(NOTIFICATIONS_LOG_PATH, entry);
}

// 1. Core Deal Scanning and Simulation
export function simulateAmazonScan() {
  console.log(`[${new Date().toISOString()}] Starting simulated Amazon deal listing scan...`);

  // Load configuration for commission rates and filter settings
  const configRows = db.prepare('SELECT key, value FROM admin_config').all();
  const config = {};
  configRows.forEach(row => {
    config[row.key] = row.value;
  });

  const minDiscount = parseFloat(config.min_discount_pct || '20');
  const minRating = parseFloat(config.min_rating || '4.0');
  const minReviews = parseInt(config.min_reviews || '100');

  const commissionRates = {
    'luxury-beauty': parseFloat(config.commission_rate_luxury_beauty || '0.10'),
    'baby-gear': parseFloat(config.commission_rate_baby_gear || '0.07'),
    'home-organization': parseFloat(config.commission_rate_home_organization || '0.06')
  };

  // Randomly select 3 to 5 products to "scan"
  const scanCount = Math.floor(Math.random() * (5 - 3 + 1)) + 3;
  const shuffled = [...PREMIUM_PRODUCTS_POOL].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, scanCount);

  selected.forEach(product => {
    // Assign a simulated discount percentage (between 15% and 55%)
    const discountPercentage = Math.floor(Math.random() * (55 - 15 + 1)) + 15;
    const discountPrice = Math.round(product.original_price * (1 - discountPercentage / 100) * 100) / 100;

    // Check criteria filtering (e.g. min 20% off, 4+ stars, 100+ reviews)
    if (discountPercentage >= minDiscount && product.rating >= minRating && product.reviews_count >= minReviews) {
      const commRate = commissionRates[product.category] || 0.05;
      const estimatedCommission = Math.round(discountPrice * commRate * 100) / 100;
      
      // Score = AOV * Commission % * Discount % (discountPrice * commRate * discountPercentage)
      const score = Math.round(discountPrice * commRate * discountPercentage * 100) / 100;

      // Note: The dummy shortlinks in the pool are placeholders. Real production links are constructed 
      // dynamically using full Amazon DP links with the configured AMAZON_ASSOCIATE_TAG.
      const affiliateUrl = `https://www.amazon.com/dp/${product.asin}?tag=${AMAZON_ASSOCIATE_TAG}`;

      // Check if we already have this deal and if the price has dropped further
      const existing = db.prepare('SELECT * FROM active_deals WHERE asin = ?').get(product.asin);
      const isMuchLowerPrice = existing ? (discountPrice < existing.discount_price) : true;
      const originalPrice = product.original_price;

      const randomCoupon = Math.random() > 0.7 ? 'SAVE' + discountPercentage : null;

      // Upsert into active_deals
      const dealId = existing ? existing.id : 'deal-' + crypto.randomUUID();
      db.prepare(`
        INSERT INTO active_deals (
          id, title, category, asin, original_price, discount_price, 
          discount_percentage, rating, reviews_count, affiliate_url, 
          image_url, commission_rate, estimated_commission, score, 
          coupon_code, description, is_active, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, NULL)
        ON CONFLICT(asin) DO UPDATE SET
          discount_price = excluded.discount_price,
          discount_percentage = excluded.discount_percentage,
          estimated_commission = excluded.estimated_commission,
          score = excluded.score,
          coupon_code = excluded.coupon_code,
          is_active = 1,
          expires_at = NULL
      `).run(
        dealId,
        product.title,
        product.category,
        product.asin,
        originalPrice,
        discountPrice,
        discountPercentage,
        product.rating,
        product.reviews_count,
        affiliateUrl,
        product.image_url,
        commRate,
        estimatedCommission,
        score,
        randomCoupon,
        product.description
      );

      console.log(`[DEAL SCANNER] Upserted deal: ${product.title} - ${discountPercentage}% off! Price: $${discountPrice} (Score: ${score})`);

      // 2. Real-Time Alert Dispatching (Twilio SMS / SendGrid Email)
      // Only dispatch alerts if this is a new deal or a significantly lower price drop
      if (isMuchLowerPrice) {
        dispatchAlerts(product, originalPrice, discountPrice, discountPercentage, dealId);
      }
    } else {
      console.log(`[DEAL SCANNER] Filtered out ${product.title} - ${discountPercentage}% off (doesn't meet constraints)`);
    }
  });
}

// 3. Dynamic Copywriting and Dispatch logic for Alerts
function dispatchAlerts(product, originalPrice, discountPrice, discountPercentage, dealId) {
  const brand = product.brand;
  const productName = product.productName;
  const tagline = RELATABLE_TAGLINES[product.asin] || 'A perfect addition to your parenting toolkit.';
  const savings = Math.round((originalPrice - discountPrice) * 100) / 100;

  // Retrieve active subscribers interested in this category
  const subscribers = db.prepare(`
    SELECT s.id, s.email, s.phone, s.name, s.channel 
    FROM alert_subscribers s
    JOIN subscriber_categories c ON s.id = c.subscriber_id
    WHERE c.category = ? AND s.status = 'active'
  `).all(product.category);

  if (subscribers.length === 0) {
    return;
  }

  // Check if it qualifies as a HIGH-URGENCY FLASH DROP (>40% off)
  const isFlashDrop = discountPercentage >= 40;

  subscribers.forEach(sub => {
    const trackerUrl = `${PUBLIC_BASE_URL}/api/clicks/track?dealId=${dealId}&subscriberId=${sub.id}&channel=${sub.channel}`;
    
    if (sub.channel === 'sms' && sub.phone) {
      if (!ENABLE_SMS) {
        logNotification('SMS_DISABLED_STUB', `To: ${sub.phone} (${sub.name || 'Bestie'}) - [SMS DISPATCH DISABLED FOR MVP] Real-time alerts are Email-only for launch. Email address registered: ${sub.email || 'None'}`);
        return;
      }
      let smsBody = '';
      if (isFlashDrop) {
        smsBody = `FLASH DROP! ⚡ OMG bestie, the ${brand} ${productName} is ${discountPercentage}% OFF right now! Down from ${originalPrice} to ${discountPrice} (${savings} savings!).\n\nThis will sell out fast. RUN: ${trackerUrl}\n\n*Text STOP to opt out.*`;
      } else {
        smsBody = `MOM DROP! 🚨 The ${brand} ${productName} is down to ${discountPrice} (usually ${originalPrice}) on Amazon! 🛒 Perfect styling win.\n\nRated ${product.rating}★ with ${product.reviews_count.toLocaleString()} reviews. Grab it here: ${trackerUrl}\n\n*Text STOP to opt out.*`;
      }
      logNotification('MOCK_TWILIO_SMS', `To: ${sub.phone} (${sub.name || 'Bestie'})\nMessage: ${smsBody}`);
    } 
    
    else if (sub.channel === 'email' && sub.email) {
      let emailSubject = '';
      let emailBodyHtml = '';

      if (isFlashDrop) {
        emailSubject = `FLASH DROP: ${brand} is ${savings} OFF! (Run, don\'t walk) ⚡`;
        emailBodyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #fff5f5; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; border: 1px solid #ffe6e2;">
    <h1 style="color: #FF6F61; font-size: 22px; margin-top: 0;">⚡ FLASH DROP: THIS WILL SELL OUT FAST!</h1>
    <p style="color: #4a5568; font-size: 14px; line-height: 1.6;">
      Hey ${sub.name || 'bestie'}, put down whatever you are doing. This is not a drill.
    </p>
    <p style="color: #4a5568; font-size: 14px; line-height: 1.6;">
      Our automated tracker just flagged a massive price crash on a parenting favorite.
    </p>
    <h2 style="color: #2B2D42; font-size: 18px;">${brand} ${productName}</h2>
    <p style="font-size: 15px;">
      <span style="text-decoration: line-through; color: #a0aec0;">${originalPrice}</span>
      <span style="color: #FF6F61; font-size: 24px; font-weight: bold;"> ${discountPrice}</span>
      <span style="background: #FF6F61; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${discountPercentage}% OFF</span>
    </p>
    <p style="color: #4a5568; font-size: 13px;">${product.rating}★ (${product.reviews_count.toLocaleString()} reviews)</p>
    <p style="color: #4a5568; font-size: 13px; font-style: italic;">${tagline}</p>
    <a href="${trackerUrl}" style="display: inline-block; background: #FF6F61; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 12px;">Run! Snag this Deal ↗</a>
    <p style="color: #a0aec0; font-size: 11px; margin-top: 20px;">Send this to your Mom Group Chat!</p>
  </div>
</body>
</html>`.trim();
      } else {
        emailSubject = `MOM DROP: ${discountPercentage}% Off ${brand} ${productName}! 🚨`;
        emailBodyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #fff5f5; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; border: 1px solid #ffe6e2;">
    <h1 style="color: #FF6F61; font-size: 22px; margin-top: 0;">Today's Featured Mom Drop! 🚨</h1>
    <p style="color: #4a5568; font-size: 14px; line-height: 1.6;">
      Hey ${sub.name || 'bestie'}! Our 24/7 deal finder just flagged a beauty of a price drop.
    </p>
    <h2 style="color: #2B2D42; font-size: 18px;">${brand} ${productName}</h2>
    <p style="color: #a0aec0; font-size: 12px; text-transform: uppercase;">${product.category.toUpperCase().replace('-', ' ')}</p>
    <p style="font-size: 15px;">
      <span style="text-decoration: line-through; color: #a0aec0;">${originalPrice}</span>
      <span style="color: #FF6F61; font-size: 24px; font-weight: bold;"> ${discountPrice}</span>
      <span style="background: #FF6F61; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${discountPercentage}% OFF</span>
    </p>
    <p style="color: #4a5568; font-size: 13px;">${product.rating}★ (${product.reviews_count.toLocaleString()} reviews)</p>
    <p style="color: #4a5568; font-size: 13px; font-style: italic;">${tagline}</p>
    <a href="${trackerUrl}" style="display: inline-block; background: #FF6F61; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 12px;">Grab this deal on Amazon ↗</a>
    <p style="color: #a0aec0; font-size: 11px; margin-top: 20px;">Send this deal to a mom friend!</p>
  </div>
</body>
</html>`.trim();
      }
      sendEmail({ to: sub.email, subject: emailSubject, html: emailBodyHtml });
    }
  });
}

// 4. Deal Expiration Simulation
export function simulateDealsExpiration() {
  console.log('[EXPIRATION PROCESSOR] Simulating deal expirations (prices returning to normal)...');
  
  // Find active deals that are currently marked as active
  const activeDeals = db.prepare('SELECT * FROM active_deals WHERE is_active = 1').all();

  if (activeDeals.length <= 3) {
    console.log('[EXPIRATION PROCESSOR] Too few active deals, skipping expiration to keep feed populated.');
    return;
  }

  // Randomly expire 1 or 2 deals
  const expireCount = Math.floor(Math.random() * 2) + 1;
  const shuffled = [...activeDeals].sort(() => 0.5 - Math.random());
  const selectedToExpire = shuffled.slice(0, expireCount);

  selectedToExpire.forEach(deal => {
    db.prepare(`
      UPDATE active_deals 
      SET is_active = 0, expires_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(deal.id);
    console.log(`[EXPIRATION PROCESSOR] Expired deal: ${deal.title} (ASIN: ${deal.asin}) has ended.`);
  });
}

// 5. "The Sunday Drop" Compiler
export function compileSundayDrop() {
  console.log('[SUNDAY COMPILER] Compiling "The Sunday Drop" newsletter digest...');

  // Get the top 10 active/highest-scoring deals of the week
  const topDeals = db.prepare(`
    SELECT * FROM active_deals 
    WHERE is_active = 1 
    ORDER BY score DESC 
    LIMIT 10
  `).all();

  if (topDeals.length === 0) {
    console.log('[SUNDAY COMPILER] No active deals found to compile. Skipping.');
    return;
  }

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  let dealsHtml = '';
  topDeals.forEach((deal, idx) => {
    const tagline = RELATABLE_TAGLINES[deal.asin] || 'A perfect choice for busy moms looking to save.';
    dealsHtml += `
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
        <span style="background-color: #FF6F61; color: #ffffff; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
          #${idx + 1} Best Drop: ${deal.discount_percentage}% OFF
        </span>
        <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #2B2D42; font-size: 20px; margin-top: 12px; margin-bottom: 8px;">
          ${deal.title}
        </h2>
        <p style="color: #4A5568; font-size: 14px; line-height: 1.6; margin-bottom: 15px;">
          <strong>Why we love it:</strong> ${tagline}
        </p>
        <div style="border-top: 1px dashed #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="text-decoration: line-through; color: #a0aec0; font-size: 14px; margin-right: 8px;">${deal.original_price}</span>
            <span style="color: #2D3748; font-size: 18px; font-weight: bold;">${deal.discount_price}</span>
          </div>
          <a href="${PUBLIC_BASE_URL}/api/clicks/track?dealId=${deal.id}&channel=sunday-drop" 
             style="background-color: #FF6F61; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            Grab this Deal ↗
          </a>
        </div>
      </div>
    `.trim();
  });

  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>The Sunday Drop — Curated Premium Deals</title>
</head>
<body style="background-color: #f7fafc; padding: 40px 15px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #fffaf0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 2px solid #ffe6e2;">
    <!-- Header -->
    <div style="background-color: #FF6F61; padding: 30px; text-align: center;">
      <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #ffffff; margin: 0; font-size: 32px; font-weight: 900;">
        The Sunday Drop ☕
      </h1>
      <p style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #ffe6e2; margin-top: 8px; margin-bottom: 0; font-size: 16px;">
        Curated Premium Amazon Deals — ${dateStr}
      </p>
    </div>

    <!-- Body Content -->
    <div style="padding: 30px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #2B2D42;">
      <p style="font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 25px;">
        Good morning, bestie. ☕
      </p>
      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
        Grab your coffee (and let’s pray it’s actually hot today), find a quiet corner, and let’s dive into this week's <strong>Sunday Drop</strong>. 
      </p>
      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
        Our deal engine has analyzed thousands of listings, filtering out the noise to bring you the top 10 highest-value active price drops. Rated 4+ stars and fully certified 20%+ off. Enjoy!
      </p>

      <!-- Deals Grid -->
      ${dealsHtml}

      <!-- Referral loop -->
      <div style="background-color: #fff5f5; border: 1px solid #fed7d7; border-radius: 12px; padding: 20px; text-align: center; margin-top: 30px;">
        <h3 style="font-family: 'Playfair Display', Georgia, serif; color: #9b2c2c; margin-top: 0; font-size: 18px;">
          Send this to a Mom Friend! 🎁
        </h3>
        <p style="color: #742a2a; font-size: 14px; line-height: 1.5; margin-bottom: 15px;">
          Enjoying these weekly savings? Don't gatekeep! Share the love with your favorite mom friends. Refer 3 friends and get unlocked onto our VIP alerts.
        </p>
        <a href="${PUBLIC_BASE_URL}/signup" style="color: #FF6F61; font-weight: bold; font-size: 14px; text-decoration: underline;">
          Get Your Referral Link Here ↗
        </a>
      </div>
      
      <!-- Footer -->
      <p style="text-align: center; font-size: 12px; color: #a0aec0; margin-top: 40px; margin-bottom: 0;">
        &copy; 2026 The Mom Drop. All rights reserved. <br/>
        As an Amazon Associate, we earn from qualifying purchases.<br/>
        <a href="${PUBLIC_BASE_URL}/unsubscribe" style="color: #a0aec0; text-decoration: underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const formattedDate = new Date().toISOString().split('T')[0];
  const savePath = path.join(LOGS_DIR, `sunday-drop-${formattedDate}.html`);
  fs.writeFileSync(savePath, fullHtml);
  console.log(`[SUNDAY COMPILER] Sunday Drop digest compiled and written to: ${savePath}`);
}

// 6. Dynamic Daily SEO Roundup Compiler
export function compileDailySeoRoundup() {
  console.log('[SEO COMPILER] Generating Daily SEO roundup post...');

  const topDeals = db.prepare(`
    SELECT * FROM active_deals 
    WHERE is_active = 1 
    ORDER BY score DESC 
    LIMIT 3
  `).all();

  if (topDeals.length === 0) {
    console.log('[SEO COMPILER] No active deals to build SEO assets. Skipping.');
    return;
  }

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const formattedDate = new Date().toISOString().split('T')[0];

  let dealsMarkdown = '';
  topDeals.forEach((deal, idx) => {
    const tagline = RELATABLE_TAGLINES[deal.asin] || 'A favorite brand pick of the week.';
    const trackingUrl = `${PUBLIC_BASE_URL}/api/clicks/track?dealId=${deal.id}&channel=seo-daily`;
    
    dealsMarkdown += `
## ${idx + 1}. Today’s Premium Drop: ${deal.title}
**Category:** ${deal.category.replace('-', ' ').toUpperCase()}  
**Estimated Commission Potential:** ${(deal.commission_rate * 100)}% (Category Top-Tier)

![Product Image](${deal.image_url || ''})

* **Regular Price:** $${deal.original_price}
* **Today's Deal Price:** $${deal.discount_price} *(${deal.discount_percentage}% Off!)*
* **Rating:** ${deal.rating} out of 5 stars (${deal.reviews_count.toLocaleString()} verified reviews)
* **Why it's a Mom Favorite:** ${tagline}

> **Mom-to-Mom Review Hook:** *"I can't imagine parenting without this. Getting it at a ${deal.discount_percentage}% discount is literally the highlight of my week." — Verified Mom Review*

👉 **[Snag ${deal.discount_percentage}% Off on Amazon ↗](${trackingUrl})**

---
`.trim();
  });

  const fullMarkdown = `
# Best Amazon Deals for Moms Today: Only the Premium Stuff (Updated ${dateStr})

**File Path**: \`seo-compiled/daily-${formattedDate}.md\`  
**Target Search Keywords**: \`best amazon deals for moms today\`, \`daily baby deals amazon\`, \`premium baby gear sale\`, \`luxury beauty discounts amazon\`

---

Hey bestie! Welcome back to your daily group chat debrief.

Let's be totally real: Amazon is a goldmine, but searching through 50 pages of plastic junk to find *one* high-quality item is an absolute headache. Who has the time? (Spoiler: None of us).

That’s where we come in. Our 24/7 autonomous deal-finder has been working overtime, filtering out the noise to bring you the **absolute best premium brand drops**. Every single item on this list is **rated 4+ stars, has at least a 20% discount**, and falls into our favorite high-commission categories.

Here are today’s top ${topDeals.length} absolute steals. Grab them before they sell out!

---

${dealsMarkdown}

### 💌 Send This Deal to a Mom Friend!
*Love these savings? Don't gatekeep! Share the love with your mom friends so they can save too!*
  `.trim();

  const savePath = path.join(SEO_DIR, `daily-${formattedDate}.md`);
  fs.writeFileSync(savePath, fullMarkdown);
  console.log(`[SEO COMPILER] Pre-compiled Daily SEO post written to: ${savePath}`);
}

// 7. Dynamic Category Keyword Guides Compiler
export function compileCategoryKeywordGuides() {
  console.log('[SEO COMPILER] Generating category keyword guides...');

  const categories = ['luxury-beauty', 'baby-gear', 'home-organization'];

  const categoryMetadata = {
    'luxury-beauty': {
      title: 'The Ultimate Parent Guide to Luxury Beauty Deals on Amazon',
      keywords: ['amazon luxury beauty deals', 'luxury beauty discounts amazon', 'laneige lip sleeping mask sale', 'elemis cleansing balm discount'],
      intro: 'When parenting exhaustion hits, self-care is not a luxury—it’s a survival mechanism. We track top-tier luxury skincare, cosmetics, and hair accessories that rarely drop in price, prioritizing high-commission 10% categories to make every click count.',
      focus: 'Premium skincare, aesthetic hair stylers, and restorative overnight serums.'
    },
    'baby-gear': {
      title: 'Premium Baby Gear & Stroller Deals: Mom-Approved Amazon Savings',
      keywords: ['premium baby gear sale', 'uppababy stroller deals', 'baby monitor discounts', 'hatch sound machine sale'],
      intro: 'Navigating baby gear can feel like buying a car. We surface deep discounts on high-end strollers, car seats, sleep aids, and safety monitors. High Average Order Value (AOV) items are filtered for perfect ratings so you can shop with absolute peace of mind.',
      focus: 'Multi-stage strollers, secure car seats, and smart nursery savers.'
    },
    'home-organization': {
      title: 'The Neat Pantry & Playroom: Aesthetic Home Organization on Amazon',
      keywords: ['pantry organization containers', 'clear plastic storage bins', 'dyson cordless vacuum discounts', 'aesthetic kitchen storage'],
      intro: 'Parenting comes with a lot of stuff. We find premium, stackable, durable home organization systems and premium cordless vacuums that turn domestic chaos into visual serenity, driven by high-engagement and daily utility items.',
      focus: 'Aesthetic clear bins, reusable storage solutions, and high-performance cleanups.'
    }
  };

  categories.forEach(cat => {
    const meta = categoryMetadata[cat];
    const deals = db.prepare(`
      SELECT * FROM active_deals 
      WHERE is_active = 1 AND category = ?
      ORDER BY score DESC
    `).all(cat);

    let dealsMarkdown = '';
    if (deals.length === 0) {
      dealsMarkdown = '\n*Currently, our deal engine is scanning for new premium price drops in this category. Check back in a few minutes!*\n';
    } else {
      deals.forEach((deal, idx) => {
        const tagline = RELATABLE_TAGLINES[deal.asin] || 'A favorite brand pick of the week.';
        const trackingUrl = `${PUBLIC_BASE_URL}/api/clicks/track?dealId=${deal.id}&channel=seo-${cat}`;
        dealsMarkdown += `
### ${idx + 1}. Featured Drop: ${deal.title}
* **Original Price:** ${deal.original_price}
* **Today's Price:** ${deal.discount_price} **(${deal.discount_percentage}% OFF)**
* **Rating:** ${deal.rating}★ (${deal.reviews_count.toLocaleString()} reviews)
* **Obsession Hook:** ${tagline}

👉 **[Get this Deal on Amazon ↗](${trackingUrl})**

`;
      });
    }

    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const fullMarkdown = `
# ${meta.title}
*Last Updated: ${dateStr}*

**Target Search Keywords**: \`${meta.keywords.join('`, `')}\`
**Compiled Path**: \`seo-compiled/guide-${cat}.md\`

---

${meta.intro}

## Why Modern Parents Love Our Curations
We don't just dump random links. Our autonomous deal finder uses a proprietary priority scoring algorithm to rank items by parent rating, discount depth, and estimated savings. Only products with **4.0+ star ratings and 20%+ off** make the cut.

### Focus Areas in this Category:
* ${meta.focus}

---

## Live Active Drops in this Category Right Now

${dealsMarkdown}

---

### 🚨 Send this to your Mom Group Chat!
*Sharing is caring, bestie! Don't let your friends pay full retail for premium essentials. Forward this guide to your group chat immediately.*
`.trim();

    const savePath = path.join(SEO_DIR, `guide-${cat}.md`);
    fs.writeFileSync(savePath, fullMarkdown);
    console.log(`[SEO COMPILER] Pre-compiled Category Keyword Guide for ${cat} written to: ${savePath}`);
  });
}

// Start Scheduling Wrapper
let scanIntervalId = null;

export function startWorker() {
  console.log('[WORKER] Initializing autonomous background worker scheduler...');

  // 1. Run an immediate scan on boot to populate/update database
  try {
    simulateAmazonScan();
    simulateDealsExpiration();
    compileSundayDrop();
    compileDailySeoRoundup();
    compileCategoryKeywordGuides();
  } catch (err) {
    console.error('[WORKER ERROR] Error running initial worker boot tasks:', err);
  }

  // 2. Set interval to run simulation task every 5 minutes (300000 ms)
  // In development/test mode, we can use a shorter interval (e.g. 5 minutes)
  const INTERVAL_MS = 5 * 60 * 1000;
  scanIntervalId = setInterval(() => {
    try {
      simulateAmazonScan();
      simulateDealsExpiration();
      compileDailySeoRoundup();
      compileCategoryKeywordGuides();

      // Compile Sunday Drop newsletter digest on Sundays
      const today = new Date();
      if (today.getDay() === 0) { // 0 is Sunday
        compileSundayDrop();
      }
    } catch (err) {
      console.error('[WORKER ERROR] Error in background worker loop execution:', err);
    }
  }, INTERVAL_MS);

  console.log(`[WORKER] Autonomous scheduler is running in the background every 5 minutes.`);
}

export function stopWorker() {
  if (scanIntervalId) {
    clearInterval(scanIntervalId);
    console.log('[WORKER] Autonomous background worker scheduler stopped.');
  }
}

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('[WORKER] Running worker standalone execution once...');
  initDB();
  simulateAmazonScan();
  simulateDealsExpiration();
  compileSundayDrop();
  compileDailySeoRoundup();
  compileCategoryKeywordGuides();
  console.log('[WORKER] Standalone run complete. Exiting.');
}
