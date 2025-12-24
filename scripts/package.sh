#!/bin/bash

set -e

echo "=== Building MCP Code Review Extension ==="

# Build server
echo "1/3 Building server..."
cd packages/server
npm run build
cd ../..

# Build extension
echo "2/3 Building extension..."
cd packages/extension
npm run build
cd ../..

# Package extension
echo "3/3 Packaging extension..."
cd packages/extension
npm run package
cd ../..

echo "✓ Build complete! VSIX file created in packages/extension/"

