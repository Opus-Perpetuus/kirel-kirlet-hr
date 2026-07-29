-- Registro de incidencias (accidentes, disciplina, quejas, etc.)
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  folio TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'otro'
    CHECK (type IN ('accidente','enfermedad','disciplina','queja','mejora','seguridad','otro')),
  severity TEXT NOT NULL DEFAULT 'media'
    CHECK (severity IN ('baja','media','alta','critica')),
  status TEXT NOT NULL DEFAULT 'abierta'
    CHECK (status IN ('abierta','en_revision','en_proceso','resuelta','cerrada','cancelada')),
  occurred_at TEXT,
  location TEXT,
  reported_by TEXT,
  assigned_to TEXT,
  resolution_note TEXT,
  closed_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incidents_employee ON incidents(employee_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_active ON incidents(is_active);
