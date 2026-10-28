#!/usr/bin/env bash
# Unpacks the web Lambda bundle and starts it the way Lambda runs it (run.sh), so a package the zip misses fails here
# rather than in production; the e2e suite runs the standalone folder, never the zip. Run from the repository root.
set -euo pipefail

dir=$(mktemp -d)
unzip -q apps/web/.next/lambda.zip -d "$dir"

cd "$dir"
PORT=3999 HOSTNAME=127.0.0.1 node apps/web/server.js > server.log 2>&1 &
server=$!
trap 'kill $server 2> /dev/null || true' EXIT

for _ in $(seq 1 30); do
    if curl -sf http://127.0.0.1:3999/robots.txt > /dev/null; then
        echo 'The web bundle starts and answers'
        exit 0
    fi

    sleep 1
done

cat server.log
exit 1
