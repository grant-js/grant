# @logusgraphics/grant-acl

Multi-tenant RBAC/ACL system for Node.js applications.

## Installation

```bash
npm install @logusgraphics/grant-acl
```

## Usage

### Basic ACL Usage

```typescript
import { ACL } from '@logusgraphics/grant-acl';

const acl = new ACL({
  apiUrl: 'https://your-grant-api.com',
});

// Check permissions
const canCreateUser = acl.hasPermission(user, 'user:create', 'project');
```

### Express Middleware

```typescript
import { aclMiddleware } from '@logusgraphics/grant-acl/middleware';

app.use(
  '/api/users',
  aclMiddleware({
    permission: 'user:read',
    scope: 'organization',
  })
);
```

### Next.js API Route Protection

```typescript
import { nextACLMiddleware } from '@logusgraphics/grant-acl/middleware';

export default nextACLMiddleware({
  permission: 'user:create',
  scope: 'project',
})(async (req, res) => {
  // Your protected API logic
});
```

## Features

- 🔐 Multi-tenant RBAC/ACL system
- 🏢 Organization and project-level scoping
- 🚀 Express, Fastify, and Next.js middleware
- 📦 TypeScript support
- 🔄 Real-time permission updates
- 📊 Comprehensive audit logging

## Documentation

For detailed documentation, visit [grant.logus.graphics](https://grant.logus.graphics).

## License

MIT License - see [LICENSE](./LICENSE) for details.
