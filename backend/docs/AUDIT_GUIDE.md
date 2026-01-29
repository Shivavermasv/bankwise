# Audit System Guide

## Overview

The Audit Module (`AuditService`) is a comprehensive logging system designed to track all important banking operations for compliance, security, and troubleshooting purposes.

## Purpose

The audit system serves multiple critical functions:

1. **Compliance**: Maintains a complete record of all banking operations required for regulatory compliance
2. **Security**: Tracks user actions to detect suspicious patterns or unauthorized access attempts
3. **Accountability**: Creates an immutable record of who did what and when
4. **Troubleshooting**: Helps debug issues by showing the exact sequence of operations
5. **Fraud Detection**: Enables identification of fraudulent transactions or unauthorized account access

## What Gets Audited?

The following operations are automatically logged:

### Account Operations
- Account creation
- Account verification status changes
- Account suspension/activation
- KYC updates
- Profile modifications

### Transaction Operations
- Transfers (success/failure/denial)
- Deposits (approval/rejection)
- Withdrawals
- Loan disbursements

### Loan Operations
- Loan applications
- Loan approvals/rejections
- Status changes
- EMI calculations and deductions

### User Operations
- Login attempts (success/failure)
- Password changes
- Profile updates
- Role changes

## Audit Log Structure

Each audit entry contains:

```json
{
  "action": "TRANSFER",              // What operation was performed
  "actor_email": "user@example.com", // Who performed it
  "actor_role": "CUSTOMER",          // Their role
  "target_type": "TRANSACTION",      // What was affected (entity type)
  "target_id": "12345",              // ID of affected entity
  "status": "SUCCESS",               // Operation outcome
  "details": "...",                  // Additional context (amounts, accounts, reasons)
  "timestamp": "2026-01-29T10:30:45" // When it happened
}
```

## Usage Examples

### Recording a Custom Audit Entry

```java
auditService.record(
    "WITHDRAWAL",                    // action
    "ACCOUNT",                       // targetType  
    "ACC-123456",                    // targetId
    "SUCCESS",                       // status
    "amount=5000 source=ATM"         // details
);
```

### Recording System-Level Operations

```java
auditService.recordSystem(
    "SCHEDULED_EMI_PROCESS",
    "BATCH_JOB",
    "batch-001",
    "SUCCESS",
    "Processed 150 EMI payments successfully"
);
```

## Common Action Types

| Action | Description | Trigger |
|--------|-------------|---------|
| ACCOUNT_CREATE | Account created | New account registration |
| ACCOUNT_VERIFY | Account verification | KYC completion |
| ACCOUNT_SUSPEND | Account suspended | Admin action or fraud |
| LOGIN_SUCCESS | Successful login | User authentication |
| LOGIN_FAILED | Failed login attempt | Wrong credentials |
| TRANSFER | Fund transfer | P2P transaction |
| DEPOSIT | Deposit request | Cash deposit |
| LOAN_APPLY | Loan application | User applies for loan |
| LOAN_APPROVE | Loan approval | Admin approves loan |
| LOAN_DISBURSE | Loan disbursement | Funds transferred to account |
| EMI_DEDUCT | EMI payment | Scheduled payment |
| PASSWORD_CHANGE | Password updated | User security update |

## Querying Audit Logs

### Using AuditLogRepository

```java
// Find all actions by a user
List<AuditLog> userActions = auditLogRepository.findByActorEmail("user@example.com");

// Find all transfers on a specific date
LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
List<AuditLog> transfers = auditLogRepository.findByActionAndTimestampGreaterThan(
    "TRANSFER", 
    startOfDay
);

// Find all failed operations
List<AuditLog> failures = auditLogRepository.findByStatus("FAILED");

// Find all changes to a specific account
List<AuditLog> accountChanges = auditLogRepository.findByTargetTypeAndTargetId("ACCOUNT", "ACC-123");
```

### API Endpoint

```
GET /api/audit?action=TRANSFER&status=SUCCESS&limit=100&offset=0
```

## Data Retention

- **Production**: Audit logs are retained for 7 years (as per banking regulations)
- **Development**: Logs can be cleared for testing
- **Archive**: Old logs should be archived to cold storage after 2 years

## Security Considerations

1. **Immutability**: Audit logs should never be modified or deleted (except during development)
2. **Access Control**: Only administrators can view audit logs
3. **Encryption**: Logs should be encrypted at rest and in transit
4. **Segregation**: Separate audit database from operational database for integrity
5. **Monitoring**: Alert on suspicious patterns (e.g., multiple failed logins)

## Performance Impact

- Audit logging adds ~2-5ms per operation
- Uses asynchronous writes to prevent blocking user requests
- Indexes on `action`, `actor_email`, `status`, and `timestamp` for fast queries
- Regular archival to maintain DB performance

## Troubleshooting

### Why is an operation not appearing in the audit log?

1. Check if auditing is enabled for that operation
2. Verify the operation completed successfully (some failures may not log)
3. Check timezone differences in timestamps
4. Verify actor authentication context was present

### How to audit a new operation?

1. Add the audit call in the service method
2. Use clear, descriptive action names
3. Include relevant details (amounts, accounts, reasons)
4. Record both success and failure cases

## Related Services

- **AuditService**: Main audit logging service
- **AuditLogRepository**: Database access for audit logs
- **AuditLog Entity**: Database model for audit entries
- **AuditController**: API endpoints for audit queries

## Future Enhancements

- Real-time audit log streaming for monitoring dashboards
- Machine learning-based anomaly detection
- Automated alerts for suspicious patterns
- Blockchain-based immutable audit logs for critical operations
