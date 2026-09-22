#!/bin/zsh
kill -9 1837 3347 2>/dev/null
sleep 1
cd /Users/omkarprathameshpunekar/Projects/skyos || exit 1
rm -rf .next
ulimit -n 10240
echo "Starting SkyOS at http://127.0.0.1:3000 ..."
npx next dev -p 3000 -H 127.0.0.1
