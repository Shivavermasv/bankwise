# Idempotency Guide for Banking Operations

## What is Idempotency?

Idempotency ensures that an operation produces the same result regardless of how many times it's executed. In banking, this is critical to prevent:

- **Duplicate transfers** if the network times out and client retries
- **Multiple EMI deductions** if a scheduled job runs twice
- **Double deposits** if a request is processed twice
- **Duplicate loan applications** if submission is retried

## How It Works

```
Request 1: Client sends transfer request
         ↓
         Server processes transfer
         ↓
         Client times out before receiving response
         
         [Money is transferred, but client doesn't know]
         
Request 2: Client retries the SAME request
         ↓
         Server sees duplicate via Idempotency-Key
         ↓
         Server returns EXACT same response as first request
         
         [No double transfer! Money transferred only once]
```

## Implementation in BankWise

### 1. Transfer (Funds Sent)

```bash
# Request with Idempotency-Key header
curl -X POST http://localhost:8091/api/transaction/transfer \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "fromAccount": "ACC-001",
    "toAccount": "ACC-002",
    "amount": 1000
  }'

Response:
{
  "status": "SUCCESS",
  "data": "SUCCESS",
  "idempotent": true
}

# Retry (network issue):
curl -X POST http://localhost:8091/api/transaction/transfer \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "fromAccount": "ACC-001",
    "toAccount": "ACC-002",
    "amount": 1000
  }'

Response (SAME as above - no second transfer):
{
  "status": "SUCCESS",
  "data": "SUCCESS",
  "idempotent": true
}
```

### 2. Deposits (Cash Added to Account)

```java
// Backend implementation
@PostMapping("/deposits")
public ResponseEntity<?> createDeposit(
    @RequestBody DepositRequestDto dto,
    @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
) {
    return ResponseEntity.ok(
        depositService.processDepositWithIdempotency(dto, idempotencyKey)
    );
}
```

### 3. Loan Operations

```java
// Loan application - prevent duplicate applications
@PostMapping("/loans/apply")
public ResponseEntity<?> applyForLoan(
    @RequestBody LoanRequestDto dto,
    @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
) {
    return ResponseEntity.ok(
        loanService.applyForLoanWithIdempotency(dto, idempotencyKey)
    );
}

// Loan EMI payment - prevent double deductions
@PostMapping("/loans/pay-emi")
public ResponseEntity<?> payEmi(
    @RequestBody EmiPaymentDto dto,
    @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey
) {
    return ResponseEntity.ok(
        loanService.payEmiWithIdempotency(dto, idempotencyKey)
    );
}
```

## Idempotency Key Format

Use UUID v4 (universally unique, randomly generated):

```
Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
Example: 550e8400-e29b-41d4-a716-446655440000

Generation (JavaScript):
const idempotencyKey = crypto.randomUUID();

Generation (Java):
String idempotencyKey = UUID.randomUUID().toString();

Generation (Python):
idempotency_key = str(uuid.uuid4())
```

## Frontend Implementation

### React Example

```javascript
import { v4 as uuidv4 } from 'uuid';

function TransferForm() {
  const [idempotencyKey] = useState(uuidv4());

  const handleTransfer = async (formData) => {
    try {
      const response = await fetch('/api/transaction/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,  // Include key
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        // Safe to retry with same idempotencyKey
        toast.success('Transfer successful');
      } else {
        // Safe to retry - same key prevents duplicates
        toast.error('Transfer failed, will retry automatically');
      }
    } catch (error) {
      // Network error - automatic retry with same key is safe!
      console.error('Network error:', error);
      // Retry mechanism here
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleTransfer({
        fromAccount: 'ACC-001',
        toAccount: 'ACC-002',
        amount: 1000,
      });
    }}>
      {/* form fields */}
    </form>
  );
}
```

### Auto-Retry with Idempotency

```javascript
async function transferWithRetry(formData, maxRetries = 3) {
  const idempotencyKey = uuidv4();
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/transaction/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,  // Same key each retry!
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        return await response.json();
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError;
}
```

## Backend Service Implementation

### IdempotencyService

```java
@Service
public class IdempotencyService {
    private final RedisTemplate<String, String> redisTemplate;

    /**
     * Get cached result if operation was already completed
     */
    public String getResult(String idempotencyKey) {
        String resultKey = "idempotency:result::" + idempotencyKey;
        return redisTemplate.opsForValue().get(resultKey);
    }

    /**
     * Acquire lock to prevent concurrent processing
     */
    public boolean acquireIdempotencyLock(String idempotencyKey) {
        String lockKey = "idempotency::" + idempotencyKey;
        return Boolean.TRUE.equals(
            redisTemplate.opsForValue().setIfAbsent(
                lockKey, "processing", Duration.ofMinutes(5)
            )
        );
    }

    /**
     * Store result for future duplicate requests
     */
    public void storeResult(String idempotencyKey, String result) {
        String resultKey = "idempotency:result::" + idempotencyKey;
        redisTemplate.opsForValue().set(
            resultKey, result, Duration.ofHours(24)
        );
    }
}
```

### Service Layer Pattern

```java
@Service
@Transactional
public class TransactionService {
    
    @Autowired
    private IdempotencyService idempotencyService;
    
    /**
     * Process transfer with idempotency
     */
    public String processTransactionWithIdempotency(
        TransferRequestDto dto,
        String idempotencyKey
    ) {
        // Return cached result if already processed
        String cached = idempotencyService.getResult(idempotencyKey);
        if (cached != null) {
            log.info("Returning cached result for key: {}", idempotencyKey);
            return cached;
        }

        // Acquire lock to prevent concurrent processing
        if (!idempotencyService.acquireIdempotencyLock(idempotencyKey)) {
            throw new BusinessRuleViolationException(
                "Operation already in progress"
            );
        }

        try {
            // Do actual processing
            String result = processTransaction(dto);
            
            // Store for future retries
            idempotencyService.storeResult(idempotencyKey, result);
            
            return result;
        } catch (Exception e) {
            // Release lock on error
            idempotencyService.releaseLock(idempotencyKey);
            throw e;
        }
    }
}
```

## Operations Requiring Idempotency

| Operation | Risk | Implementation |
|-----------|------|----------------|
| Transfer | Duplicate transfer | ✓ Implemented |
| Deposit | Double credit | Planned |
| Withdrawal | Double debit | Planned |
| EMI Payment | Multiple deductions | Planned |
| Loan Application | Duplicate apps | Planned |
| Loan Approval | Double disbursement | Planned |
| Card Activation | Multiple activations | Planned |

## Redis Storage Details

### How Idempotency Data is Stored

```
Key Format: "idempotency:result::" + UUID

Example keys in Redis:
idempotency:result::550e8400-e29b-41d4-a716-446655440000
idempotency:result::f47ac10b-58cc-4372-a567-0e02b2c3d479
idempotency:result::12345678-1234-5678-1234-567812345678

Value: Result string (e.g., "SUCCESS" or JSON response)

TTL: 24 hours (prevents redis from growing indefinitely)
```

### Lock Mechanism

```
Lock Key Format: "idempotency::" + UUID
TTL: 5 minutes (prevents deadlock if service crashes)

While operation is processing:
idempotency::550e8400-e29b-41d4-a716-446655440000 = "processing"

After operation completes:
Lock is released
Result is stored
```

## Error Handling

```java
// If operation fails, lock is released
try {
    String result = processTransaction(dto);
    idempotencyService.storeResult(idempotencyKey, result);
    return result;
} catch (InsufficientFundsException e) {
    // Release lock - allow client to retry
    idempotencyService.releaseLock(idempotencyKey);
    throw e;  // Client can retry
}

// Client behavior on failure:
// 1. If timeout/network error: ALWAYS retry with same key (safe!)
// 2. If business error (insufficient funds): Ask user to fix, then retry
// 3. Same idempotency key ensures safety in both cases
```

## Testing Idempotency

### Unit Test Example

```java
@Test
public void testTransferIdempotency() {
    String idempotencyKey = UUID.randomUUID().toString();
    TransferRequestDto dto = new TransferRequestDto("ACC-001", "ACC-002", 1000);

    // First request
    String result1 = transactionService.processTransactionWithIdempotency(
        dto, idempotencyKey
    );

    // Second request with same key
    String result2 = transactionService.processTransactionWithIdempotency(
        dto, idempotencyKey
    );

    // Should return exact same result
    assertEquals(result1, result2);
    
    // Verify transfer only happened once
    assertEquals(1, transactionRepository.findByIdempotencyKey(idempotencyKey).size());
}
```

### Manual Testing

```bash
# Terminal 1: Initial request
curl -v -X POST http://localhost:8091/api/transaction/transfer \
  -H "Idempotency-Key: test-key-123" \
  -H "Content-Type: application/json" \
  -d '{"fromAccount":"ACC-001","toAccount":"ACC-002","amount":100}'

# Terminal 2: Concurrent retry (should wait or return lock error)
curl -v -X POST http://localhost:8091/api/transaction/transfer \
  -H "Idempotency-Key: test-key-123" \
  -H "Content-Type: application/json" \
  -d '{"fromAccount":"ACC-001","toAccount":"ACC-002","amount":100}'

# Terminal 1: After first completes, retry again
# Should return cached result from Redis
```

## Monitoring Idempotency

```bash
# Check idempotency keys in Redis
KEYS "idempotency:result::*"

# Count total idempotent operations
DBSIZE | grep idempotency

# Monitor hit rate
INFO stats | grep hits
```

## Best Practices

1. **Always use UUIDs** for idempotency keys
2. **Include key in error responses** for debugging
3. **Test retry scenarios** thoroughly
4. **Monitor idempotency hit rates** (should be 10-30%)
5. **Set appropriate TTL** (24 hours for transactions)
6. **Log idempotency key** in audit trail
7. **Educate frontend team** about idempotent requests
8. **Document which endpoints support idempotency**

## Related Services

- **IdempotencyService**: Core idempotency logic
- **TransactionService**: Implements for transfers
- **DepositService**: Should implement for deposits
- **LoanService**: Should implement for loans
