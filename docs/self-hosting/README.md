# Grant Platform - Self-Hosting Guide

## Overview

Grant Platform is an open-source, multi-tenant RBAC/ACL system that can be self-hosted using AWS CloudFormation templates. This guide walks you through deploying your own instance.

## Architecture

The platform consists of:

- **Web App** (Next.js) - Containerized frontend
- **API** (Apollo Server) - Containerized backend
- **Database** (PostgreSQL) - AWS RDS cluster
- **Infrastructure** - CloudFormation-managed AWS resources

## Quick Start

### Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured
- Docker (for local development)

### Deployment Options

#### Option 1: AWS Console Wizard (Recommended)

1. **Launch CloudFormation Stack**

   ```bash
   aws cloudformation create-stack \
     --stack-name grant-platform \
     --template-body file://infrastructure/cloudformation/main.yaml \
     --parameters file://infrastructure/cloudformation/parameters/dev.json \
     --capabilities CAPABILITY_IAM
   ```

2. **Configure via AWS Console**
   - Navigate to CloudFormation in AWS Console
   - Use the wizard to configure parameters
   - Review and launch the stack

#### Option 2: AWS CDK (Advanced)

```bash
cd infrastructure/cdk
npm install
cdk deploy GrantPlatformStack
```

## Configuration

### Environment Variables

The CloudFormation template will automatically configure:

- Database connection strings
- JWT secrets
- API endpoints
- Monitoring and logging

### Customization

- **Domain**: Configure custom domain via Route 53
- **SSL**: Automatic SSL via AWS Certificate Manager
- **Scaling**: Auto-scaling groups for web and API containers
- **Monitoring**: CloudWatch integration

## Local Development

```bash
# Clone the repository
git clone https://github.com/logusgraphics/grant-platform.git
cd grant-platform

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

## Support

- **Documentation**: [docs.grant.logus.graphics](https://docs.grant.logus.graphics)
- **Issues**: [GitHub Issues](https://github.com/logusgraphics/grant-platform/issues)
- **Community**: [Discord](https://discord.gg/grant-platform)

## License

MIT License - see [LICENSE](./LICENSE) for details.
