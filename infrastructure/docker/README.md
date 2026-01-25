# Grant - Docker Configuration

## Overview

This directory contains Docker configurations for containerizing Grant components.

## Images

- **`web.Dockerfile`** - Next.js frontend container
- **`api.Dockerfile`** - Apollo Server backend container
- **`docker-compose.yml`** - Local development setup

## Building Images

### Web App

```bash
docker build -f infrastructure/docker/web.Dockerfile -t grant-web .
```

### API

```bash
docker build -f infrastructure/docker/api.Dockerfile -t grant-api .
```

## Local Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Production Deployment

Images are automatically built and pushed to ECR during CloudFormation deployment.

### ECR Repositories

- `grant-web` - Frontend container
- `grant-api` - Backend container

## Environment Variables

Required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Environment (production/development)
- `API_URL` - Backend API URL (for web container)
