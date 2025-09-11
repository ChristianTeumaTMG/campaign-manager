#!/bin/bash

# Alternative build script specifically for Railway deployment
set -e

echo "🚀 Starting Railway build process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the project root."
    exit 1
fi

# Completely remove node_modules to avoid cache conflicts
echo "🧹 Removing existing node_modules..."
rm -rf node_modules client/node_modules 2>/dev/null || true

# Clean npm cache
echo "🧹 Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install --production=false --no-optional

# Check if client directory exists
if [ ! -d "client" ]; then
    echo "❌ Error: client directory not found."
    exit 1
fi

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
rm -rf node_modules package-lock.json 2>/dev/null || true
npm install --legacy-peer-deps --no-optional

# Build the React app
echo "🔨 Building React app..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Error: React build failed - build directory not found."
    exit 1
fi

# Go back to root
cd ..

# Clean and copy build files
echo "📁 Copying build files to public directory..."
rm -rf public/*
cp -r client/build/* public/

echo "✅ Railway build completed successfully!"
echo "📁 Public directory contents:"
ls -la public/
