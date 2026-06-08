-- Add is_subscription to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT false NOT NULL;
