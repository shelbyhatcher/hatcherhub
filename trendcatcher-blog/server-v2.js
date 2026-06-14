const express = require('express');
const path = require('path');
const app = express();
const PORT = 5000;
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Verification codes
const PINTEREST_VERIFICATION = 'YOUR_PINTEREST_CODE';
const GOOGLE_VERIFICATION = 'YOUR_GOOGLE_CODE';
const SITE_URL = 'https://trendcatcher.com';

// Seed posts (12 posts across 4 categories)
const posts = [
  { id: 'vs-1', category: 'beauty', title: 'Viral Scalp Massager: Why Everyone Is Buying This', slug: 'viral-scalp-massager', published: '2026-06-13', excerpt: '50K+ views in 6 hours. The scalp massager trend is exploding on TikTok.', content: '...', tags: ['scalp-massager','beauty-tools','tiktok-viral'], priceRange: '$10-$25', affiliateLinks: { amazon: '#', shareasale: '#' } },
  { id: 'hg-1', category: 'home-goods', title: '5 Viral Kitchen Gadgets Trending on TikTok Right Now', slug: 'viral-kitchen-gadgets-tiktok', published: '2026-06-10', excerpt: 'TikTok can\'t stop talking about these kitchen gadgets.', content: '...', tags: ['kitchen','tiktok-viral','gadgets'], priceRange: '$15-$60', affiliateLinks: { amazon: '#', shareasale: '#' } },
  { id: 'hg-2', category: 'home-goods', title: 'Best Home Organization Products Under $50', slug: 'best-home-organization-under-50', published: '2026-06-08', excerpt: 'Organization content is booming on Pinterest.', content: '...', tags: ['organization','home-decor','budget'], priceRange: '$10-$50', affiliateLinks: { amazon: '#', shareasale: '#' } },
  { id: 'hg-3', category: 'home-goods', title: 'The Air Fryer Accessory Trend', slug: 'air-fryer-accessories-worth-buying', published: '2026-06-05', excerpt: 'Air fryer accessories are dominating social media.', content: '...', tags: ['kitchen','air-fryer','trending'], priceRange: '$8-$35', affiliateLinks: { amazon: '#' } },
  { id: 'be-1', category: 'beauty', title: 'Skincare Devices Going Viral on Instagram Reels', slug: 'viral-skincare-devices-instagram', published: '2026-06-11', excerpt: 'LED masks, microcurrent devices, and facial rollers trending.', content: '...', tags: ['skincare','beauty-devices','instagram-viral'], priceRange: '$20-$400', affiliateLinks: { amazon: '#', rakuten: '#' } },
  { id: 'be-2', category: 'beauty', title: 'Drugstore Beauty Products That Went Viral', slug: 'viral-drugstore-beauty-products', published: '2026-06-07', excerpt: 'These drugstore products are taking over TikTok.', content: '...', tags: ['beauty','drugstore','budget-beauty'], priceRange: '$5-$25', affiliateLinks: { amazon: '#', rakuten: '#' } },
  { id: 'be-3', category: 'beauty', title: 'Hair Care Tools Trending on TikTok Right Now', slug: 'viral-hair-care-tools', published: '2026-06-03', excerpt: 'Heatless curlers, scalp massagers trending.', content: '...', tags: ['hair','beauty-tools','trending'], priceRange: '$10-$60', affiliateLinks: { amazon: '#', shareasale: '#' } },
  { id: 'el-1', category: 'electronics', title: 'Desk Accessories Trending on Reddit', slug: 'viral-desk-accessories', published: '2026-06-09', excerpt: 'Reddit r/desksetup is driving a desk accessory boom.', content: '...', tags: ['desk-setup','tech','reddit-viral'], priceRange: '$15-$200', affiliateLinks: { amazon: '#', impact: '#' } },
  { id: 'el-2', category: 'electronics', title: 'Best Budget Earbuds Under $50', slug: 'best-budget-earbuds-under-50', published: '2026-06-06', excerpt: 'Reddit buzzes about these budget earbuds.', content: '...', tags: ['earbuds','audio','budget-tech'], priceRange: '$20-$50', affiliateLinks: { amazon: '#', cj: '#' } },
  { id: 'el-3', category: 'electronics', title: 'Phone Accessories That Go Viral', slug: 'viral-phone-accessories', published: '2026-06-04', excerpt: 'Phone accessories generate millions of impressions.', content: '...', tags: ['phone','accessories','trending'], priceRange: '$5-$40', affiliateLinks: { amazon: '#', impact: '#' } },
  { id: 'tn-1', category: 'trending', title: 'TrendCatcher Weekly Roundup: June Week 2', slug: 'trending-weekly-roundup-june-2026-w2', published: '2026-06-12', excerpt: 'AI detected 12 emerging product trends this week.', content: '...', tags: ['roundup','weekly','trending-now'], priceRange: '$10-$200', affiliateLinks: { amazon: '#', shareasale: '#', impact: '#' } },
  { id: 'vs-2', category: 'home-goods', title: 'Trending Now: Home Products This Week', slug: 'home-products-trending-this-week', published: '2026-06-13', excerpt: 'CVS engine detected 3 new home trends today.', content: '...', tags: ['home','trending-now','weekly'], priceRange: '$15-$100', affiliateLinks: { amazon: '#', shareasale: '#' } },
];

// Pinterest / Pins API
const catBoards = { 'home-goods': ['Kitchen Gadgets & Tools','Organization & Storage'], 'beauty': ['Beauty Finds','Hair Care','Skincare'], 'electronics': ['Tech Gadgets','Desk Setup'], 'trending': ['Trending Products','Viral TikTok'] };

app.get('/api/pins', (req, res) => {
  const pins = posts.map(p => ({
    post: p.slug, title: p.title, category: p.category,
    pins: [
      { template: 'Trending Alert', board: 'Viral TikTok Products', title: `⚡ TRENDING: ${p.title}`, desc: `Trending on social media! #${p.tags[0]}`, link: `/post/${p.slug}`, schedule: 'now' },
      { template: 'Product Roundup', board: catBoards[p.category]?.[0] || 'Products', title: `${p.title} 🔥`, desc: p.excerpt, link: `/post/${p.slug}`, schedule: '24h' },
      { template: 'Weekly Roundup', board: 'Trending Products', title: `📆 ${p.title}`, desc: `Just published!`, link: `/post/${p.slug}`, schedule: '48h' },
    ]
  }));
  res.json({ total: posts.length * 3, pins });
});

app.get('/api/posts', (req, res) => {
  let f = posts;
  if (req.query.category) f = f.filter(p => p.category === req.query.category);
  res.json(f.map(({ content,...r }) => r));
});

app.get('/api/posts/:slug', (req, res) => {
  const p = posts.find(x => x.slug === req.params.slug);
  p ? res.json(p) : res.status(404).json({ error: 'Not found' });
});

app.get('/api/categories', (req, res) => res.json(
  Array.from(new Set(posts.map(p => p.category))).map(c => ({ id: c, name: c.replace('-',' & '), count: posts.filter(x => x.category === c).length }))
));

app.get('/api/stats', (req, res) => res.json({
  totalPosts: posts.length, categories: 4,
  affiliateNetworks: ['Amazon','ShareASale','Impact','Rakuten','CJ'],
  pinterest: { pinsAvailable: posts.length * 3, templates: 8, boards: 10 },
  plugins: { seo: 'RankMath', links: 'Pretty Links', analytics: 'GA4+SC', theme: 'GeneratePress' }
}));

// HTML renderer
const page = (title, body, meta = {}) => `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} | TrendCatcher</title>
<meta name="description" content="${meta.desc || 'AI-powered viral product discovery'}">
<meta name="google-site-verification" content="${GOOGLE_VERIFICATION}" />
<meta name="p:domain_verify" content="${PINTEREST_VERIFICATION}" />
<meta property="og:title" content="${meta.ogTitle || title}" />
<meta property="og:description" content="${meta.desc || ''}" />
<meta property="og:image" content="${SITE_URL}/images/og.jpg" />
<link rel="canonical" href="${SITE_URL}${meta.canonical || '/'}" />
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.6}
nav{background:#1e293b;padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155}
nav h1{font-size:1.25rem;font-weight:700;color:#38bdf8}
nav a{color:#94a3b8;text-decoration:none;font-size:0.875rem;margin-left:1.5rem}
nav a:hover{color:#38bdf8}
.container{max-width:1200px;margin:0 auto;padding:2rem}
.hero{text-align:center;padding:3rem 1rem;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:1rem;margin-bottom:2rem}
.hero h2{font-size:2rem;font-weight:700}
.hero p{color:#94a3b8;max-width:600px;margin:0.5rem auto 1.5rem}
.hero .badge{display:inline-block;background:#38bdf8;color:#0f172a;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.75rem;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1.5rem}
.card{background:#1e293b;border-radius:0.75rem;padding:1.5rem;border:1px solid #334155;text-decoration:none;color:inherit}
.card:hover{border-color:#38bdf8}
.card .cat{font-size:0.75rem;color:#38bdf8;font-weight:600;text-transform:uppercase}
.card h3{font-size:1.125rem;margin:0.5rem 0}
.card p{color:#94a3b8;font-size:0.875rem}
.card .meta{display:flex;gap:0.75rem;margin-top:1rem;font-size:0.75rem;color:#64748b}
.card .price{background:#334155;padding:0.25rem 0.5rem;border-radius:0.25rem}
.footer{text-align:center;padding:2rem;color:#64748b;font-size:0.75rem;border-top:1px solid #334155;margin-top:2rem}
.alert{background:#1e293b;border:1px solid #38bdf8;border-radius:0.5rem;padding:1rem;margin-bottom:1.5rem}
.alert strong{color:#38bdf8}
.btn{display:inline-block;background:#38bdf8;color:#0f172a;padding:0.75rem 1.5rem;border-radius:0.5rem;text-decoration:none;font-weight:600;margin-top:1rem}
.affiliate{margin-top:2rem;padding:1.5rem;background:#1e293b;border-radius:0.75rem;border:1px solid #334155}
.affiliate .btn{background:#f59e0b;margin-right:0.5rem;margin-top:0.5rem}
</style></head><body>
<nav><h1>TrendCatcher</h1><div>
<a href="/">Home</a>
<a href="/category/home-goods">Home</a>
<a href="/category/beauty">Beauty</a>
<a href="/category/electronics">Tech</a>
<a href="/api/pins">Pins</a>
<a href="/api/posts">API</a>
</div></nav>
<div class="container">${body}</div>
<div class="footer">TrendCatcher — Automated Affiliate Content Engine</div></body></html>`;

app.get('/', (req, res) => {
  const cards = posts.map(p => `<a href="/post/${p.slug}" class="card"><div class="cat">${p.category.replace('-',' & ')}</div><h3>${p.title}</h3><p>${p.excerpt}</p><div class="meta"><span>${p.published}</span><span class="price">${p.priceRange}</span></div></a>`).join('');
  res.send(page('TrendCatcher — Viral Product Finder', `<div class="hero"><div class="badge">AI-Powered Trend Detection</div><h2>Products Going Viral Right Now</h2><p>Scanning TikTok, Instagram, Reddit & Pinterest in real-time.</p><a href="/api/posts" class="btn">View All</a></div><div class="alert"><strong>⚡ TRENDING:</strong> Viral Scalp Massager — 50K+ views on TikTok!</div><div class="grid">${cards}</div>`, { desc: 'AI-powered viral product discovery across TikTok, Instagram, Reddit & Pinterest.', canonical: '/' }));
});

app.get('/category/:cat', (req, res) => {
  const cat = req.params.cat, name = cat.replace('-',' & ');
  const cards = posts.filter(p => p.category === cat).map(p => `<a href="/post/${p.slug}" class="card"><div class="cat">${name}</div><h3>${p.title}</h3><p>${p.excerpt}</p><div class="meta"><span>${p.published}</span><span class="price">${p.priceRange}</span></div></a>`).join('') || '<p>No posts yet.</p>';
  res.send(page(`${name} — TrendCatcher`, `<div class="hero" style="padding:1.5rem"><h2>${name}</h2></div><div class="grid">${cards}</div>`, { desc: `AI-powered ${name} product reviews.`, canonical: `/category/${cat}` }));
});

app.get('/post/:slug', (req, res) => {
  const p = posts.find(x => x.slug === req.params.slug);
  if (!p) return res.status(404).send(page('Not Found', '<h2>Not found</h2>'));
  res.send(page(p.title, `<div class="hero" style="padding:1.5rem"><div style="color:#38bdf8;font-weight:600;text-transform:uppercase;font-size:0.75rem">${p.category.replace('-',' & ')}</div><h2>${p.title}</h2><p style="color:#94a3b8">${p.excerpt}</p><div style="margin-top:1rem">${p.tags.map(t => `<span style="background:#334155;padding:0.25rem 0.5rem;border-radius:0.25rem;font-size:0.75rem;margin-right:0.5rem">#${t}</span>`).join('')}</div><div style="margin-top:0.5rem;color:#64748b;font-size:0.75rem">${p.published} | ${p.priceRange}</div></div><div class="affiliate"><h4>🛒 Where to Buy</h4>${Object.entries(p.affiliateLinks).map(([n,u]) => `<a href="${u}" class="btn">Shop ${n}</a>`).join('')}</div>`, { desc: p.excerpt, ogTitle: `${p.title} — ${p.priceRange}`, canonical: `/post/${p.slug}` }));
});

app.listen(PORT, '0.0.0.0', () => console.log(`TrendCatcher v2 running on :${PORT}`));