-- App de caseta: bitácora del turno (notas) e incidentes (con fotos).
-- Los incidentes son alertas tipo 'incidente': aparecen en Alertas y en el mapa, y la oficina los resuelve.

ALTER TABLE alertas DROP CONSTRAINT IF EXISTS alertas_tipo_check;
ALTER TABLE alertas ADD CONSTRAINT alertas_tipo_check
  CHECK (tipo IN ('sos', 'no_escaneo', 'fuera_de_rango', 'fuera_de_zona', 'incidente'));
ALTER TABLE alertas
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(20),   -- incidente: robo, dano, sospechoso, accidente, otro
  ADD COLUMN IF NOT EXISTS fotos TEXT[];

CREATE TABLE IF NOT EXISTS bitacora_caseta (
  id          SERIAL PRIMARY KEY,
  servicio_id INTEGER NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  empleado_id INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  texto       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bitacora_caseta ON bitacora_caseta (servicio_id, created_at);
