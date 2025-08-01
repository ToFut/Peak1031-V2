#!/bin/bash

# Peak 1031 V1 Deployment Script
set -e

echo "🚀 Starting Peak 1031 V1 deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy env.example to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Build and start services
echo "🔨 Building and starting services..."

if [ "$1" = "prod" ]; then
    echo "🏭 Deploying to production..."
    docker-compose -f docker-compose.prod.yml up -d --build
else
    echo "🛠️ Deploying to development..."
    docker-compose up -d --build
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec backend npm run migrate

# Seed database if in development
if [ "$1" != "prod" ]; then
    echo "🌱 Seeding database..."
    docker-compose exec backend npm run seed
fi

# Health check
echo "🏥 Performing health checks..."

# Check backend health
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo "   Health Check: http://localhost:5000/health"
echo ""
echo "📝 Next steps:"
echo "   1. Configure your environment variables in .env"
echo "   2. Set up PracticePanther API credentials"
echo "   3. Configure SendGrid and Twilio for notifications"
echo "   4. Set up AWS S3 for document storage"
echo ""
echo "🔧 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart" 