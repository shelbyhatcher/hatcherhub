/**
 * TrendCatcher Affiliate Link Router
 * ====================================
 * Dynamically maps product categories to the highest-commission affiliate network.
 * Generates trackable redirect URLs for every affiliate link.
 *
 * Network Priority by Category (from affiliate_network_research.md):
 *   electronics  → CJ Affiliate (primary)  | Impact (secondary)  | Amazon (fallback)
 *   home-goods   → ShareASale (primary)     | AvantLink (secondary)| Amazon (fallback)
 *   beauty       → Rakuten (primary)        | Refersion (secondary)| Amazon (fallback)
 *   fashion      → Rakuten (primary)        | ShareASale (secondary)| Amazon (fallback)
 *   trending     → ShareASale (primary)     | Impact (secondary)  | Amazon (fallback)
 *   default      → Amazon (universal fallback)
 */

// ─── Network Base URLs & Tracking Parameters ───────────────────────────────
// In production, replace placeholder IDs with real affiliate network IDs.
// These are built as redirect-ready deep links.

const AFFILIATE_ID = {
  amazon:    process.env.AMAZON_TAG      || 'shopwitshelby-20',
  shareasale: process.env.SHAREASALE_ID  || 'TC_SHAREASALE_123',
  impact:    process.env.IMPACT_ID       || 'TC_IMPACT_456',
  rakuten:   process.env.RAKUTEN_ID      || 'TC_RAKUTEN_789',
  cj:        process.env.CJ_ID          || 'TC_CJ_101',
  refersion: process.env.REFERSION_ID   || 'TC_REFERSION_112',
  avantlink: process.env.AVANTLINK_ID   || 'TC_AVANT_131',
};

// Network metadata (commission range, cookie, display name)
const NETWORKS = {
  amazon: {
    name: 'Amazon',
    commissionRange: '1-10%',
    cookieDays: 1,
    buildLink: (keyword, tag) =>
      `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}&tag=${tag}&linkCode=ur2`,
  },
  shareasale: {
    name: 'ShareASale',
    commissionRange: '4-25%',
    cookieDays: 30,
    buildLink: (keyword, id) =>
      `https://www.shareasale.com/r.cfm?b=0&u=${id}&m=0&afftrack=${encodeURIComponent(keyword)}&urllink=`,
  },
  impact: {
    name: 'Impact',
    commissionRange: '2-30%',
    cookieDays: 30,
    buildLink: (keyword, id) =>
      `https://impact.com/partner/${id}?affclickid=tc_${encodeURIComponent(keyword).replace(/%20/g,'_')}`,
  },
  rakuten: {
    name: 'Rakuten',
    commissionRange: '3-20%',
    cookieDays: 14,
    buildLink: (keyword, id) =>
      `https://click.linksynergy.com/deeplink?id=${id}&mid=0&murl=${encodeURIComponent(`https://www.rakuten.com/search?query=${keyword}`)}`,
  },
  cj: {
    name: 'CJ Affiliate',
    commissionRange: '1-20%',
    cookieDays: 30,
    buildLink: (keyword, id) =>
      `https://www.anrdoezrs.net/click-${id}-13940847?url=${encodeURIComponent(`https://www.bestbuy.com/site/searchpage.jsp?st=${keyword}`)}`,
  },
  refersion: {
    name: 'Refersion',
    commissionRange: '5-30%',
    cookieDays: 30,
    buildLink: (keyword, id) =>
      `https://www.refersion.com/l/${id}?subid=${encodeURIComponent(keyword)}`,
  },
  avantlink: {
    name: 'AvantLink',
    commissionRange: '5-20%',
    cookieDays: 30,
    buildLink: (keyword, id) =>
      `https://avantlink.com/link/?ml=${id}&pt=1&alrt=&ctc=${encodeURIComponent(keyword)}`,
  },
};

// ─── Category → Network Priority Map ───────────────────────────────────────
const CATEGORY_NETWORK_MAP = {
  'electronics': ['amazon'],
  'home-goods':  ['amazon'],
  'beauty':      ['amazon'],
  'fashion':     ['amazon'],
  'trending':    ['amazon'],
};

const DEFAULT_NETWORKS = ['amazon'];

// ─── Core Router Function ───────────────────────────────────────────────────

/**
 * Generate affiliate links for a product based on category.
 * Returns an ordered object: { primary, secondary, fallback, allLinks: {...} }
 *
 * @param {string} category   - Post category (e.g. 'electronics', 'beauty')
 * @param {string} keyword    - Product search keyword (e.g. 'scalp massager')
 * @param {string} [postSlug] - Post slug for tracking sub-IDs
 * @returns {Object} affiliateLinks map + metadata
 */
function routeAffiliateLinks(category, keyword, postSlug = '') {
  const networks = CATEGORY_NETWORK_MAP[category] || DEFAULT_NETWORKS;
  const trackingSlug = postSlug || keyword.replace(/\s+/g, '-').toLowerCase();

  const allLinks = {};
  const linkMeta = [];

  for (const netKey of networks) {
    const net = NETWORKS[netKey];
    if (!net) continue;
    const affId = AFFILIATE_ID[netKey];
    const url = net.buildLink(keyword, affId);

    allLinks[netKey] = url;
    linkMeta.push({
      network: netKey,
      displayName: net.name,
      url,
      commissionRange: net.commissionRange,
      cookieDays: net.cookieDays,
    });
  }

  // Always include Amazon as universal fallback if not already present
  if (!allLinks.amazon) {
    allLinks.amazon = NETWORKS.amazon.buildLink(keyword, AFFILIATE_ID.amazon);
    linkMeta.push({
      network: 'amazon',
      displayName: 'Amazon',
      url: allLinks.amazon,
      commissionRange: '1-10%',
      cookieDays: 1,
    });
  }

  return {
    primary: networks[0],
    secondary: networks[1] || 'amazon',
    fallback: 'amazon',
    allLinks,
    linkMeta,
    category,
    keyword,
    trackingSlug,
  };
}

/**
 * Select the single highest-commission link for a product.
 * Used for simplified CTA buttons ("Best Deal →").
 */
function getBestLink(category, keyword, postSlug = '') {
  const result = routeAffiliateLinks(category, keyword, postSlug);
  const primaryKey = result.primary;
  return {
    network: primaryKey,
    displayName: NETWORKS[primaryKey]?.name || 'Amazon',
    url: result.allLinks[primaryKey] || result.allLinks.amazon,
    commissionRange: NETWORKS[primaryKey]?.commissionRange || '1-10%',
  };
}

/**
 * Build a redirect URL for internal tracking via /go/:id endpoint.
 * Creates a short, cloaked link: /go/beauty-scalp-massager-rakuten
 *
 * @param {string} postSlug
 * @param {string} networkKey
 * @returns {string} - Cloaked redirect path
 */
function buildRedirectPath(postSlug, networkKey) {
  return `/go/${postSlug}-${networkKey}`;
}

/**
 * Generate the full set of cloaked redirect paths for a post.
 */
function buildCloakedLinks(category, keyword, postSlug) {
  const result = routeAffiliateLinks(category, keyword, postSlug);
  const cloaked = {};
  for (const [netKey] of Object.entries(result.allLinks)) {
    cloaked[netKey] = buildRedirectPath(postSlug, netKey);
  }
  return { ...result, cloakedLinks: cloaked };
}

// ─── HTML Button Generator ──────────────────────────────────────────────────

/**
 * Generate HTML affiliate button(s) for a post.
 * Uses cloaked /go/ redirect links for click tracking.
 *
 * @param {string} category
 * @param {string} keyword
 * @param {string} postSlug
 * @param {boolean} [showAll=false] - Show all network buttons or just primary
 */
function generateAffiliateHTML(category, keyword, postSlug, showAll = true) {
  const result = buildCloakedLinks(category, keyword, postSlug);
  const { cloakedLinks, linkMeta } = result;

  const NETWORK_COLORS = {
    amazon:     '#f59e0b',
    shareasale: '#10b981',
    impact:     '#6366f1',
    rakuten:    '#ef4444',
    cj:         '#3b82f6',
    refersion:  '#8b5cf6',
    avantlink:  '#14b8a6',
  };

  const NETWORK_LABELS = {
    amazon:     '🛒 Amazon',
    shareasale: '🏪 ShareASale',
    impact:     '⚡ Impact',
    rakuten:    '🎌 Rakuten',
    cj:         '💻 CJ Affiliate',
    refersion:  '🔁 Refersion',
    avantlink:  '🏔️ AvantLink',
  };

  const linksToShow = showAll ? linkMeta : [linkMeta[0]];

  const buttons = linksToShow.map(l => {
    const color = NETWORK_COLORS[l.network] || '#38bdf8';
    const label = NETWORK_LABELS[l.network] || `Shop ${l.displayName}`;
    const href = cloakedLinks[l.network] || l.url;
    return `<a href="${href}" class="btn aff-btn" style="background:${color};margin-right:0.5rem;margin-bottom:0.5rem" target="_blank" rel="noopener sponsored" data-network="${l.network}" data-commission="${l.commissionRange}">${label}</a>`;
  }).join('');

  const disclaimer = `<p style="color:#64748b;font-size:0.75rem;margin-top:0.75rem">We earn a commission when you purchase through our links (at no extra cost to you). Commission rates vary: ${linkMeta.map(l=>`${l.displayName} ${l.commissionRange}`).join(', ')}.</p>`;

  return `<div class="affiliate">
  <h4>🛒 Best Deals on "${keyword}"</h4>
  <p style="color:#94a3b8;font-size:0.85rem;margin:0.5rem 0 0.75rem">Click below to shop — we've linked to the highest-commission verified retailers:</p>
  <div class="aff-buttons">${buttons}</div>
  ${disclaimer}
</div>`;
}

// ─── Exports ────────────────────────────────────────────────────────────────
module.exports = {
  routeAffiliateLinks,
  getBestLink,
  buildRedirectPath,
  buildCloakedLinks,
  generateAffiliateHTML,
  NETWORKS,
  AFFILIATE_ID,
  CATEGORY_NETWORK_MAP,
};
