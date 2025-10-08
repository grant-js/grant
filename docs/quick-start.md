# Quick Start

Get Grant Platform up and running in minutes! This guide covers the fastest ways to start using Grant Platform.

## 🚀 Choose Your Path

### Option 1: Self-Hosting (Recommended)

Deploy Grant Platform on your own infrastructure with full control and customization.

### Option 2: SaaS Trial

Try our hosted solution with a free trial account.

### Option 3: Local Development

Set up a local development environment for contributing or testing.

## Self-Hosting Setup

### Prerequisites

- **AWS Account** with appropriate permissions
- **AWS CLI** configured with your credentials
- **Docker** (for local testing)

### 1. Launch CloudFormation Stack

```bash
# Clone the repository
git clone https://github.com/logusgraphics/grant-platform.git
cd grant-platform

# Launch the CloudFormation stack
aws cloudformation create-stack \
  --stack-name grant-platform \
  --template-body file://infrastructure/cloudformation/main.yaml \
  --parameters file://infrastructure/cloudformation/parameters/dev.json \
  --capabilities CAPABILITY_IAM
```

### 2. Configure Parameters

The CloudFormation template will prompt you for:

- **Database credentials** - PostgreSQL username and password
- **Domain name** - Your custom domain (optional)
- **Environment** - Development, staging, or production
- **Instance sizes** - Based on your expected load

### 3. Access Your Deployment

Once the stack is deployed, you'll receive:

- **Web App URL** - Your Grant Platform frontend
- **API URL** - GraphQL API endpoint
- **Admin credentials** - Initial admin account

### 4. Initial Configuration

1. **Login** with the provided admin credentials
2. **Create your organization** and first project
3. **Configure authentication** (JWT, OAuth, etc.)
4. **Set up your first users** and roles

## SaaS Trial

### 1. Sign Up

Visit [grant.logus.graphics](https://grant.logus.graphics) and create a free trial account.

### 2. Create Organization

- **Organization name** - Your company or project name
- **Initial project** - Your first integration environment
- **Admin user** - Your account details

### 3. Configure Your Project

- **Add users** to your project
- **Define roles** and permissions
- **Set up integrations** with your applications

### 4. Test the API

Use the built-in GraphQL playground to test queries and mutations:

```graphql
# Test query
query GetUsers {
  users {
    id
    name
    email
    roles {
      name
      permissions {
        action
        scope
      }
    }
  }
}
```

## Local Development

### Prerequisites

- **Node.js** 18+ and **pnpm**
- **PostgreSQL** 14+
- **Docker** (optional, for database)

### 1. Clone and Install

```bash
git clone https://github.com/logusgraphics/grant-platform.git
cd grant-platform
pnpm install
```

### 2. Database Setup

```bash
# Start PostgreSQL with Docker
docker run --name grant-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=grant_platform \
  -p 5432:5432 \
  -d postgres:14

# Set environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/grant_platform"

# Run migrations
pnpm db:migrate

# Seed with sample data
pnpm db:seed
```

### 3. Start Development Servers

```bash
# Start all services
pnpm dev

# Or start individually
pnpm dev:api    # API server on :4000
pnpm dev:web    # Web app on :3000
```

### 4. Access Development Environment

- **Web App**: http://localhost:3000
- **API**: http://localhost:4000/graphql
- **GraphQL Playground**: http://localhost:4000/graphql

## Next Steps

### For Self-Hosting

- **[Configuration Guide](/configuration)** - Detailed configuration options
- **[Deployment Guide](/deployment/self-hosting)** - Production deployment
- **[Monitoring Setup](/deployment/monitoring)** - Logging and metrics

### For SaaS Users

- **[SaaS Features](/saas/)** - Available features and limitations
- **[API Integration](/api/)** - Connect your applications
- **[User Management](/concepts/users-roles)** - Managing users and roles

### For Developers

- **[Development Guide](/development/guide)** - Project structure and workflow
- **[API Reference](/api/)** - Complete GraphQL API documentation
- **[Contributing](/development/contributing)** - How to contribute

## Common Issues

### Database Connection Issues

- Verify PostgreSQL is running and accessible
- Check connection string format
- Ensure database exists and user has permissions

### CloudFormation Deployment Issues

- Check AWS CLI configuration
- Verify IAM permissions for CloudFormation
- Review CloudFormation events for specific errors

### Local Development Issues

- Ensure all dependencies are installed (`pnpm install`)
- Check Node.js version compatibility
- Verify environment variables are set correctly

## Getting Help

- **Documentation** - Comprehensive guides and API reference
- **GitHub Issues** - Bug reports and feature requests
- **Discord Community** - Real-time help and discussions
- **Email Support** - support@grant.logus.graphics

---

**Ready to dive deeper?** Check out the [Architecture Overview](/architecture/overview) to understand how Grant Platform works under the hood.
