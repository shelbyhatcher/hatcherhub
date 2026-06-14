/**
 * TrendCatcher Blog Server — v4 (Affiliate Link Router Edition)
 * ==============================================================
 * Changes from v3:
 *   1. Integrated affiliate_link_router.js for category → network mapping
 *   2. All posts now have real affiliate links (not '#' placeholders)
 *   3. GET /go/:linkId — redirect endpoint with click tracking
 *   4. POST /api/publish — auto-routes affiliate links on new posts
 *   5. GET /api/affiliate/stats — commission and click analytics
 *   6. Retrofit support: loads retrofitted_posts.json if present
 */

'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = require('./affiliate_link_router');

const app  = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Constants ────────────────────────────────────────────────────────────
const PINTEREST_VERIFICATION = process.env.PINTEREST_VERIFY || 'YOUR_PINTEREST_CODE';
const GOOGLE_VERIFICATION    = process.env.GOOGLE_VERIFY    || 'YOUR_GOOGLE_CODE';
const SITE_URL               = process.env.SITE_URL         || 'https://trendcatcher.com';

// ─── Affiliate Click Tracking Store ──────────────────────────────────────
// In production, persist to SQLite / Redis. For now, in-memory with daily summary.
const clickLog = [];  // { linkId, network, postSlug, category, ts }

// ─── Redirect Table ───────────────────────────────────────────────────────
// Maps /go/:linkId → real destination URL.
// Built dynamically from posts; retrofitted_posts.json overrides defaults.
const redirectTable = {};

// ─── Seed Posts ───────────────────────────────────────────────────────────
// Base post data — affiliateLinks populated by router below.
let posts = [
  { id:'vs-1',  category:'beauty',      title:'Viral Scalp Massager: Why Everyone Is Buying This',  slug:'viral-scalp-massager',                 published:'2026-06-13', excerpt:'50K+ views in 6 hours. The scalp massager trend is exploding on TikTok.', content:'TikTok can\'t stop talking about this scalp massager...', tags:['scalp-massager','beauty-tools','tiktok-viral'], priceRange:'$10-$25', keyword:'scalp massager' },
  { id:'hg-1',  category:'home-goods',  title:'5 Viral Kitchen Gadgets Trending on TikTok',         slug:'viral-kitchen-gadgets-tiktok',           published:'2026-06-10', excerpt:'TikTok can\'t stop talking about these kitchen gadgets.', content:'TikTok has become the #1 product discovery platform...', tags:['kitchen','tiktok-viral','gadgets'], priceRange:'$15-$60', keyword:'viral kitchen gadgets' },
  { id:'hg-2',  category:'home-goods',  title:'Best Home Organization Products Under $50',           slug:'best-home-organization-under-50',        published:'2026-06-08', excerpt:'Organization content is booming on Pinterest.', content:'Home organization is one of the fastest-growing categories...', tags:['organization','home-decor','budget'], priceRange:'$10-$50', keyword:'home organization products' },
  { id:'hg-3',  category:'home-goods',  title:'The Air Fryer Accessory Trend',                      slug:'air-fryer-accessories-worth-buying',     published:'2026-06-05', excerpt:'Air fryer accessories dominating social media.', content:'Air fryer content has generated over 5 billion views...', tags:['kitchen','air-fryer','trending'], priceRange:'$8-$35', keyword:'air fryer accessories' },
  { id:'be-1',  category:'beauty',      title:'Skincare Devices Going Viral on Instagram Reels',    slug:'viral-skincare-devices-instagram',       published:'2026-06-11', excerpt:'LED masks and microcurrent devices trending.', content:'Instagram Reels has become the launchpad for beauty device trends...', tags:['skincare','beauty-devices','instagram-viral'], priceRange:'$20-$400', keyword:'skincare devices LED mask' },
  { id:'be-2',  category:'beauty',      title:'Drugstore Beauty Products That Went Viral',          slug:'viral-drugstore-beauty-products',        published:'2026-06-07', excerpt:'Drugstore products taking over TikTok.', content:'Drugstore beauty is having a moment on TikTok...', tags:['beauty','drugstore','budget-beauty'], priceRange:'$5-$25', keyword:'viral drugstore beauty' },
  { id:'be-3',  category:'beauty',      title:'Hair Care Tools Trending on TikTok',                 slug:'viral-hair-care-tools',                 published:'2026-06-03', excerpt:'Heatless curlers and scalp massagers trending.', content:'Hair care content on TikTok has grown 300% year-over-year...', tags:['hair','beauty-tools','trending'], priceRange:'$10-$60', keyword:'heatless curlers hair tools' },
  { id:'el-1',  category:'electronics', title:'Desk Accessories Trending on Reddit',                slug:'viral-desk-accessories',                published:'2026-06-09', excerpt:'Reddit r/desksetup driving desk accessory boom.', content:'The work-from-home revolution created a massive market...', tags:['desk-setup','tech','reddit-viral'], priceRange:'$15-$200', keyword:'desk accessories setup' },
  { id:'el-2',  category:'electronics', title:'Best Budget Earbuds Under $50',                      slug:'best-budget-earbuds-under-50',          published:'2026-06-06', excerpt:'Reddit buzzing about budget earbuds.', content:'Budget earbuds are one of the most discussed categories on Reddit...', tags:['earbuds','audio','budget-tech'], priceRange:'$20-$50', keyword:'budget earbuds under 50' },
  { id:'el-3',  category:'electronics', title:'Phone Accessories That Go Viral',                   slug:'viral-phone-accessories',               published:'2026-06-04', excerpt:'Phone accessories generate millions of impressions.', content:'Phone accessories are consistently among the most-shared products...', tags:['phone','accessories','trending'], priceRange:'$5-$40', keyword:'viral phone accessories' },
  { id:'tn-1',  category:'trending',    title:'TrendCatcher Weekly Roundup: June Week 2',           slug:'trending-weekly-roundup-june-2026-w2',  published:'2026-06-12', excerpt:'AI detected 12 emerging product trends this week.', content:'This week\'s TrendCatcher signals showed strong activity...', tags:['roundup','weekly','trending-now'], priceRange:'$10-$200', keyword:'trending viral products 2026' },
  { id:'vs-2',  category:'home-goods',  title:'Trending Now: Home Products This Week',              slug:'home-products-trending-this-week',       published:'2026-06-13', excerpt:'CVS engine detected 3 new home trends.', content:'Trend detection signals show rising interest in home products...', tags:['home','trending-now','weekly'], priceRange:'$15-$100', keyword:'trending home products' },
];

// ─── Route Affiliate Links for All Posts ─────────────────────────────────
function applyAffiliateRouter(postList) {
  return postList.map(p => {
    const result = router.buildCloakedLinks(p.category, p.keyword || p.title, p.slug);
    const affiliateLinks = {};
    for (const [netKey, url] of Object.entries(result.allLinks)) {
      const linkId = `${p.slug}-${netKey}`;
      affiliateLinks[netKey] = `/go/${linkId}`;
      redirectTable[linkId] = { url, network: netKey, postSlug: p.slug, category: p.category };
    }
    return {
      ...p,
      affiliateLinks,
      affiliatePrimary: result.primary,
      affiliateMeta: result.linkMeta,
    };
  });
}

// Load retrofitted overrides if the retrofit script has been run
const retrofittedPath = path.join(__dirname, 'retrofitted_posts.json');
if (fs.existsSync(retrofittedPath)) {
  try {
    const retrofitted = JSON.parse(fs.readFileSync(retrofittedPath, 'utf8'));
    // Merge keyword from retrofit data into posts before re-routing
    const keywordMap = {};
    retrofitted.forEach(r => { keywordMap[r.slug] = r.keyword; });
    posts = posts.map(p => ({ ...p, keyword: keywordMap[p.slug] || p.keyword }));
    console.log('[AffRouter] Loaded retrofitted_posts.json — applying router...');
  } catch (e) {
    console.warn('[AffRouter] Could not parse retrofitted_posts.json:', e.message);
  }
}

posts = applyAffiliateRouter(posts);
console.log(`[AffRouter] Built redirect table: ${Object.keys(redirectTable).length} entries across ${posts.length} posts`);

// ─── Email Subscribers ────────────────────────────────────────────────────
const subscribers = [];

app.post('/api/subscribe', (req, res) => {
  const { email, source } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'Invalid email' });
  if (subscribers.find(s => s.email === email)) return res.json({ success: true, message: 'Already subscribed' });
  subscribers.push({ email, source: source || 'direct', subscribedAt: new Date().toISOString(), status: 'active' });
  console.log(`[Email] ${email} from ${source}`);
  res.json({ success: true, message: "You're subscribed! Watch for our next viral product alert." });
});

app.get('/api/subscribers', (req, res) => res.json({ total: subscribers.length, subscribers }));

// ─── Affiliate Redirect Endpoint ──────────────────────────────────────────
app.get('/go/:linkId', (req, res) => {
  const linkId  = req.params.linkId;
  const entry   = redirectTable[linkId];

  if (!entry) {
    return res.redirect(302, `https://www.amazon.com/s?k=${encodeURIComponent(linkId)}&tag=shopwitshelby-20`);
  }

  // Log the click
  clickLog.push({
    linkId,
    network:  entry.network,
    postSlug: entry.postSlug,
    category: entry.category,
    ts:       new Date().toISOString(),
    referer:  req.headers['referer'] || 'direct',
    ua:       req.headers['user-agent'] || '',
  });

  console.log(`[Click] ${entry.postSlug} → ${entry.network} (${entry.url.substring(0,60)}...)`);
  res.redirect(302, entry.url);
});

// ─── Publish Endpoint (Auto-Routes Affiliate Links) ───────────────────────
app.post('/api/publish', (req, res) => {
  const { title, category, excerpt, content, tags, priceRange, keyword, slug } = req.body;

  if (!title || !category) {
    return res.status(400).json({ success: false, error: 'title and category are required' });
  }

  const postSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const searchKeyword = keyword || title;
  const postId = `auto-${Date.now()}`;

  // Route affiliate links automatically
  const affResult = router.buildCloakedLinks(category, searchKeyword, postSlug);
  const affiliateLinks = {};
  for (const [netKey, url] of Object.entries(affResult.allLinks)) {
    const linkId = `${postSlug}-${netKey}`;
    affiliateLinks[netKey] = `/go/${linkId}`;
    redirectTable[linkId] = { url, network: netKey, postSlug, category };
  }

  const newPost = {
    id: postId,
    category,
    title,
    slug: postSlug,
    published: new Date().toISOString().split('T')[0],
    excerpt: excerpt || '',
    content: content || '',
    tags: tags || [],
    priceRange: priceRange || 'TBD',
    keyword: searchKeyword,
    affiliateLinks,
    affiliatePrimary: affResult.primary,
    affiliateMeta: affResult.linkMeta,
  };

  posts.unshift(newPost);
  console.log(`[Publish] "${title}" → ${category} | Primary: ${affResult.primary} | ${Object.keys(affiliateLinks).length} affiliate links`);

  res.json({
    success: true,
    post: newPost,
    affiliateRouting: {
      category,
      primary: affResult.primary,
      networksAssigned: Object.keys(affiliateLinks),
      redirectsRegistered: Object.keys(affiliateLinks).length,
    },
  });
});

// ─── Affiliate Analytics Endpoint ─────────────────────────────────────────
app.get('/api/affiliate/stats', (req, res) => {
  // Aggregate click data
  const byNetwork = {};
  const byPost    = {};

  clickLog.forEach(c => {
    byNetwork[c.network] = (byNetwork[c.network] || 0) + 1;
    byPost[c.postSlug]   = (byPost[c.postSlug]   || 0) + 1;
  });

  // Network summary with commission info
  const networkSummary = Object.entries(router.NETWORKS).map(([key, net]) => ({
    network:        key,
    name:           net.name,
    commissionRange: net.commissionRange,
    cookieDays:     net.cookieDays,
    clicks:         byNetwork[key] || 0,
  }));

  // Posts with affiliate coverage
  const postCoverage = posts.map(p => ({
    slug:      p.slug,
    category:  p.category,
    primary:   p.affiliatePrimary,
    networks:  Object.keys(p.affiliateLinks),
    clicks:    byPost[p.slug] || 0,
  }));

  res.json({
    totalClicks:       clickLog.length,
    totalPosts:        posts.length,
    redirectsActive:   Object.keys(redirectTable).length,
    networkSummary,
    postCoverage,
    recentClicks:      clickLog.slice(-20).reverse(),
    categoryMapping:   router.CATEGORY_NETWORK_MAP,
  });
});

// ─── Pinterest API ─────────────────────────────────────────────────────────
const catBoards = {
  'home-goods':  ['Kitchen Gadgets & Tools','Organization & Storage'],
  'beauty':      ['Beauty Finds','Hair Care','Skincare'],
  'electronics': ['Tech Gadgets','Desk Setup'],
  'trending':    ['Trending Products','Viral TikTok'],
};

app.get('/api/pins', (req, res) => {
  const pins = posts.map(p => ({
    post: p.slug, title: p.title, category: p.category,
    pins: [
      { template:'Trending Alert', board:'Viral TikTok Products', title:`⚡ TRENDING: ${p.title}`, desc:`Trending! #${p.tags[0]}`, link:`/post/${p.slug}`, schedule:'now' },
      { template:'Product Roundup', board:(catBoards[p.category]||['Products'])[0], title:`${p.title} 🔥`, desc:p.excerpt, link:`/post/${p.slug}`, schedule:'24h' },
      { template:'Weekly Roundup', board:'Trending Products', title:`📆 ${p.title}`, desc:`Just published!`, link:`/post/${p.slug}`, schedule:'48h' },
    ],
  }));
  res.json({ total: posts.length * 3, pins });
});

// ─── Standard Endpoints ────────────────────────────────────────────────────
app.get('/api/posts', (req, res) => {
  let f = posts;
  if (req.query.category) f = f.filter(p => p.category === req.query.category);
  res.json(f.map(({ content, ...r }) => r));
});

app.get('/api/posts/:slug', (req, res) => {
  const p = posts.find(x => x.slug === req.params.slug);
  p ? res.json(p) : res.status(404).json({ error: 'Not found' });
});

app.get('/api/categories', (req, res) => {
  const cats = [...new Set(posts.map(p => p.category))];
  res.json(cats.map(c => ({ id: c, name: c.replace(/-/g,' & '), count: posts.filter(p => p.category === c).length })));
});

app.get('/api/stats', (req, res) => res.json({
  totalPosts:        posts.length,
  categories:        [...new Set(posts.map(p => p.category))].length,
  affiliateNetworks: Object.keys(router.NETWORKS),
  redirectsActive:   Object.keys(redirectTable).length,
  totalClicks:       clickLog.length,
  subscribers:       subscribers.length,
  pinterest:         { pinsAvailable: posts.length * 3, templates: 8, boards: 10 },
  seo:               { schemaActive: true, sitemapReady: true, canonicalUrls: true, ogTags: true },
  email:             { captureEnabled: true, subscribers: subscribers.length },
  affiliateRouter:   { active: true, version: 'v4', categoryMap: router.CATEGORY_NETWORK_MAP },
}));

// ─── Sitemap ───────────────────────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  const urls = posts.map(p =>
    `<url><loc>${SITE_URL}/post/${p.slug}</loc><lastmod>${p.published}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
  ).join('');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>${urls}</urlset>`);
});

// ─── HTML Engine ───────────────────────────────────────────────────────────
const EMAIL_HTML = `
<div id="tc-banner" style="display:none;position:fixed;top:0;left:0;right:0;z-index:1000;background:linear-gradient(135deg,#1e293b,#0f172a);border-bottom:2px solid #38bdf8;padding:0.75rem 2rem;transform:translateY(-100%);transition:transform 0.5s;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
<div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem">
<div><strong style="color:#38bdf8;font-size:1rem">🔔 Get Viral Products 24h Before They Sell Out</strong><p style="color:#94a3b8;font-size:0.8rem;margin-top:0.15rem">Join creators getting early access to trending products</p></div>
<form class="tc-form" style="display:flex;gap:0.5rem;flex-shrink:0"><input type="email" class="tc-input" placeholder="your@email.com" required style="padding:0.5rem 1rem;border-radius:0.375rem;border:1px solid #334155;background:#0f172a;color:#e2e8f0;min-width:220px;font-size:0.85rem"><button type="submit" class="tc-submit" style="background:#38bdf8;color:#0f172a;padding:0.5rem 1.25rem;border-radius:0.375rem;border:none;font-weight:600;cursor:pointer;font-size:0.85rem;white-space:nowrap">Get Early Access</button></form>
<button onclick="document.getElementById('tc-banner').style.display='none'" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:1.25rem;padding:0.25rem">✕</button>
</div></div>
<div id="tc-exit" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(0,0,0,0.8);align-items:center;justify-content:center">
<div style="background:#1e293b;border:1px solid #38bdf8;border-radius:1rem;padding:2.5rem;max-width:480px;width:90%;text-align:center;position:relative">
<button onclick="document.getElementById('tc-exit').style.display='none'" style="position:absolute;top:1rem;right:1rem;background:none;border:none;color:#64748b;font-size:1.5rem;cursor:pointer">✕</button>
<div style="font-size:3rem;margin-bottom:0.5rem">🎯</div><h3 style="color:#e2e8f0;margin-bottom:0.5rem">Wait! Before You Go...</h3>
<p style="color:#94a3b8;font-size:0.85rem;margin-bottom:1.5rem">Get our <strong style="color:#38bdf8">FREE Viral Product Alert</strong></p>
<form class="tc-form" style="display:flex;flex-direction:column;gap:0.75rem;align-items:center"><input type="email" class="tc-input" placeholder="your@email.com" required style="width:100%;padding:0.75rem 1rem;border-radius:0.375rem;border:1px solid #334155;background:#0f172a;color:#e2e8f0"><button type="submit" class="tc-submit" style="width:100%;background:#38bdf8;color:#0f172a;padding:0.75rem;border-radius:0.375rem;border:none;font-weight:600;cursor:pointer;font-size:1rem">Yes, Send Me Alerts! →</button></form>
<p style="color:#64748b;font-size:0.7rem;margin-top:0.75rem">No spam. Unsubscribe anytime.</p>
</div></div>
<script>
(function(){
document.addEventListener('submit',function(e){var form=e.target.closest('.tc-form');if(!form)return;e.preventDefault();var input=form.querySelector('.tc-input'),email=input.value;if(!email)return;
fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,source:window.location.pathname})}).then(function(r){return r.json()}).then(function(d){if(d.success){localStorage.setItem('tc_sub','1');form.innerHTML='<span style="color:#86efac">✅ '+d.message+'</span>';}}).catch(function(){form.innerHTML='<span style="color:#fca5a5">Error. Try again.</span>';});});
if(!localStorage.getItem('tc_sub')){window.addEventListener('scroll',function(){var b=document.getElementById('tc-banner');if(!b||b.style.display!=='none')return;if(window.scrollY>window.innerHeight*0.3&&!localStorage.getItem('tc_scrolled')){localStorage.setItem('tc_scrolled','1');b.style.display='block';setTimeout(function(){b.style.transform='translateY(0)';},100);}});}
if(!localStorage.getItem('tc_sub')){document.addEventListener('mouseleave',function(e){if(e.clientY>0||localStorage.getItem('tc_exit'))return;localStorage.setItem('tc_exit','1');var pop=document.getElementById('tc-exit');if(pop)pop.style.display='flex';});}
})();
</script>`;

const page = (title, body, meta = {}) => {
  const d = meta.description || 'AI-powered viral product discovery.';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} | TrendCatcher</title>
<meta name="description" content="${d}">
<meta name="google-site-verification" content="${GOOGLE_VERIFICATION}" />
<meta name="p:domain_verify" content="${PINTEREST_VERIFICATION}" />
<link rel="canonical" href="${SITE_URL}${meta.canonical||'/'}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${meta.ogTitle||title}" />
<meta property="og:description" content="${d}" />
<meta property="og:image" content="${SITE_URL}/images/og.jpg" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.6}
nav{background:#1e293b;padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155;flex-wrap:wrap;gap:0.5rem}
nav h1{font-size:1.25rem;font-weight:700;color:#38bdf8}nav a{color:#94a3b8;text-decoration:none;font-size:0.875rem;margin-left:1.5rem}nav a:hover{color:#38bdf8}
.container{max-width:1200px;margin:0 auto;padding:2rem}
.hero{text-align:center;padding:3rem 1rem;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:1rem;margin-bottom:2rem}
.hero h2{font-size:2rem;font-weight:700}.hero p{color:#94a3b8;max-width:600px;margin:0.5rem auto 1.5rem}
.hero .badge{display:inline-block;background:#38bdf8;color:#0f172a;padding:0.25rem 0.75rem;border-radius:999px;font-size:0.75rem;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1.5rem}
.card{background:#1e293b;border-radius:0.75rem;padding:1.5rem;border:1px solid #334155;text-decoration:none;color:inherit}.card:hover{border-color:#38bdf8}
.card .cat{font-size:0.75rem;color:#38bdf8;font-weight:600;text-transform:uppercase}.card h3{font-size:1.125rem;margin:0.5rem 0}.card p{color:#94a3b8;font-size:0.875rem}
.card .meta{display:flex;gap:0.75rem;margin-top:1rem;font-size:0.75rem;color:#64748b}.card .price{background:#334155;padding:0.25rem 0.5rem;border-radius:0.25rem}
.card .primary-net{background:#1e3a5f;color:#38bdf8;padding:0.25rem 0.5rem;border-radius:0.25rem;font-size:0.65rem;font-weight:600}
.footer{text-align:center;padding:2rem;color:#64748b;font-size:0.75rem;border-top:1px solid #334155;margin-top:2rem}
.alert{background:#1e293b;border:1px solid #38bdf8;border-radius:0.5rem;padding:1rem;margin-bottom:1.5rem}.alert strong{color:#38bdf8}
.btn{display:inline-block;background:#38bdf8;color:#0f172a;padding:0.75rem 1.5rem;border-radius:0.5rem;text-decoration:none;font-weight:600;margin-top:1rem}
.aff-btn{padding:0.6rem 1rem;font-size:0.85rem;margin-top:0;border-radius:0.375rem}
.affiliate{margin-top:2rem;padding:1.5rem;background:#1e293b;border-radius:0.75rem;border:1px solid #334155}
.aff-buttons{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem}
.email-card{background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #38bdf8;border-radius:0.75rem;padding:2rem;margin:2rem 0;text-align:center}
.email-card .icon{font-size:2rem;margin-bottom:0.5rem}.email-card h3{color:#e2e8f0;margin-bottom:0.5rem}
.email-card p{color:#94a3b8;font-size:0.85rem;max-width:400px;margin:0 auto 1rem}
.email-card .tc-input{padding:0.6rem 1rem;border-radius:0.375rem;border:1px solid #334155;background:#0f172a;color:#e2e8f0;min-width:280px;font-size:0.85rem}
.email-card .tc-submit{background:#38bdf8;color:#0f172a;padding:0.6rem 1.5rem;border-radius:0.375rem;border:none;font-weight:600;cursor:pointer;font-size:0.85rem}
.network-badge{display:inline-block;font-size:0.65rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:999px;background:#0f2744;color:#38bdf8;margin-left:0.5rem;vertical-align:middle}
</style></head><body>
<nav><h1>🔥 TrendCatcher</h1><div>
<a href="/">Home</a>
<a href="/category/home-goods">Home</a>
<a href="/category/beauty">Beauty</a>
<a href="/category/electronics">Tech</a>
<a href="/api/affiliate/stats">💰 Affiliate</a>
<a href="/api/stats">Status</a>
</div></nav>
<div class="container">${body}</div>
<div class="footer">TrendCatcher | Affiliate Link Router v4 Active | <a href="/api/affiliate/stats" style="color:#64748b">Click Analytics →</a></div>
${EMAIL_HTML}</body></html>`;
};

// ─── HTML Routes ──────────────────────────────────────────────────────────

const NETWORK_COLORS = {
  amazon: '#f59e0b', shareasale: '#10b981', impact: '#6366f1',
  rakuten: '#ef4444', cj: '#3b82f6', refersion: '#8b5cf6', avantlink: '#14b8a6',
};
const NETWORK_LABELS = {
  amazon: '🛒 Amazon', shareasale: '🏪 ShareASale', impact: '⚡ Impact',
  rakuten: '🎌 Rakuten', cj: '💻 CJ Affiliate', refersion: '🔁 Refersion', avantlink: '🏔️ AvantLink',
};

function affiliateButtons(post) {
  return Object.entries(post.affiliateLinks).map(([net, href]) => {
    const color = NETWORK_COLORS[net] || '#38bdf8';
    const label = NETWORK_LABELS[net] || `Shop ${net}`;
    const meta = (post.affiliateMeta || []).find(m => m.network === net) || {};
    return `<a href="${href}" class="btn aff-btn" style="background:${color}" target="_blank" rel="noopener sponsored" data-network="${net}">${label}${meta.commissionRange ? ` <span style="font-size:0.65rem;opacity:0.8">${meta.commissionRange}</span>` : ''}</a>`;
  }).join('');
}

app.get('/', (req, res) => {
  const cards = posts.map(p =>
    `<a href="/post/${p.slug}" class="card">
      <div class="cat">${p.category.replace(/-/g,' & ')}</div>
      <h3>${p.title}</h3>
      <p>${p.excerpt}</p>
      <div class="meta">
        <span>${p.published}</span>
        <span class="price">${p.priceRange}</span>
        <span class="primary-net">${(NETWORK_LABELS[p.affiliatePrimary] || p.affiliatePrimary || '').replace(/^[^\w]+/,'')}</span>
      </div>
    </a>`
  ).join('');
  res.send(page('TrendCatcher — Viral Product Finder',
    `<div class="hero">
      <div class="badge">AI-Powered Trend Detection</div>
      <h2>Products Going Viral Right Now</h2>
      <p>Scanning TikTok, Instagram, Reddit & Pinterest. Auto-routed affiliate links with highest commission networks.</p>
      <a href="/api/affiliate/stats" class="btn" style="margin-right:0.5rem">💰 Affiliate Stats</a>
      <a href="/api/posts" class="btn" style="background:#334155;color:#e2e8f0">View API</a>
    </div>
    <div class="alert"><strong>⚡ AFFILIATE ROUTER ACTIVE:</strong> Every link auto-routes to highest-commission network. <a href="/api/affiliate/stats" style="color:#38bdf8">View stats →</a></div>
    <div class="grid">${cards}</div>`,
    { canonical: '/' }
  ));
});

app.get('/category/:cat', (req, res) => {
  const c = req.params.cat, n = c.replace(/-/g,' & ');
  const cards = posts.filter(p => p.category === c).map(p =>
    `<a href="/post/${p.slug}" class="card">
      <div class="cat">${n}</div><h3>${p.title}</h3><p>${p.excerpt}</p>
      <div class="meta"><span>${p.published}</span><span class="price">${p.priceRange}</span></div>
    </a>`
  ).join('') || '<p>No posts yet.</p>';
  res.send(page(`${n} — TrendCatcher`,
    `<div class="hero" style="padding:1.5rem"><h2>${n}</h2></div><div class="grid">${cards}</div>`,
    { canonical: `/category/${c}` }
  ));
});

app.get('/post/:slug', (req, res) => {
  const p = posts.find(x => x.slug === req.params.slug);
  if (!p) return res.status(404).send(page('Not Found', '<h2>404 — Not Found</h2>'));

  const buttons = affiliateButtons(p);
  const networkNote = p.affiliatePrimary
    ? `<span class="network-badge">Primary: ${NETWORK_LABELS[p.affiliatePrimary] || p.affiliatePrimary}</span>`
    : '';

  res.send(page(p.title,
    `<div class="hero" style="padding:1.5rem;text-align:left">
      <div style="color:#38bdf8;font-weight:600;text-transform:uppercase;font-size:0.75rem">${p.category.replace(/-/g,' & ')}</div>
      <h2>${p.title} ${networkNote}</h2>
      <p style="color:#94a3b8">${p.excerpt}</p>
      <div style="margin-top:1rem">${(p.tags||[]).map(t=>`<span style="background:#334155;padding:0.25rem 0.5rem;border-radius:0.25rem;font-size:0.75rem;margin-right:0.5rem">#${t}</span>`).join('')}</div>
      <div style="margin-top:0.5rem;color:#64748b;font-size:0.75rem">${p.published} | ${p.priceRange}</div>
    </div>
    <div style="background:#1e293b;padding:2rem;border-radius:0.75rem;border:1px solid #334155;margin-bottom:1.5rem">
      <p>${p.content}</p>
    </div>
    <div class="email-card">
      <div class="icon">📬</div>
      <h3>Never Miss a Viral Product Again</h3>
      <p>Our AI detects trending products 24-48 hours before they hit mainstream.</p>
      <form class="tc-form" style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
        <input type="email" class="tc-input" placeholder="your@email.com" required>
        <button type="submit" class="tc-submit">Subscribe Free →</button>
      </form>
      <p style="color:#64748b;font-size:0.7rem;margin-top:0.75rem">No spam. Unsubscribe anytime.</p>
    </div>
    <div class="affiliate">
      <h4>🛒 Best Deals on "${p.keyword || p.title}"</h4>
      <p style="color:#94a3b8;font-size:0.85rem;margin:0.5rem 0 0.75rem">Auto-routed to highest-commission verified retailers. We earn a commission at no extra cost to you.</p>
      <div class="aff-buttons">${buttons}</div>
      <p style="color:#64748b;font-size:0.7rem;margin-top:0.75rem">Commission rates: ${(p.affiliateMeta||[]).map(m=>`${m.displayName||m.network} ${m.commissionRange||''}`).join(' | ')}</p>
    </div>`,
    { description: p.excerpt, canonical: `/post/${p.slug}` }
  ));
});

// ─── Start Server ──────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 TrendCatcher v4 — Affiliate Router Edition`);
  console.log(`   Listening on :${PORT}`);
  console.log(`   Posts: ${posts.length} | Redirects: ${Object.keys(redirectTable).length}`);
  console.log(`   Affiliate networks: ${Object.keys(router.NETWORKS).join(', ')}`);
  console.log(`   Category → Network mapping active\n`);
});
