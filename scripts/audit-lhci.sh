#!/bin/bash
set -e

echo "Building site..."
npm run build

echo ""
echo "Running Lighthouse CI audit..."
npx lhci autorun

echo ""
read -p "Open report in browser? (y/n) " answer
[ "$answer" = "y" ] && npx lhci open
