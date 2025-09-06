#!/bin/bash

# Campaign Manager Startup Script (SQLite Version)

echo "🚀 Starting Campaign Manager with SQLite..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. You can modify it if needed."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd client
    npm install
    cd ..
fi

# Install SQLite dependencies
echo "📦 Installing SQLite dependencies..."
npm install better-sqlite3 sqlite3

# Build frontend
echo "🔨 Building frontend..."
cd client
npm run build
cd ..

# Start the application with SQLite
echo "🎯 Starting Campaign Manager server with SQLite..."
echo "   Backend: http://localhost:5000"
echo "   Database: SQLite (campaign-manager.db)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

node server-sqlite.js
