# Error Handling

Grant provides standardized error handling across all API endpoints with proper HTTP status codes and internationalization support.

## Error Response Format

All API errors follow a consistent structure:

```json
{
  "error": "Localized error message",
  "code": "ERROR_CODE",
  "extensions": {
    "field": "additionalContext"
  }
}
```

## HTTP Status Codes

| Status Code | Error Class           | Description           | Example                  |
| ----------- | --------------------- | --------------------- | ------------------------ |
| **400**     | `BadRequestError`     | Malformed request     | Invalid request format   |
| **400**     | `ValidationError`     | Invalid input         | Missing required field   |
| **401**     | `AuthenticationError` | Authentication failed | Invalid credentials      |
| **403**     | `AuthorizationError`  | Permission denied     | Insufficient permissions |
| **404**     | `NotFoundError`       | Resource not found    | User not found           |
| **409**     | `ConflictError`       | Resource conflict     | Email already exists     |
| **500**     | `ApiError`            | Internal server error | Unexpected error         |

## Error Codes

All errors include a machine-readable `code` field:

```json
{
  "error": "User not found",
  "code": "NOT_FOUND"
}
```

### Common Error Codes

| Code               | Status | Description             |
| ------------------ | ------ | ----------------------- |
| `UNAUTHENTICATED`  | 401    | User not authenticated  |
| `FORBIDDEN`        | 403    | User lacks permission   |
| `NOT_FOUND`        | 404    | Resource doesn't exist  |
| `BAD_USER_INPUT`   | 400    | Invalid input data      |
| `CONFLICT`         | 409    | Resource already exists |
| `VALIDATION_ERROR` | 400    | Validation failed       |
| `INTERNAL_ERROR`   | 500    | Server error            |

## Localized Errors

All errors are automatically localized based on the `Accept-Language` header:

```bash
# English
curl -H "Accept-Language: en" \
     http://localhost:4000/api/users/invalid-id

# Response:
{
  "error": "User not found",
  "code": "NOT_FOUND"
}

# German
curl -H "Accept-Language: de" \
     http://localhost:4000/api/users/invalid-id

# Response:
{
  "error": "Benutzer nicht gefunden",
  "code": "NOT_FOUND"
}
```

**Supported Languages:**

- 🇬🇧 English (`en`) - Default
- 🇩🇪 German (`de`)

See [Internationalization Guide](/advanced-topics/internationalization) for details.

## Authentication Errors (401)

### Invalid Credentials

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "wrong"
}
```

```json
{
  "error": "Invalid email or password",
  "code": "UNAUTHENTICATED"
}
```

### Invalid Token

```http
GET /api/users/me
Authorization: Bearer invalid_token
```

```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHENTICATED"
}
```

### User Not Verified

```json
{
  "error": "Please verify your email before logging in",
  "code": "UNAUTHENTICATED"
}
```

## Authorization Errors (403)

### Insufficient Permissions

```http
DELETE /api/organizations/123
Authorization: Bearer valid_token
```

```json
{
  "error": "You are not authorized to perform this action",
  "code": "FORBIDDEN"
}
```

## Not Found Errors (404)

### Resource Not Found

```http
GET /api/users/invalid-id
```

```json
{
  "error": "User not found",
  "code": "NOT_FOUND"
}
```

### Organization Not Found

```http
GET /api/organizations/invalid-id
```

```json
{
  "error": "Organization not found",
  "code": "NOT_FOUND"
}
```

## Validation Errors (400)

### Missing Required Field

```http
POST /api/organizations
Content-Type: application/json

{
  "name": ""
}
```

```json
{
  "error": "Organization name is required",
  "code": "VALIDATION_ERROR",
  "extensions": {
    "field": "name"
  }
}
```

### Invalid Format

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "not-an-email",
  "password": "123"
}
```

```json
{
  "error": "Invalid email format",
  "code": "VALIDATION_ERROR",
  "extensions": {
    "field": "email"
  }
}
```

## Conflict Errors (409)

### Duplicate Resource

```http
POST /api/users
Content-Type: application/json

{
  "email": "existing@example.com",
  "password": "password123"
}
```

```json
{
  "error": "A User with this email already exists",
  "code": "CONFLICT",
  "extensions": {
    "resource": "User",
    "field": "email"
  }
}
```

### Duplicate Association

```http
POST /api/organizations/123/roles
Content-Type: application/json

{
  "roleId": "role-123"
}
```

```json
{
  "error": "Organization already has this role",
  "code": "CONFLICT",
  "extensions": {
    "resource": "OrganizationRole",
    "field": "roleId"
  }
}
```

## Bad Request Errors (400)

### Invalid Request Format

```http
POST /api/organizations
Content-Type: application/json

{
  invalid json
}
```

```json
{
  "error": "Invalid request format",
  "code": "BAD_USER_INPUT"
}
```

### Invalid Query Parameter

```http
GET /api/users?page=invalid
```

```json
{
  "error": "Invalid query parameter",
  "code": "BAD_USER_INPUT",
  "extensions": {
    "field": "page"
  }
}
```

## Internal Server Errors (500)

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

**Note**: In development mode, stack traces are included:

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "stack": "Error: ...\n    at ..."
}
```

## GraphQL Errors

GraphQL errors follow the same structure within the `errors` array:

```json
{
  "data": null,
  "errors": [
    {
      "message": "User not found",
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ]
}
```

## Error Handling in Client Applications

### JavaScript/TypeScript

```typescript
try {
  const response = await fetch('/api/users/123');

  if (!response.ok) {
    const error = await response.json();

    switch (error.code) {
      case 'NOT_FOUND':
        console.log('User not found');
        break;
      case 'UNAUTHENTICATED':
        console.log('Please log in');
        break;
      case 'FORBIDDEN':
        console.log('Permission denied');
        break;
      default:
        console.log('Error:', error.error);
    }
  }
} catch (err) {
  console.error('Network error:', err);
}
```

### React with Apollo Client

```typescript
import { useMutation } from '@apollo/client';

function CreateOrganization() {
  const [createOrg, { error }] = useMutation(CREATE_ORGANIZATION);

  if (error) {
    // Error message is already localized!
    const { message, extensions } = error.graphQLErrors[0];

    if (extensions?.code === 'CONFLICT') {
      return <div>Organization already exists</div>;
    }

    return <div>Error: {message}</div>;
  }

  return <button onClick={() => createOrg()}>Create</button>;
}
```

### Axios

```typescript
import axios from 'axios';

try {
  await axios.post('/api/organizations', data);
} catch (error) {
  if (error.response) {
    const { error: message, code } = error.response.data;

    // Handle specific errors
    if (code === 'VALIDATION_ERROR') {
      console.log('Validation failed:', message);
    }
  }
}
```

## Best Practices

### 1. Always Check HTTP Status Code

```typescript
// ✅ Good
if (response.status === 404) {
  console.log('Not found');
}

// ❌ Bad
if (response.data.error.includes('not found')) {
  console.log('Not found');
}
```

### 2. Use Error Codes, Not Messages

```typescript
// ✅ Good - error codes are stable
if (error.code === 'NOT_FOUND') {
  // Handle not found
}

// ❌ Bad - messages can change and are localized
if (error.error === 'User not found') {
  // This breaks in German!
}
```

### 3. Handle Localization in Client

```typescript
// ✅ Good - use API error message (already localized)
<Alert>{error.message}</Alert>

// ❌ Bad - override with hardcoded message
<Alert>User not found</Alert>
```

### 4. Display User-Friendly Messages

```typescript
// ✅ Good
{error.code === 'UNAUTHENTICATED' && (
  <Alert>Please log in to continue</Alert>
)}

// ❌ Bad
{error.code === 'UNAUTHENTICATED' && (
  <Alert>ERR_UNAUTHENTICATED: TOKEN_INVALID</Alert>
)}
```

## Testing Error Handling

### Test All Error Types

```typescript
describe('Error Handling', () => {
  it('returns 404 for non-existent user', async () => {
    const response = await request(app).get('/api/users/invalid-id');

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
    expect(response.body.error).toBe('User not found');
  });

  it('returns localized errors', async () => {
    const response = await request(app).get('/api/users/invalid-id').set('Accept-Language', 'de');

    expect(response.body.error).toBe('Benutzer nicht gefunden');
  });
});
```

## Related Documentation

- **[Internationalization Guide](/advanced-topics/internationalization)** - Multi-language error messages
- **[REST API Reference](/api-reference/rest-api)** - Complete REST API documentation
- **[GraphQL API Reference](/api-reference/graphql)** - GraphQL error handling
- **[Development Guide](/development/guide)** - Adding new error types

---

## Summary

✅ **Consistent Structure** - All errors follow the same format  
✅ **Proper Status Codes** - Correct HTTP status for each error type  
✅ **Machine-Readable Codes** - Use `code` field for programmatic handling  
✅ **Localized Messages** - Automatic translation based on `Accept-Language`  
✅ **Type Safe** - TypeScript types for all error classes  
✅ **Extensible** - Easy to add new error types

**Key Takeaway**: Use `code` field for logic, display `error` message to users, and always check HTTP status codes.
