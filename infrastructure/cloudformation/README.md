# Grant Platform - CloudFormation Setup

## Overview

This directory contains CloudFormation templates for deploying Grant Platform on AWS.

## Templates

- **`main.yaml`** - Main CloudFormation template
- **`parameters/`** - Parameter files for different environments
- **`outputs/`** - Output configurations

## Quick Deploy

### Development Environment

```bash
aws cloudformation create-stack \
  --stack-name grant-platform-dev \
  --template-body file://main.yaml \
  --parameters file://parameters/dev.json \
  --capabilities CAPABILITY_IAM
```

### Production Environment

```bash
aws cloudformation create-stack \
  --stack-name grant-platform-prod \
  --template-body file://main.yaml \
  --parameters file://parameters/prod.json \
  --capabilities CAPABILITY_IAM
```

## Resources Created

- **ECS Fargate Cluster** - Container orchestration
- **RDS PostgreSQL** - Database cluster
- **Application Load Balancer** - Traffic routing
- **VPC & Subnets** - Network isolation
- **IAM Roles** - Security permissions
- **CloudWatch** - Monitoring and logging
- **Route 53** - DNS management (optional)

## Parameters

Key parameters you can configure:

- `Environment` - dev/staging/prod
- `DomainName` - Custom domain (optional)
- `DatabaseInstanceClass` - RDS instance size
- `WebDesiredCount` - Number of web containers
- `ApiDesiredCount` - Number of API containers

## Monitoring

The stack includes:

- CloudWatch dashboards
- Log aggregation
- Health checks
- Auto-scaling metrics
