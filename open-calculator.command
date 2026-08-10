#!/bin/zsh
# Double-click to run the Flat-Rate Coupon Calculator.
#
# This serves the page over http://localhost instead of opening the file
# directly. Browsers refuse cross-origin requests from file:// pages no matter
# what the server permits, and this tool reads Pro rates from the Yourgi search
# API. A double-clicked HTML file loads fine and then fails on every search.

cd "$(dirname "$0")" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is not installed on this machine."
  echo "Get it from https://www.python.org/downloads/ then double-click this again."
  echo
  read "?Press return to close."
  exit 1
fi

PORT=8777
while lsof -i ":$PORT" >/dev/null 2>&1; do PORT=$((PORT + 1)); done

echo "Flat-Rate Coupon Calculator"
echo
echo "  Tool:       http://localhost:$PORT/coupon-calculator.html"
echo "  Self-test:  http://localhost:$PORT/coupon-calculator.html?selftest=1"
echo
echo "Leave this window open while you work. Closing it stops the tool."
echo

python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT INT TERM

sleep 1
open "http://localhost:$PORT/coupon-calculator.html"
wait $SERVER
