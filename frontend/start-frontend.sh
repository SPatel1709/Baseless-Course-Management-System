#!/bin/bash

# Online Course Management Platform - Frontend Startup Script

echo "================================================"
echo "  Starting Frontend Development Server"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the frontend directory"
    exit 1
fi

echo "📦 Installing dependencies (if needed)..."
npm install

echo ""
echo "🚀 Starting Next.js Development Server..."
echo ""
echo "🌐 Frontend will be available at: http://localhost:3000"
echo ""
echo "================================================"
echo ""

npm run dev
