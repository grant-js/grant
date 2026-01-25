# REST API

The Grant provides a comprehensive REST API alongside the GraphQL API, giving you flexibility in how you interact with the platform. The REST API follows RESTful conventions and uses JSON for request and response payloads.

## Interactive Documentation

The REST API comes with **Swagger UI** for interactive API exploration and testing:

- **Swagger UI**: `http://localhost:4000/api-docs`
- **OpenAPI Spec**: `http://localhost:4000/api-docs.json`

The Swagger UI provides:

- Complete API endpoint documentation
- Request/response schema definitions
- Interactive testing capability
- Example requests and responses
- Authentication flow testing

## Base URL

```
http://localhost:4000/api
```

For production deployments, replace `localhost:4000` with your deployed API endpoint.

## Authentication

The REST API uses JWT (JSON Web Token) authentication. Include your access token in the `Authorization` header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Authentication Endpoints

All authentication endpoints are public and do not require an `Authorization` header:

- `POST /api/auth/login` - Authenticate with provider credentials
- `POST /api/auth/register` - Create a new account
- `POST /api/auth/refresh` - Refresh access and refresh tokens
- `POST /api/auth/logout` - Logout and invalidate session

## Response Format

All successful REST API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Responses

Error responses include detailed information:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error context (if applicable)
  }
}
```

#### Common Error Codes

| Code               | Description                       | HTTP Status |
| ------------------ | --------------------------------- | ----------- |
| `VALIDATION_ERROR` | Request validation failed         | 400         |
| `UNAUTHENTICATED`  | Missing or invalid authentication | 401         |
| `FORBIDDEN`        | Insufficient permissions          | 403         |
| `NOT_FOUND`        | Resource not found                | 404         |
| `INTERNAL_ERROR`   | Server error                      | 500         |

### Validation Errors

Validation errors provide field-level details:

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ]
}
```

## Authentication Flow

### 1. Register a New Account

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "username": "johndoe",
  "type": "personal",
  "provider": "email",
  "providerId": "user@example.com",
  "providerData": {
    "email_verified": true
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "account": {
      "id": "acc_123",
      "name": "John Doe",
      "username": "johndoe",
      "type": "personal",
      "createdAt": "2025-10-11T00:00:00Z",
      "updatedAt": "2025-10-11T00:00:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login to Existing Account

```http
POST /api/auth/login
Content-Type: application/json

{
  "provider": "email",
  "providerId": "user@example.com",
  "providerData": {
    "password_hash": "..."
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "account": {
      "id": "acc_123",
      "name": "John Doe",
      "username": "johndoe",
      "type": "personal",
      "createdAt": "2025-10-11T00:00:00Z",
      "updatedAt": "2025-10-11T00:00:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Refresh Tokens

When your access token expires, use the refresh token to get new tokens:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 4. Logout

```http
POST /api/auth/logout
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN

{
  "sessionId": "sess_123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

## Provider Types

The authentication system supports multiple provider types:

| Provider    | Description                   |
| ----------- | ----------------------------- |
| `email`     | Email/password authentication |
| `google`    | Google OAuth                  |
| `github`    | GitHub OAuth                  |
| `microsoft` | Microsoft OAuth               |

## Account Types

When registering, you can create two types of accounts:

| Type           | Description                  |
| -------------- | ---------------------------- |
| `personal`     | Individual user account      |
| `organization` | Organization/company account |

## API Endpoints

The REST API provides comprehensive CRUD operations for all core resources. All endpoints except authentication require a valid JWT token in the `Authorization` header.

### Accounts

Manage personal and organization accounts.

- `GET /api/accounts` - List all accounts (paginated, searchable)
- `GET /api/accounts/:id` - Get account by ID with optional relations
- `POST /api/accounts` - Create a new account (handled via registration)
- `PATCH /api/accounts/:id` - Update account details
- `DELETE /api/accounts/:id` - Delete account (soft/hard delete)

**Example**: Get an account with projects loaded

```bash
GET /api/accounts/acc_123?relations=projects
```

### Organizations

Manage organizations and their hierarchical structure.

- `GET /api/organizations` - List organizations with pagination and search
- `GET /api/organizations/:id` - Get organization by ID
- `POST /api/organizations` - Create a new organization
- `PATCH /api/organizations/:id` - Update organization details
- `DELETE /api/organizations/:id` - Delete organization

### Projects

Projects provide multi-tenant isolation within accounts or organizations.

- `GET /api/projects` - List projects within a scope
- `POST /api/projects` - Create a new project
- `PATCH /api/projects/:id` - Update project details
- `DELETE /api/projects/:id` - Delete project (soft/hard delete)

**Required Parameters**: `scopeId`, `tenant` (parent scope context)

**Example**: List projects in an organization

```bash
GET /api/projects?scopeId=org_456&tenant=organization&relations=roles,users
```

### Users

Manage users within different scopes (account/organization/project).

- `GET /api/users` - List users with filtering and pagination
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a new user
- `PATCH /api/users/:id` - Update user details
- `DELETE /api/users/:id` - Delete user (soft/hard delete)

**Scope-based Filtering**: Users are always queried within a specific scope context.

**Example**: Get users in a project with roles loaded

```bash
GET /api/users?scopeId=proj_789&tenant=project&relations=roles,tags
```

### Roles

Manage roles for role-based access control (RBAC).

- `GET /api/roles` - List roles within a scope
- `POST /api/roles` - Create a new role
- `PATCH /api/roles/:id` - Update role details
- `DELETE /api/roles/:id` - Delete role (soft/hard delete)

**Features**: Assign permissions to roles, tag roles for organization, filter by tags.

**Example**: Create a role with permissions

```bash
POST /api/roles
{
  "name": "Project Manager",
  "description": "Can manage projects and users",
  "scope": { "id": "org_456", "tenant": "organization" },
  "permissionIds": ["perm_1", "perm_2"],
  "tagIds": ["tag_management"]
}
```

### Groups

Manage groups of users for collective permission assignment.

- `GET /api/groups` - List groups within a scope
- `POST /api/groups` - Create a new group
- `PATCH /api/groups/:id` - Update group details
- `DELETE /api/groups/:id` - Delete group (soft/hard delete)

**Features**: Assign permissions to groups, tag groups, manage group memberships.

**Example**: Update a group's permissions

```bash
PATCH /api/groups/grp_123
{
  "permissionIds": ["perm_1", "perm_3", "perm_5"]
}
```

### Permissions

Manage granular permissions for access control.

- `GET /api/permissions` - List permissions within a scope
- `POST /api/permissions` - Create a new permission
- `PATCH /api/permissions/:id` - Update permission details
- `DELETE /api/permissions/:id` - Delete permission (soft/hard delete)

**Action Field**: Permissions use an action string (e.g., `read:users`, `write:projects`) to define what operation is allowed.

**Example**: Create a permission

```bash
POST /api/permissions
{
  "name": "Read Projects",
  "action": "read:projects",
  "description": "Allows reading project data",
  "scope": { "id": "org_456", "tenant": "organization" }
}
```

### Tags

Manage tags for categorizing and organizing resources.

- `GET /api/tags` - List tags within a scope
- `POST /api/tags` - Create a new tag
- `PATCH /api/tags/:id` - Update tag details
- `DELETE /api/tags/:id` - Delete tag (soft/hard delete)

**Color Coding**: Tags use hex colors (`#RRGGBB`) for visual categorization.

**Use Cases**: Tags can be assigned to users, groups, roles, permissions, and projects for:

- Visual organization
- Filtering and searching
- Access control grouping
- Primary tag designation

**Example**: Create a tag

```bash
POST /api/tags
{
  "name": "Frontend",
  "color": "#3498DB",
  "scope": { "id": "org_456", "tenant": "organization" }
}
```

## Multi-Tenancy & Scoping

The Grant implements hierarchical multi-tenancy with three levels:

1. **Account** - Top-level tenant (personal or organization)
2. **Organization** - Mid-level tenant (within an account)
3. **Project** - Bottom-level tenant (within account or organization)

### Scope Parameters

Most endpoints require `scopeId` and `tenant` query parameters to specify the context:

```bash
# Get roles within a project
GET /api/roles?scopeId=proj_789&tenant=project

# Get users within an organization
GET /api/users?scopeId=org_456&tenant=organization
```

### Tenant Hierarchy

Resources inherit from their parent scope:

```
Account (acc_123)
├── Organization (org_456)
│   ├── Project (proj_789)
│   │   ├── Users
│   │   ├── Roles
│   │   └── Permissions
│   └── Users
└── Users
```

::: tip Learn More
See [Multi-Tenancy Architecture](/architecture/multi-tenancy) for detailed information about tenant isolation and data segregation.
:::

## Rate Limiting

::: warning
Rate limiting is not yet implemented but is planned for future releases.
:::

## CORS

The API server implements CORS (Cross-Origin Resource Sharing) with a configurable whitelist of allowed origins. By default in development:

- `http://localhost:3000` (Next.js development server)
- `http://localhost:4000` (API server)

## Field Selection (Relations)

The REST API supports selective loading of relationships through the `relations` query parameter:

```bash
# Load projects and owner relationships
GET /api/accounts/acc_123?relations=projects,owner
```

By default, only base entity fields are returned. Use `relations` to load expensive relationships on-demand for better performance.

::: tip Learn More
See [Field Selection](/advanced-topics/field-selection#rest-api-field-selection) for detailed documentation on available relations, performance considerations, and implementation details.
:::

## Content Type

All requests and responses use JSON:

```http
Content-Type: application/json
```

## API Versioning

Currently, the REST API is unversioned. Future versions will be available at:

```
/api/v2/...
```

## SDK & Client Libraries

::: info Coming Soon
Official TypeScript/JavaScript SDK and client libraries are planned for future releases.
:::

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

```
GET /api-docs.json
```

This specification can be used to:

- Generate client SDKs in any language
- Import into API testing tools (Postman, Insomnia, etc.)
- Validate requests/responses
- Generate documentation

## Code Examples

### JavaScript/TypeScript

```typescript
// Register a new account
const response = await fetch('http://localhost:4000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    username: 'johndoe',
    type: 'personal',
    provider: 'email',
    providerId: 'user@example.com',
    providerData: { email_verified: true },
  }),
});

const data = await response.json();
const { accessToken, refreshToken } = data.data;

// Use the access token for authenticated requests
const usersResponse = await fetch('http://localhost:4000/api/users', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});
```

### Python

```python
import requests

# Register a new account
response = requests.post(
    'http://localhost:4000/api/auth/register',
    json={
        'name': 'John Doe',
        'username': 'johndoe',
        'type': 'personal',
        'provider': 'email',
        'providerId': 'user@example.com',
        'providerData': {'email_verified': True}
    }
)

data = response.json()
access_token = data['data']['accessToken']

# Use the access token for authenticated requests
users_response = requests.get(
    'http://localhost:4000/api/users',
    headers={'Authorization': f'Bearer {access_token}'}
)
```

### cURL

```bash
# Register a new account
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "username": "johndoe",
    "type": "personal",
    "provider": "email",
    "providerId": "user@example.com",
    "providerData": {"email_verified": true}
  }'

# Use the access token for authenticated requests
curl http://localhost:4000/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Testing with Swagger UI

The easiest way to test the API is using the built-in Swagger UI:

1. Start the API server:

   ```bash
   cd apps/api
   npm run dev
   ```

2. Open Swagger UI in your browser:

   ```
   http://localhost:4000/api-docs
   ```

3. Click on any endpoint to expand it

4. Click "Try it out" to test the endpoint

5. Fill in the required parameters

6. Click "Execute" to send the request

7. View the response below

## Best Practices

### 1. Store Tokens Securely

- **Never** store tokens in localStorage (vulnerable to XSS)
- Use **httpOnly cookies** for web applications
- Use secure storage (Keychain/Keystore) for mobile apps

### 2. Handle Token Expiration

Implement automatic token refresh:

```typescript
async function refreshTokenIfNeeded() {
  const tokenExpiry = getTokenExpiry(accessToken);

  if (Date.now() >= tokenExpiry - 60000) {
    // Refresh 1 min before expiry
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, refreshToken }),
    });

    const { data } = await response.json();
    updateTokens(data.accessToken, data.refreshToken);
  }
}
```

### 3. Error Handling

Always check the response status and handle errors:

```typescript
const response = await fetch('/api/users', {
  headers: { Authorization: `Bearer ${accessToken}` },
});

if (!response.ok) {
  const error = await response.json();

  if (error.code === 'UNAUTHENTICATED') {
    // Redirect to login
  } else if (error.code === 'VALIDATION_ERROR') {
    // Show validation errors to user
    console.error('Validation errors:', error.details);
  } else {
    // Handle other errors
    console.error('API error:', error.error);
  }
  return;
}

const data = await response.json();
```

### 4. Request Timeouts

Set appropriate timeouts to prevent hanging requests:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch('/api/users', {
    signal: controller.signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // ... handle response
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timeout');
  }
} finally {
  clearTimeout(timeoutId);
}
```

## Comparison: REST vs GraphQL

Both REST and GraphQL APIs are available. Choose based on your needs:

| Feature            | REST                     | GraphQL                     |
| ------------------ | ------------------------ | --------------------------- |
| **Learning Curve** | Lower                    | Higher                      |
| **Flexibility**    | Fixed endpoints          | Query exactly what you need |
| **Caching**        | Standard HTTP caching    | Requires custom caching     |
| **Documentation**  | Swagger UI               | GraphQL Playground          |
| **Tooling**        | More mature ecosystem    | Growing ecosystem           |
| **Best For**       | Simple CRUD, mobile apps | Complex queries, web apps   |

## See Also

- [GraphQL API](/api-reference/graphql-schema) - Alternative API using GraphQL
- [Authentication](/api-reference/authentication) - Detailed authentication guide
- [Error Handling](/api-reference/error-handling) - Complete error handling guide
- [Development Guide](/development/guide) - Contributing to the API
