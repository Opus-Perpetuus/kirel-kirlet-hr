CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE departments (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE positions (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL, description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE employees (id TEXT PRIMARY KEY, name TEXT NOT NULL, full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE, department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  position_id TEXT REFERENCES positions(id) ON DELETE SET NULL,
  manager_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  hired_at TEXT, phone TEXT, rfc TEXT, curp TEXT, nss TEXT,
  is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE TABLE contracts (id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('indeterminado','determinado','obra','capacitacion','temporada')),
  start_date TEXT NOT NULL, end_date TEXT, salary REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MXN',
  schedule TEXT NOT NULL DEFAULT 'completa' CHECK (schedule IN ('completa','parcial')),
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','vencido','terminado')),
  notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX idx_contracts_employee ON contracts(employee_id);
CREATE TABLE leave_types (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, paid INTEGER NOT NULL DEFAULT 1,
  max_days_per_year REAL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE leave_requests (id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id),
  start_date TEXT NOT NULL, end_date TEXT NOT NULL, days REAL NOT NULL, reason TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','aprobada','rechazada','cancelada')),
  decided_by TEXT, decided_at TEXT, decision_note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE TABLE leave_balances (id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id),
  year INTEGER NOT NULL, entitled_days REAL NOT NULL DEFAULT 0, used_days REAL NOT NULL DEFAULT 0,
  UNIQUE (employee_id, leave_type_id, year));
CREATE TABLE documents (id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL, doc_type TEXT NOT NULL DEFAULT 'otro',
  file_name TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL, uploaded_by TEXT, created_at TEXT NOT NULL);
CREATE INDEX idx_documents_employee ON documents(employee_id);
CREATE TABLE history (id TEXT PRIMARY KEY, resource TEXT NOT NULL, record_id TEXT NOT NULL,
  action TEXT NOT NULL, summary TEXT NOT NULL, payload TEXT, actor TEXT, created_at TEXT NOT NULL);
CREATE INDEX idx_history_record ON history(resource, record_id);
