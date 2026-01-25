---
title: Installation
description: Installation guide for Grant
---

# Installation

This guide covers different installation methods for Grant, from local development to production deployment.

## Prerequisites

Before installing Grant, ensure you have:

- **Node.js** 18+ and **pnpm**
- **PostgreSQL** 14+ (or Docker for containerized setup)
- **Git** for cloning the repository

## Installation Methods

### 1. Local Development Setup

#### Clone the Repository

```bash
git clone https://github.com/logusgraphics/grant.git
cd grant
```

#### Install Dependencies

```bash
pnpm install
```

#### Database Setup

```bash
# Start PostgreSQL with Docker
docker run --name grant-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=grant \
  -p 5432:5432 \
  -d postgres:14

# Set environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/grant"

# Run migrations
pnpm db:migrate

# Seed with sample data
pnpm db:seed
```

#### Start Development Servers

```bash
# Start all services
pnpm dev

# Or start individually
pnpm dev:api    # API server on :4000
pnpm dev:web    # Web app on :3000
```

### 2. Docker Installation

#### Using Docker Compose

```bash
# Clone the repository
git clone https://github.com/logusgraphics/grant.git
cd grant

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec api pnpm db:migrate

# Seed database
docker-compose exec api pnpm db:seed
```

#### Using Individual Containers

```bash
# Start PostgreSQL
docker run --name grant-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=grant \
  -p 5432:5432 \
  -d postgres:14

# Build and run API container
docker build -t grant-api -f apps/api/Dockerfile .
docker run --name grant-api \
  --link grant-postgres:postgres \
  -e DATABASE_URL="postgresql://postgres:password@postgres:5432/grant" \
  -p 4000:4000 \
  -d grant-api

# Build and run Web container
docker build -t grant-web -f apps/web/Dockerfile .
docker run --name grant-web \
  --link grant-api:api \
  -e NEXT_PUBLIC_API_URL="http://api:4000/graphql" \
  -p 3000:3000 \
  -d grant-web
```

### 3. AWS CloudFormation Deployment

#### Prerequisites

- AWS CLI configured with appropriate permissions
- AWS account with CloudFormation access

#### Deploy Infrastructure

```bash
# Launch the CloudFormation stack
aws cloudformation create-stack \
  --stack-name grant \
  --template-body file://infrastructure/cloudformation/main.yaml \
  --parameters file://infrastructure/cloudformation/parameters/prod.json \
  --capabilities CAPABILITY_IAM
```

#### Configure Parameters

The CloudFormation template requires:

- **Database credentials** - PostgreSQL username and password
- **Domain name** - Your custom domain (optional)
- **Environment** - Development, staging, or production
- **Instance sizes** - Based on your expected load

### 4. Package Installation

#### Install Core Package

```bash
npm install @grantjs/core
```

#### Install Database Package

```bash
npm install @grantjs/database
```

#### Install Schema Package

```bash
npm install @grantjs/schema
```

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/grant"

# API Configuration
API_PORT=4000
API_HOST=0.0.0.0
NODE_ENV=development

# Web Configuration
NEXT_PUBLIC_API_URL="http://localhost:4000/graphql"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Authentication
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"

# Optional: External Services
REDIS_URL="redis://localhost:6379"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
```

### Environment Files

Create environment files for different environments:

#### `.env.local` (Local Development)

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/grant"
JWT_SECRET="local-development-secret"
NODE_ENV="development"
```

#### `.env.production` (Production)

```bash
DATABASE_URL="postgresql://user:password@prod-db:5432/grant"
JWT_SECRET="production-secret-key"
NODE_ENV="production"
REDIS_URL="redis://prod-redis:6379"
```

## Verification

### Check Installation

1. **API Health Check**:

   ```bash
   curl http://localhost:4000/health
   ```

2. **GraphQL Playground**:
   Visit `http://localhost:4000/graphql` and run:

   ```graphql
   query {
     __schema {
       types {
         name
       }
     }
   }
   ```

3. **Web Application**:
   Visit `http://localhost:3000` and verify the application loads

### Test Database Connection

```bash
# Connect to database
psql $DATABASE_URL

# Check tables
\dt

# Check sample data
SELECT * FROM users LIMIT 5;
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection string format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

#### Port Conflicts

```bash
# Check if ports are in use
lsof -i :3000
lsof -i :4000
lsof -i :5432

# Kill processes if needed
kill -9 $(lsof -t -i:3000)
```

#### Permission Issues

```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod -R 755 .

# Fix Docker permissions
sudo usermod -aG docker $USER
```

### Logs and Debugging

#### View Application Logs

```bash
# API logs
docker logs grant-api

# Web logs
docker logs grant-web

# Database logs
docker logs grant-postgres
```

#### Enable Debug Mode

```bash
# Set debug environment variable
export DEBUG="grant:*"

# Or in .env file
DEBUG="grant:*"
```

## Next Steps

After successful installation:

1. **[Configuration Guide](/configuration)** - Configure your Grant instance
2. **[Quick Start Guide](/quick-start)** - Get up and running quickly
3. **[Development Guide](/development/guide)** - Learn about development practices
4. **[API Reference](/api/)** - Explore the GraphQL API

## Support

If you encounter issues during installation:

- **GitHub Issues** - [Report bugs and issues](https://github.com/logusgraphics/grant/issues)
- **Discord Community** - [Get help from the community](https://discord.gg/grant)
- **Email Support** - [support@grant.logus.graphics](mailto:support@grant.logus.graphics)

---

**Next:** Learn about [Configuration](/configuration) to customize your Grant installation.
