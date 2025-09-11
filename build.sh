#!/bin/bash

# Build script for Railway deployment
set -e

echo "🚀 Starting build process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the project root."
    exit 1
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm ci --production=false

# Check if client directory exists
if [ ! -d "client" ]; then
    echo "❌ Error: client directory not found."
    exit 1
fi

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm ci --legacy-peer-deps

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

echo "✅ Build completed successfully!"
echo "📁 Public directory contents:"
ls -la public/
