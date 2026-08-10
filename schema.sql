-- Mayor de Stock — esquema D1
-- Una fila por "space" (inventario). El estado completo va en 'data' (JSON).
CREATE TABLE IF NOT EXISTS estado (
  space       TEXT PRIMARY KEY,
  data        TEXT,
  rev         INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT
);
