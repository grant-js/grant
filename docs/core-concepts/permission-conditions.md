---
title: Permission Conditions
description: Full syntax reference for conditional permission expressions in Grant
---

# Permission Conditions

Permission conditions restrict access beyond the action itself. They are evaluated at authorization time and allow attribute-based rules within the RBAC model — for example, "only if the user owns the resource" or "only if the user's department matches."

## Overview

When a permission has a condition, Grant evaluates it after matching the resource and action. The condition receives an **execution context** (user, roles, groups, and optionally the resolved resource) and returns whether access is granted.

- Permissions **without** a condition are granted immediately when the resource and action match.
- Permissions **with** a condition must pass the condition evaluation before access is granted.

## Syntax Structure

Conditions are JSON objects. The structure is:

```json
{ "Operator": { "field.path": value } }
```

For logical operators, the structure differs:

- `And` and `Or`: `{ "And": [ condition1, condition2, ... ] }` — array of condition expressions
- `Not`: `{ "Not": condition }` — single condition expression

## Logical Operators

| Operator | Structure            | Description                                |
| -------- | -------------------- | ------------------------------------------ |
| `And`    | `{ "And": [ ... ] }` | All nested conditions must be true         |
| `Or`     | `{ "Or": [ ... ] }`  | At least one nested condition must be true |
| `Not`    | `{ "Not": { ... } }` | Negates the nested condition               |

**Examples:**

```json
{
  "And": [
    { "StringEquals": { "user.metadata.department": "sales" } },
    { "StringEquals": { "user.metadata.region": "us-east" } }
  ]
}
```

```json
{
  "Or": [
    { "Equals": { "user.id": "&#123;&#123;resource.ownerId&#125;&#125;" } },
    { "In": { "user.metadata.adminIds": ["&#123;&#123;resource.organizationId&#125;&#125;"] } }
  ]
}
```

```json
{
  "Not": {
    "StringEquals": { "user.metadata.status": "suspended" }
  }
}
```

## Comparison Operators

| Operator                   | Left operand | Right operand | Description                                      |
| -------------------------- | ------------ | ------------- | ------------------------------------------------ |
| `Equals`                   | any          | any           | Equality (both sides coerced to string)          |
| `StringEquals`             | any          | any           | String equality                                  |
| `NotEquals`                | any          | any           | Inequality                                       |
| `StringNotEquals`          | any          | any           | String inequality                                |
| `In`                       | any          | array         | Left value is in the right array                 |
| `StringIn`                 | any          | array         | Left value (as string) is in the right array     |
| `NotIn`                    | any          | array         | Left value is not in the right array             |
| `StringNotIn`              | any          | array         | Left value (as string) is not in the right array |
| `Contains`                 | array        | any           | Right value is contained in the left array       |
| `StartsWith`               | string       | string        | Left string starts with right string             |
| `EndsWith`                 | string       | string        | Left string ends with right string               |
| `NumericEquals`            | number       | number        | Numeric equality                                 |
| `NumericGreaterThan`       | number       | number        | Left > right                                     |
| `NumericLessThan`          | number       | number        | Left < right                                     |
| `NumericGreaterThanEquals` | number       | number        | Left >= right                                    |
| `NumericLessThanEquals`    | number       | number        | Left <= right                                    |

**Examples:**

```json
{ "StringEquals": { "user.metadata.department": "engineering" } }
```

```json
{ "In": { "user.metadata.policies": ["POLICY-1", "POLICY-2"] } }
```

```json
{ "NumericGreaterThan": { "resource.amount": 500 } }
```

## Field Paths

Field paths reference values in the execution context. Dot notation is used for nested properties.

| Path prefix        | Source                  | Description                                                                               |
| ------------------ | ----------------------- | ----------------------------------------------------------------------------------------- |
| `user.id`          | Execution context       | The requesting user's ID                                                                  |
| `user.metadata.*`  | User entity             | User metadata (e.g. `user.metadata.department`)                                           |
| `role.id`          | Role (when evaluating)  | Role ID                                                                                   |
| `role.name`        | Role                    | Role name                                                                                 |
| `role.metadata.*`  | Role entity             | Role metadata                                                                             |
| `group.id`         | Group (when evaluating) | Group ID                                                                                  |
| `group.name`       | Group                   | Group name                                                                                |
| `group.metadata.*` | Group entity            | Group metadata                                                                            |
| `resource.*`       | Resource resolver       | Resolved resource data from your application (e.g. `resource.ownerId`, `resource.amount`) |

::: tip

The `resource` prefix refers to **resolved resource** data. When using `@grantjs/server` with a `resourceResolver`, the returned object is available under `resource.*`. If no resource is resolved, these paths evaluate to `undefined`.

:::

## Field References

Values can be static or dynamic. Dynamic values reference other fields in the context:

**Template syntax:** <code>&#123;&#123;path&#125;&#125;</code> — References a field path (e.g. <code>&#123;&#123;user.id&#125;&#125;</code>, <code>&#123;&#123;resource.ownerId&#125;&#125;</code>)

**Object syntax:** `{ "$ref": "path" }` — Same as template, useful when the value is not a string

**Examples:**

```json
{
  "StringEquals": {
    "resource.ownerId": "&#123;&#123;user.id&#125;&#125;"
  }
}
```

```json
{
  "Equals": {
    "resource.department": { "$ref": "user.metadata.department" }
  }
}
```

Arrays can contain references; they are resolved and flattened:

```json
{
  "In": {
    "resource.id": ["&#123;&#123;user.metadata.policies&#125;&#125;"]
  }
}
```

## Use Cases

### Ownership (user owns the resource)

Only allow access when the resource's owner matches the current user:

```json
{
  "StringEquals": {
    "resource.ownerId": "&#123;&#123;user.id&#125;&#125;"
  }
}
```

Requires a resource resolver that returns `{ ownerId: ... }` for the resource.

### Department or region checks

Restrict to users in a specific department:

```json
{
  "StringEquals": {
    "user.metadata.department": "sales"
  }
}
```

Or allow multiple regions:

```json
{
  "StringIn": {
    "user.metadata.region": ["us-east", "us-west"]
  }
}
```

### Own sessions / authentication methods

Grant's built-in "own sessions only" and "own auth methods only" patterns use conditions comparing `user.id` with the session/method owner. The resource resolver provides the ownership data.

### API key: delete own keys only

Allow Dev role to delete/revoke only API keys they created:

```json
{
  "StringEquals": {
    "resource.createdBy": "&#123;&#123;user.id&#125;&#125;"
  }
}
```

### Complex logic (And + Or)

User must be in sales and (in us-east or us-west):

```json
{
  "And": [
    { "StringEquals": { "user.metadata.department": "sales" } },
    {
      "Or": [
        { "StringEquals": { "user.metadata.region": "us-east" } },
        { "StringEquals": { "user.metadata.region": "us-west" } }
      ]
    }
  ]
}
```

## Validation

Invalid conditions are rejected when creating or updating permissions. Common errors:

- `And` and `Or` must have an **array** of condition expressions
- `Not` must have a **single** condition expression (object), not an array
- Comparison operators expect an **object** of field paths to values
- Field paths must reference valid context properties

## Related

- [Resources](/core-concepts/resources) — Conditional permissions overview
- [RBAC System](/architecture/rbac) — How conditions are evaluated in the permission flow
- [Server SDK — Resource resolvers](/integration/server-sdk#resource-resolvers) — Providing `resource` data for condition evaluation
