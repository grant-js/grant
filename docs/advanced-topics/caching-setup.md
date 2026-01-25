# Cache System Setup Guide

This guide provides step-by-step instructions for setting up the Grant cache system in different environments.

## Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose (for Redis)
- Grant repository cloned

## Installation

### 1. Install Dependencies

The `ioredis` package is already included in `apps/api/package.json`. Install it with:

```bash
cd apps/api
pnpm install
```

### 2. Start Redis (Optional)

If you plan to use Redis caching, start the Redis container:

```bash
# From project root
docker-compose up redis -d

# Verify Redis is running
docker ps | grep redis
```

## Configuration

### Development Setup (In-Memory Cache)

No configuration needed! The system uses in-memory cache by default.

```bash
# Start the API server
cd apps/api
pnpm run dev
```

You should see:

```
📦 Cache strategy: MEMORY
🚀 Apollo Server ready at http://localhost:4000/graphql
```

### Production Setup (Redis Cache)

Create a `.env` file in `apps/api/`:

```bash
# apps/api/.env
CACHE_STRATEGY=redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=grant_redis_password
```

Start the API server:

```bash
cd apps/api
pnpm run start
```

You should see:

```
📦 Cache strategy: REDIS
Redis Client Connected
🚀 Apollo Server ready at http://localhost:4000/graphql
```

## Docker Compose Configuration

The Redis service is already configured in `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  container_name: grant-redis
  command: redis-server --requirepass grant_redis_password
  ports:
    - '6379:6379'
  volumes:
    - redis_data:/data
  healthcheck:
    test: ['CMD', 'redis-cli', '--raw', 'incr', 'ping']
    interval: 10s
    timeout: 3s
    retries: 5
  restart: unless-stopped
```

## Verification

### Check Cache Strategy

When the server starts, look for the cache strategy log:

```
📦 Cache strategy: MEMORY
# or
📦 Cache strategy: REDIS
```

### Test Redis Connection

```bash
# Connect to Redis CLI
docker exec -it grant-redis redis-cli -a grant_redis_password

# Test connection
127.0.0.1:6379> ping
PONG

# List all Grant cache keys
127.0.0.1:6379> keys grant:*

# Exit
127.0.0.1:6379> exit
```

### Monitor Cache Operations

```bash
# Watch Redis operations in real-time
docker exec -it grant-redis redis-cli -a grant_redis_password monitor
```

## Environment Variables

| Variable         | Default     | Description                        |
| ---------------- | ----------- | ---------------------------------- |
| `CACHE_STRATEGY` | `memory`    | Cache backend: `memory` or `redis` |
| `REDIS_HOST`     | `localhost` | Redis server hostname              |
| `REDIS_PORT`     | `6379`      | Redis server port                  |
| `REDIS_PASSWORD` | (none)      | Redis authentication password      |

## Deployment Scenarios

### Single Instance (Development)

```bash
CACHE_STRATEGY=memory
```

**Use case:** Local development, testing

### Multiple Instances (Production)

```bash
CACHE_STRATEGY=redis
REDIS_HOST=redis.production.com
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password
```

**Use case:** Load-balanced production, horizontal scaling

### Kubernetes Deployment

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
data:
  CACHE_STRATEGY: 'redis'
  REDIS_HOST: 'redis-service'
  REDIS_PORT: '6379'

---
apiVersion: v1
kind: Secret
metadata:
  name: redis-secret
type: Opaque
stringData:
  REDIS_PASSWORD: 'your_secure_password'
```

### AWS ElastiCache

```bash
CACHE_STRATEGY=redis
REDIS_HOST=your-cluster.cache.amazonaws.com
REDIS_PORT=6379
# No password needed if using IAM auth
```

## Troubleshooting

### Issue: Redis Connection Refused

```
Redis Client Error: connect ECONNREFUSED
```

**Solution:**

```bash
# Check if Redis is running
docker ps | grep redis

# Start Redis
docker-compose up redis -d

# Check logs
docker logs grant-redis
```

### Issue: Authentication Failed

```
NOAUTH Authentication required
```

**Solution:** Ensure `REDIS_PASSWORD` matches the Docker Compose configuration:

```bash
export REDIS_PASSWORD=grant_redis_password
```

### Issue: Wrong Password

```
WRONGPASS invalid username-password pair
```

**Solution:** Update your Redis password in both places:

1. `docker-compose.yml`: `command: redis-server --requirepass YOUR_PASSWORD`
2. `.env`: `REDIS_PASSWORD=YOUR_PASSWORD`

## Performance Tuning

### Redis Configuration

Create `redis.conf` for custom Redis settings:

```conf
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
tcp-backlog 511
timeout 300
```

Mount it in Docker Compose:

```yaml
redis:
  image: redis:7-alpine
  command: redis-server /usr/local/etc/redis/redis.conf
  volumes:
    - ./redis.conf:/usr/local/etc/redis/redis.conf
    - redis_data:/data
```

### Connection Pooling

The Redis adapter uses `ioredis` which provides automatic connection pooling. Default settings:

- Connection timeout: 10 seconds
- Keep-alive: enabled
- Retry strategy: exponential backoff (max 2 seconds)

## Migration Guide

### From In-Memory to Redis

1. Start Redis:

   ```bash
   docker-compose up redis -d
   ```

2. Update environment:

   ```bash
   export CACHE_STRATEGY=redis
   export REDIS_PASSWORD=grant_redis_password
   ```

3. Restart application:
   ```bash
   pnpm run start
   ```

No data migration needed - cache will rebuild automatically.

### From Redis to In-Memory

1. Update environment:

   ```bash
   unset CACHE_STRATEGY
   # or
   export CACHE_STRATEGY=memory
   ```

2. Restart application

3. (Optional) Stop Redis:
   ```bash
   docker-compose stop redis
   ```

## Monitoring

### Cache Statistics

Add monitoring to track:

- Cache hit rate
- Cache size
- Response times
- Error rates

### Redis Monitoring Tools

- **RedisInsight**: GUI for Redis
- **redis-cli INFO**: Built-in statistics
- **Prometheus + Grafana**: Production monitoring

```bash
# Get Redis stats
docker exec -it grant-redis redis-cli -a grant_redis_password INFO stats
```

## Next Steps

- [Caching System Documentation](/advanced-topics/caching) - Full API reference
- [Performance Optimization](/advanced-topics/performance) - Tuning guide
- [Deployment Guide](/deployment/self-hosting) - Production deployment
- [Troubleshooting](/troubleshooting/common-issues) - Common issues

## Quick Commands Reference

```bash
# Install dependencies
pnpm install

# Start Redis
docker-compose up redis -d

# Start API (memory cache)
pnpm run dev

# Start API (redis cache)
CACHE_STRATEGY=redis pnpm run dev

# Check Redis
docker exec -it grant-redis redis-cli -a grant_redis_password ping

# Monitor Redis
docker exec -it grant-redis redis-cli -a grant_redis_password monitor

# Stop Redis
docker-compose stop redis
```
