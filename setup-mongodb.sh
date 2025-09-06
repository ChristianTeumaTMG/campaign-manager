#!/bin/bash

echo "🔧 Setting up MongoDB for Campaign Manager..."

# Check if we can install MongoDB locally
if command -v brew &> /dev/null; then
    echo "✅ Homebrew found. Installing MongoDB..."
    brew tap mongodb/brew
    brew install mongodb-community
    brew services start mongodb-community
    echo "✅ MongoDB installed and started!"
elif command -v port &> /dev/null; then
    echo "✅ MacPorts found. Installing MongoDB..."
    sudo port install mongodb
    sudo port load mongodb
    echo "✅ MongoDB installed and started!"
else
    echo "❌ No package manager found. Please install MongoDB manually:"
    echo ""
    echo "Option 1: Install Homebrew first:"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "  Then run: brew install mongodb-community"
    echo ""
    echo "Option 2: Download MongoDB from: https://www.mongodb.com/try/download/community"
    echo ""
    echo "Option 3: Use MongoDB Atlas (cloud):"
    echo "  1. Go to https://www.mongodb.com/atlas"
    echo "  2. Create a free account"
    echo "  3. Create a cluster"
    echo "  4. Get your connection string"
    echo "  5. Update .env file with your connection string"
    echo ""
    echo "Option 4: Use Docker (if installed):"
    echo "  docker run -d -p 27017:27017 --name mongodb mongo:latest"
    exit 1
fi

echo ""
echo "🎯 MongoDB is now running on localhost:27017"
echo "You can now start the Campaign Manager with: ./start.sh"
