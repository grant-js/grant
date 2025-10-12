---
title: AWS CloudFormation Deployment
description: Deploy Grant Platform to AWS using CloudFormation templates
---

# AWS CloudFormation Deployment

Deploy Grant Platform to AWS with infrastructure as code using CloudFormation templates.

## Overview

The CloudFormation templates provide a complete, production-ready AWS deployment including:

- **Compute**: ECS Fargate containers for the API
- **Database**: RDS PostgreSQL with automated backups
- **Cache**: ElastiCache Redis cluster
- **Load Balancing**: Application Load Balancer
- **Networking**: VPC, subnets, security groups
- **Monitoring**: CloudWatch logs and metrics

## Quick Start

### Prerequisites

- AWS Account with administrative access
- AWS CLI configured (`aws configure`)
- CloudFormation permissions
- Understanding of AWS services and costs

### Launch Stack

**Option 1: AWS Console**

1. Navigate to [CloudFormation Console](https://console.aws.amazon.com/cloudformation)
2. Click "Create stack" → "With new resources"
3. Upload template: `infrastructure/cloudformation/main.yaml`
4. Fill in parameters
5. Review and create

**Option 2: AWS CLI**

```bash
# From project root
aws cloudformation create-stack \
  --stack-name grant-platform-prod \
  --template-body file://infrastructure/cloudformation/main.yaml \
  --parameters file://infrastructure/cloudformation/parameters/production.json \
  --capabilities CAPABILITY_IAM
```

## CloudFormation Templates

### Main Template

**Location**: `infrastructure/cloudformation/main.yaml`

The main template orchestrates all resources:

- VPC and networking
- RDS PostgreSQL database
- ElastiCache Redis
- ECS cluster and services
- Application Load Balancer
- Security groups and IAM roles

### Parameter Files

**Development**: `infrastructure/cloudformation/parameters/development.json`

```json
{
  "EnvironmentName": "dev",
  "InstanceType": "t3.small",
  "DatabaseInstanceClass": "db.t3.micro",
  "DatabaseMultiAZ": false
}
```

**Production**: `infrastructure/cloudformation/parameters/production.json`

```json
{
  "EnvironmentName": "prod",
  "InstanceType": "t3.medium",
  "DatabaseInstanceClass": "db.r5.large",
  "DatabaseMultiAZ": true
}
```

## Configuration

### Required Parameters

| Parameter          | Description            | Example                  |
| ------------------ | ---------------------- | ------------------------ |
| `EnvironmentName`  | Environment identifier | `prod`, `staging`        |
| `DatabasePassword` | RDS master password    | (secure random)          |
| `JWTSecret`        | JWT signing secret     | (min 32 chars)           |
| `FrontendURL`      | CORS allowed origin    | `https://yourdomain.com` |

### Optional Parameters

| Parameter               | Default          | Description              |
| ----------------------- | ---------------- | ------------------------ |
| `InstanceType`          | `t3.medium`      | ECS task instance type   |
| `DatabaseInstanceClass` | `db.t3.medium`   | RDS instance class       |
| `DatabaseMultiAZ`       | `true`           | Enable Multi-AZ for HA   |
| `RedisNodeType`         | `cache.t3.small` | ElastiCache node type    |
| `DesiredCount`          | `2`              | Number of API containers |

## Stack Outputs

After deployment, the stack provides these outputs:

- **LoadBalancerURL** - API endpoint URL
- **DatabaseEndpoint** - RDS connection endpoint
- **RedisEndpoint** - ElastiCache connection endpoint
- **LogGroup** - CloudWatch log group name

Access outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name grant-platform-prod \
  --query 'Stacks[0].Outputs'
```

## Post-Deployment

### 1. Run Database Migrations

Connect to an ECS task and run migrations:

```bash
# Get task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster grant-platform-prod \
  --service-name api \
  --query 'taskArns[0]' \
  --output text)

# Execute migrations
aws ecs execute-command \
  --cluster grant-platform-prod \
  --task $TASK_ARN \
  --container api \
  --interactive \
  --command "pnpm run db:migrate"
```

### 2. Configure DNS

Point your domain to the load balancer:

```bash
# Get load balancer DNS
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name grant-platform-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerURL`].OutputValue' \
  --output text)

# Create Route53 record or update your DNS provider
```

### 3. Setup SSL Certificate

Use AWS Certificate Manager:

```bash
# Request certificate
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS

# Add certificate to load balancer listener
```

### 4. Configure Monitoring

CloudWatch alarms are automatically created for:

- High CPU usage
- High memory usage
- Database connections
- API error rates

Access logs:

```bash
aws logs tail /aws/ecs/grant-platform-prod --follow
```

## Updating the Stack

Update your deployment:

```bash
# Update with new template
aws cloudformation update-stack \
  --stack-name grant-platform-prod \
  --template-body file://infrastructure/cloudformation/main.yaml \
  --parameters file://infrastructure/cloudformation/parameters/production.json \
  --capabilities CAPABILITY_IAM

# Monitor update
aws cloudformation wait stack-update-complete \
  --stack-name grant-platform-prod
```

## Cost Estimation

Approximate monthly costs (us-east-1):

### Development Environment

- ECS Fargate (1 task, 0.5 vCPU, 1 GB): ~$15
- RDS t3.micro (single-AZ): ~$15
- ElastiCache t3.micro: ~$12
- ALB: ~$20
- **Total**: ~$62/month

### Production Environment

- ECS Fargate (2 tasks, 1 vCPU, 2 GB each): ~$60
- RDS r5.large (Multi-AZ): ~$350
- ElastiCache r5.large (2 nodes): ~$200
- ALB: ~$20
- Data transfer: ~$50
- **Total**: ~$680/month

::: tip Cost Optimization

- Use Reserved Instances for predictable workloads
- Enable auto-scaling to match traffic
- Use S3 for static assets
- Implement caching strategies
  :::

## Security Best Practices

### 1. Network Security

- Private subnets for database and cache
- Security groups restrict access
- VPC endpoints for AWS services

### 2. Secrets Management

Store secrets in AWS Secrets Manager:

```bash
# Store JWT secret
aws secretsmanager create-secret \
  --name grant-platform/jwt-secret \
  --secret-string "your-secure-secret"

# Reference in CloudFormation
```

### 3. IAM Roles

Use least-privilege IAM roles:

- ECS task execution role
- ECS task role (for app permissions)
- RDS enhanced monitoring role

### 4. Encryption

- RDS encryption at rest (enabled)
- ElastiCache encryption in transit (enabled)
- ALB HTTPS listener with ACM certificate

## Monitoring & Alerts

### CloudWatch Metrics

Key metrics to monitor:

- `TargetResponseTime` - API latency
- `HTTPCode_Target_5XX_Count` - Server errors
- `CPUUtilization` - Resource usage
- `DatabaseConnections` - DB pool health

### CloudWatch Alarms

Pre-configured alarms:

- API error rate > 1%
- Database CPU > 80%
- Redis memory > 90%
- ALB unhealthy targets

### Logs

Access application logs:

```bash
# API logs
aws logs tail /aws/ecs/grant-platform-prod/api --follow

# Database logs
aws rds describe-db-log-files \
  --db-instance-identifier grant-platform-prod-db
```

## Troubleshooting

### Stack Creation Failed

**Check CloudFormation events:**

```bash
aws cloudformation describe-stack-events \
  --stack-name grant-platform-prod \
  --max-items 10
```

**Common issues:**

- Insufficient IAM permissions
- Parameter validation errors
- Resource limits exceeded

### Application Won't Start

**Check ECS task logs:**

```bash
aws logs tail /aws/ecs/grant-platform-prod/api --follow
```

**Common issues:**

- Database connection failure
- Missing environment variables
- Image pull errors

### High Costs

**Review costs:**

```bash
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

**Optimization:**

- Reduce instance sizes for non-production
- Enable auto-scaling
- Use Spot instances for development
- Delete unused resources

## Backup & Disaster Recovery

### Automated Backups

RDS automated backups are enabled:

- Daily backups during maintenance window
- 7-day retention (configurable)
- Point-in-time recovery

### Manual Snapshots

Create manual snapshots:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier grant-platform-prod-db \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d)
```

### Disaster Recovery

1. **Backup RDS**: Automated snapshots
2. **Backup Redis**: Daily snapshots
3. **Backup Config**: CloudFormation templates in git
4. **Recovery Time**: ~30 minutes from snapshot

## Clean Up

Delete the stack and all resources:

```bash
# Delete stack
aws cloudformation delete-stack \
  --stack-name grant-platform-prod

# Wait for completion
aws cloudformation wait stack-delete-complete \
  --stack-name grant-platform-prod
```

::: warning Data Loss
This will permanently delete all data including:

- Database (unless snapshots exist)
- Cache data
- Logs (unless exported)
  :::

## Related Documentation

- **[Self-Hosting](/deployment/self-hosting)** - General self-hosting guide
- **[Docker Deployment](/deployment/docker)** - Local development setup
- **[Environment Setup](/deployment/environment)** - Environment configuration
- **[Configuration](/getting-started/configuration)** - Configuration reference

## Support

- **CloudFormation Templates**: `infrastructure/cloudformation/`
- **GitHub Issues**: [Report issues](https://github.com/logusgraphics/grant-platform/issues)
- **AWS Support**: For AWS-specific issues

---

**Next Steps:**

- Review the CloudFormation template
- Prepare parameter values
- Deploy to development first
- Test thoroughly before production
