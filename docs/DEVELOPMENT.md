# Development Guide

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL database

### Installation

```bash
# Install dependencies
pnpm install
```

### Environment Setup

1. Copy environment files:

   ```bash
   cp apps/web/env.local.example apps/web/.env.local
   cp apps/api/env.example apps/api/.env
   ```

2. Update database URL in `apps/api/.env`:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/grant_platform
   ```

## Development Workflows

### Option 1: Run Both Apps Together

```bash
# Start both web and API servers
pnpm dev:both
```

- Web app: http://localhost:3000
- API server: http://localhost:4000/graphql

### Option 2: Run Apps Separately

```bash
# Terminal 1: Start API server
pnpm dev:api

# Terminal 2: Start web app
pnpm dev:web
```

### Option 3: Use Turbo (All Apps)

```bash
# Start all apps and packages
pnpm dev
```

## Available Scripts

### Root Level

- `pnpm dev` - Start all services via Turbo
- `pnpm dev:web` - Start only web app
- `pnpm dev:api` - Start only API server
- `pnpm dev:both` - Start both web and API concurrently
- `pnpm build` - Build all packages and apps
- `pnpm generate` - Generate GraphQL types from schema
- `pnpm generate:watch` - Watch GraphQL schema and regenerate types
- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed database with test data
- `pnpm db:reset` - Reset and reseed database
- `pnpm test` - Run tests across all packages
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier

### Web App (`apps/web`)

- `pnpm dev` - Start Next.js development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Lint web app code

### API Server (`apps/api`)

- `pnpm dev` - Start Apollo Server with hot reload
- `pnpm build` - Compile TypeScript
- `pnpm start` - Start production server
- `pnpm db:generate` - Generate database migrations (delegates to database package)
- `pnpm db:migrate` - Run database migrations (delegates to database package)
- `pnpm db:seed` - Seed database with test data (delegates to database package)

### Schema Package (`packages/@logusgraphics/grant-schema`)

- `pnpm generate` - Generate TypeScript types from GraphQL schema
- `pnpm generate:watch` - Watch for schema changes and regenerate
- `pnpm build` - Build the package

### Database Package (`packages/@logusgraphics/grant-database`)

- `pnpm db:generate` - Generate database migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed database with test data
- `pnpm db:reset` - Reset and reseed database
- `pnpm build` - Build the package

## Project Structure

```
grant-platform/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/               # Next.js app directory
│   │   ├── components/        # React components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility libraries
│   │   └── styles/           # CSS and styling
│   └── api/                   # Apollo Server backend
│       └── src/
│           ├── graphql/      # GraphQL schema and resolvers
│           ├── lib/          # Utility libraries
│           └── scripts/      # Database scripts
├── packages/
│   └── @logusgraphics/       # Shared packages
│       ├── grant-schema/     # GraphQL schema and types
│       ├── grant-database/   # Database schemas and migrations
│       ├── grant-core/       # Core RBAC/ACL logic
│       ├── grant-types/      # Shared TypeScript types
│       ├── grant-config/    # Shared configurations
│       └── grant-utils/      # Shared utility functions
└── infrastructure/           # Deployment configurations
```

## Database Setup

### Initial Setup

```bash
# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed with test data
pnpm db:seed
```

### Reset Database

```bash
# Reset and reseed database
pnpm db:reset
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000 and 4000 are available
2. **Database connection**: Verify DATABASE_URL is correct
3. **Dependencies**: Run `pnpm install` if you see module errors
4. **TypeScript errors**: Run `pnpm type-check` to identify issues

### Debug Mode

```bash
# Enable debug logging
DEBUG=* pnpm dev:api
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test`
4. Run linting: `pnpm lint`
5. Submit a pull request
