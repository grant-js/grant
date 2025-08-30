# Transaction-Aware Architecture for Identity Central

## Overview

This document outlines the new transaction-aware architecture that moves complex multi-step operations from the frontend to the backend, ensuring atomicity and proper connection reuse across the entire request lifecycle.

## Architecture Benefits

### 1. **Atomic Operations**

- Complex operations spanning multiple repositories are now atomic
- All-or-nothing behavior prevents partial state corruption
- Proper rollback on any failure

### 2. **Connection Reuse**

- Single database connection per request flows through entire chain
- Prevents connection pool exhaustion
- Maintains transaction scope across all operations

### 3. **Backend Orchestration**

- Business logic moved from frontend to backend
- Single API call instead of multiple mutations
- Better error handling and validation

### 4. **Service Coordination**

- Services now have access to all repositories via the repositories object
- Enables complex orchestration without tight coupling
- Clean separation of concerns

## Current Implementation Status

### ✅ **Completed Components**

#### **Transaction Infrastructure**

- `TransactionManager` class for wrapping Drizzle transactions
- `Transaction` type alias for type safety
- Proper connection reuse within transaction scope

#### **Repository Layer**

- All 25+ repositories updated with factory functions
- Base `EntityRepository` and `PivotRepository` support transactions
- Connection injection via constructor
- Transaction parameters in all CRUD methods

#### **Service Layer**

- All service factory functions updated to accept `repositories` object
- Services can now access any repository for orchestration
- Transaction parameters in service interfaces
- Proper transaction propagation to repositories

#### **Service Factory Architecture**

- `createServices` function creates repositories with shared connection
- All service factories receive the complete repositories object
- Enables services to coordinate between multiple repositories
- Maintains connection reuse across entire request chain

### 🔄 **In Progress**

- Service implementations updated for transaction support
- Repository interfaces updated for transaction parameters

### 📋 **Next Steps**

1. **Complete Orchestration Services** - Implement complex business operations
2. **Compound Operations** - Create operations spanning multiple repositories
3. **GraphQL Schema Updates** - Support for compound operations
4. **Frontend Migration** - Move from multiple mutations to single operations

## Architecture Flow

```
GraphQL Resolver
       ↓
   Context (with db connection)
       ↓
   createServices(db, user)
       ↓
   createRepositories(db) → All repositories share same connection
       ↓
   Service Factories (receive repositories object)
       ↓
   Service Instances (can access any repository)
       ↓
   TransactionManager.withTransaction()
       ↓
   Repository Operations (use transaction or fallback to db)
```

## Key Design Decisions

### 1. **Repositories Object Pattern**

- All services receive the complete repositories object
- Enables coordination between multiple repositories
- Maintains clean dependency injection
- No tight coupling between services

### 2. **Transaction Propagation**

- Transactions flow from services down to repositories
- Base repository classes handle transaction logic
- Fallback to regular db connection when no transaction

### 3. **Connection Reuse**

- Single `db` instance per request
- Passed through context → services → repositories
- Prevents connection pool exhaustion

## Migration Strategy

### **Phase 1: Infrastructure (✅ Complete)**

- Transaction management
- Connection injection
- Repository factory functions

### **Phase 2: Service Layer (✅ Complete)**

- Service factory updates
- Transaction parameter support
- Repositories object pattern

### **Phase 3: Orchestration (🔄 Next)**

- Complex business operations
- Multi-repository coordination
- Transaction-aware orchestration

### **Phase 4: Frontend Integration**

- GraphQL schema updates
- Frontend migration
- Testing and validation

## Testing

### **Unit Tests**

- Test transaction rollback scenarios
- Verify connection reuse
- Validate atomic operations

### **Integration Tests**

- Test complete request flows
- Verify transaction boundaries
- Test error scenarios

## Performance Impact

### **Positive**

- Reduced network overhead (single request vs multiple)
- Better connection pool utilization
- Atomic operations prevent partial failures

### **Considerations**

- Slightly longer transaction duration
- Need to monitor transaction timeouts
- Connection pool sizing may need adjustment

## Rollback Plan

If issues arise:

1. Revert to previous service factory pattern
2. Remove transaction parameters
3. Restore individual repository injection
4. Maintain connection reuse improvements

## Conclusion

This architecture provides a solid foundation for:

- Complex business operations
- Proper transaction management
- Connection efficiency
- Service coordination

The next phase will implement the actual orchestration services that leverage this infrastructure to move complex operations from the frontend to the backend.
