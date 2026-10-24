-- Pizarrón de rondines: avisos generales y SDR (situaciones de riesgo: bloqueos, balaceras…)
-- La oficina publica; cada caseta confirma "Enterado".

CREATE TABLE IF NOT EXISTS avisos (
  id            SERIAL PRIMARY KEY,
  tipo          VARCHAR(10) NOT NULL CHECK (tipo IN ('aviso', 'sdr')),
  categoria     VARCHAR(20),                 -- solo SDR: bloqueo, balacera, robo, manifestacion, otro
  nivel         VARCHAR(12) CHECK (nivel IN ('precaucion', 'peligro')),  -- solo SDR
  titulo        VARCHAR(150) NOT NULL,
  texto         TEXT,
  zona          VARCHAR(200),
  servicio_ids  INTEGER[],                   -- NULL = todos los servicios
  vigente_hasta TIMESTAMPTZ,                 -- NULL = hasta que la oficina lo retire
  activo        BOOLEAN NOT NULL DEFAULT true,
  creado_por    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avisos_vigentes ON avisos (activo, vigente_hasta);

-- Acuse por caseta (el celular es compartido); guardia en turno si había uno solo
CREATE TABLE IF NOT EXISTS aviso_acuses (
  aviso_id    INTEGER NOT NULL REFERENCES avisos(id) ON DELETE CASCADE,
  servicio_id INTEGER NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  empleado_id INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (aviso_id, servicio_id)
);
