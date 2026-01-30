-- ============================================
-- Database Fixes for Bankwise
-- Run this SQL against your PostgreSQL database
-- ============================================

-- 1. Fix the scheduled_payments_frequency_check constraint to include DAILY and BIWEEKLY
-- First, drop the existing constraint
ALTER TABLE scheduled_payments DROP CONSTRAINT IF EXISTS scheduled_payments_frequency_check;

-- Add the updated constraint with all frequency values
ALTER TABLE scheduled_payments ADD CONSTRAINT scheduled_payments_frequency_check 
    CHECK (frequency IN ('ONE_TIME', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'));

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'scheduled_payments_frequency_check';

-- 2. Fix existing loans that have NULL or 0 totalEmis - set to tenureInMonths
UPDATE loan_request 
SET total_emis = tenure_in_months 
WHERE (total_emis IS NULL OR total_emis = 0) 
  AND tenure_in_months IS NOT NULL 
  AND tenure_in_months > 0;

-- 3. Ensure emisPaid is not NULL (set to 0 if NULL)
UPDATE loan_request 
SET emis_paid = 0 
WHERE emis_paid IS NULL;

-- Verify the loan fix
SELECT id, amount, tenure_in_months, total_emis, emis_paid, status 
FROM loan_request 
ORDER BY id DESC 
LIMIT 10;
