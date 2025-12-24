#!/bin/bash

echo "=== Starting Development Mode ==="

# Run server in watch mode
echo "Starting server watch mode..."
cd packages/server && npm run dev &
SERVER_PID=$!

# Run extension in watch mode
echo "Starting extension watch mode..."
cd packages/extension && npm run watch &
EXTENSION_PID=$!

echo "✓ Development mode started"
echo "Server PID: $SERVER_PID"
echo "Extension PID: $EXTENSION_PID"
echo "Press Ctrl+C to stop"

wait

