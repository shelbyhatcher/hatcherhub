#!/bin/bash
# Restart blog server with v2 Pinterest/SEO code
echo "=== TrendCatcher Blog v2 Deployment ==="
echo "Killing old server on port 5000..."
fuser -k 5000/tcp 2>/dev/null
sleep 2
echo "Starting v2 server..."
cd /home/agent-market-researcher/trendcatcher-blog
PORT=5000 nohup node server.js > /tmp/blog-v2.log 2>&1 &
sleep 3
echo "=== Verification ==="
echo "--- Pins API ---"
curl -s http://localhost:5000/api/pins | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Total pins: {d[\"totalPins\"]}')" 2>/dev/null || echo "Server not ready yet"
echo "--- Meta Tags ---"
curl -s http://localhost:5000/ | grep -oE '(p:domain_verify|google-site-verification|canonical)' | sort -u
echo "=== Deployment Complete ==="