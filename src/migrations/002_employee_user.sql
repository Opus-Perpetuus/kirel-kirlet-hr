-- Optional link from employee to platform (NOX) user id.
-- Cross-process: NOX Postgres users live elsewhere; store as plain TEXT.
ALTER TABLE employees ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
