#!/bin/bash

# Campaign Manager Startup Script

echo "🚀 Starting Campaign Manager..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   On macOS: brew services start mongodb-community"
    echo "   On Ubuntu: sudo systemctl start mongod"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ Please update .env file with your configuration before running again."
    exit 1
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

# Build frontend
echo "🔨 Building frontend..."
cd client
npm run build
cd ..

# Start the application
echo "🎯 Starting Campaign Manager server..."
echo "   Backend: http://localhost:5000"
echo "   Frontend: http://localhost:3000 (if running in dev mode)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
