#!/usr/bin/env node
/**
 * TrendCatcher Affiliate Link Retrofitter
 * =========================================
 * Retrofits ALL existing posts in server.js (and server-v2.js / server-v4.js)
 * with proper affiliate links routed through the affiliate_link_router.
 *
 * Usage:
 *   node retrofit_affiliate_links.js          # Preview changes (dry run)
 *   node retrofit_affiliate_links.js --apply  # Apply changes to server-v4.js
 *   node retrofit_affiliate_links.js --report # Print detailed commission report
 */

'use strict';

const { routeAffiliateLinks, NETWORKS } = require('./affiliate_link_router');

// ─── Post Registry ──────────────────────────────────────────────────────────
// All existing blog posts with their category and primary search keyword.
// The keyword is what gets passed to the affiliate network search URL.

const POST_REGISTRY = [
  { id: 'vs-1',  slug: 'viral-scalp-massager',                   category: 'beauty',      keyword: 'scalp massager' },
  { id: 'hg-1',  slug: 'viral-kitchen-gadgets-tiktok',           category: 'home-goods',  keyword: 'viral kitchen gadgets' },
  { id: 'hg-2',  slug: 'best-home-organization-under-50',        category: 'home-goods',  keyword: 'home organization products' },
  { id: 'hg-3',  slug: 'air-fryer-accessories-worth-buying',     category: 'home-goods',  keyword: 'air fryer accessories' },
  { id: 'be-1',  slug: 'viral-skincare-devices-instagram',       category: 'beauty',      keyword: 'skincare devices LED mask' },
  { id: 'be-2',  slug: 'viral-drugstore-beauty-products',        category: 'beauty',      keyword: 'viral drugstore beauty' },
  { id: 'be-3',  slug: 'viral-hair-care-tools',                  category: 'beauty',      keyword: 'heatless curlers hair tools' },
  { id: 'el-1',  slug: 'viral-desk-accessories',                 category: 'electronics', keyword: 'desk accessories setup' },
  { id: 'el-2',  slug: 'best-budget-earbuds-under-50',           category: 'electronics', keyword: 'budget earbuds under 50' },
  { id: 'el-3',  slug: 'viral-phone-accessories',                category: 'electronics', keyword: 'viral phone accessories' },
  { id: 'tn-1',  slug: 'trending-weekly-roundup-june-2026-w2',   category: 'trending',    keyword: 'trending viral products 2026' },
  { id: 'vs-2',  slug: 'home-products-trending-this-week',       category: 'home-goods',  keyword: 'trending home products' },
];

// ─── Retrofit Logic ─────────────────────────────────────────────────────────

function retrofitPost(post) {
  const result = routeAffiliateLinks(post.category, post.keyword, post.slug);

  // Build redirect-ready link map (using /go/ cloaked paths)
  const affiliateLinks = {};
  for (const [netKey, url] of Object.entries(result.allLinks)) {
    // Store the final destination URL (server-v4 will serve /go/ redirects)
    affiliateLinks[netKey] = `/go/${post.slug}-${netKey}`;
  }

  return {
    ...post,
    affiliateLinks,
    affiliateMeta: {
      primary: result.primary,
      networks: result.linkMeta.map(l => ({
        key: l.network,
        name: l.displayName,
        commissionRange: l.commissionRange,
        cookieDays: l.cookieDays,
        destinationUrl: l.url,
      })),
    },
  };
}

function runRetrofit(options = {}) {
  const { apply = false, report = false } = options;

  console.log('\n🔄 TrendCatcher Affiliate Link Retrofitter');
  console.log('==========================================');
  console.log(`Mode: ${apply ? 'APPLY (modifying server-v4.js)' : 'DRY RUN (preview only)'}\n`);

  const retrofitted = POST_REGISTRY.map(retrofitPost);
  let totalCommissionMin = 0;
  let totalCommissionMax = 0;

  retrofitted.forEach(post => {
    const primary = post.affiliateMeta.networks[0];
    const [min, max] = primary.commissionRange.replace('%','').split('-').map(Number);
    totalCommissionMin += min;
    totalCommissionMax += max;

    if (report || !apply) {
      console.log(`📄 ${post.slug}`);
      console.log(`   Category: ${post.category} | Keyword: "${post.keyword}"`);
      console.log(`   Primary:  ${primary.name} (${primary.commissionRange}, ${primary.cookieDays}d cookie)`);
      console.log(`   Links:    ${Object.keys(post.affiliateLinks).join(', ')}`);
      post.affiliateMeta.networks.forEach(n => {
        console.log(`   → ${n.name.padEnd(15)} ${n.commissionRange.padEnd(8)} cookie:${n.cookieDays}d  ${n.destinationUrl.substring(0, 80)}...`);
      });
      console.log('');
    }
  });

  console.log(`\n📊 Summary: ${retrofitted.length} posts retrofitted`);
  console.log(`   Commission range across all posts:`);
  console.log(`   Min: ${(totalCommissionMin/retrofitted.length).toFixed(1)}% avg  |  Max: ${(totalCommissionMax/retrofitted.length).toFixed(1)}% avg`);

  // Category breakdown
  const byCategory = {};
  retrofitted.forEach(p => {
    byCategory[p.category] = byCategory[p.category] || [];
    byCategory[p.category].push(p);
  });
  console.log('\n   By Category:');
  for (const [cat, posts] of Object.entries(byCategory)) {
    const primary = posts[0].affiliateMeta.networks[0];
    console.log(`   ${cat.padEnd(15)} → ${primary.name} (${posts.length} posts)`);
  }

  if (apply) {
    // Output the retrofitted post data as a JSON file that server-v4.js can import
    const fs = require('fs');
    const outputPath = __dirname + '/retrofitted_posts.json';
    fs.writeFileSync(outputPath, JSON.stringify(retrofitted, null, 2));
    console.log(`\n✅ Written to: ${outputPath}`);
    console.log('   server-v4.js will load this on startup to apply retrofitted links.');
  } else {
    console.log('\n💡 Run with --apply to write retrofitted_posts.json');
    console.log('   server-v4.js will automatically pick up the changes.\n');
  }

  return retrofitted;
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const applyFlag  = args.includes('--apply');
const reportFlag = args.includes('--report');

runRetrofit({ apply: applyFlag, report: reportFlag });

module.exports = { retrofitPost, runRetrofit, POST_REGISTRY };
