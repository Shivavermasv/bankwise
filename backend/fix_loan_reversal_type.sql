-- Fix: Add LOAN_REVERSAL to the transaction_type_check constraint
-- Run this script against your PostgreSQL database

-- Drop the existing constraint
ALTER TABLE transaction DROP CONSTRAINT IF EXISTS transaction_type_check;

-- Add the updated constraint with LOAN_REVERSAL included
ALTER TABLE transaction ADD CONSTRAINT transaction_type_check 
CHECK (type IN ('DEPOSIT', 'TRANSFER', 'WITHDRAW', 'LOAN_PAYMENT', 'LOAN_PENALTY', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'LOAN_REVERSAL', 'SCHEDULED_PAYMENT', 'BILL_PAYMENT'));

-- Also update VerificationStatus constraint if it exists (for FROZEN status)
ALTER TABLE account DROP CONSTRAINT IF EXISTS account_verification_status_check;

ALTER TABLE account ADD CONSTRAINT account_verification_status_check 
CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'FROZEN', 'DISABLED'));
