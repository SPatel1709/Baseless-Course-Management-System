#!/bin/bash

# Online Course Management Platform - Run Script
# This script helps you start both backend and frontend servers

echo "================================================"
echo "  Online Course Management Platform"
echo "  Starting Backend and Frontend Servers"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the DBMS Project root directory"
    exit 1
fi

echo "📋 Instructions:"
echo "1. Backend will start in this terminal"
echo "2. Open a NEW terminal and run: cd frontend && npm run dev"
echo ""
echo "🌐 URLs after startup:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "================================================"
echo ""

# Start backend
cd backend
echo "🚀 Starting Backend Server..."
echo "   You will be prompted for SSH password"
echo ""
python -m app.main
