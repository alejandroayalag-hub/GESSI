-- Operación GESSI: servicios (= clientes), jornadas en caseta, rondines QR, alertas

CREATE TABLE IF NOT EXISTS servicios (
  id                 SERIAL PRIMARY KEY,
  nombre             VARCHAR(150) NOT NULL,
  direccion          TEXT,
  contacto_nombre    VARCHAR(150),
  contacto_telefono  VARCHAR(30),
  latitud            NUMERIC(10, 7),
  longitud           NUMERIC(10, 7),
  radio_metros       INTEGER NOT NULL DEFAULT 150,
  tiene_rondines     BOOLEAN NOT NULL DEFAULT false,
  tarifa_mensual     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  activo             BOOLEAN NOT NULL DEFAULT true,
  -- Celular de caseta: código de un solo uso para vincular + versión para revocar
  codigo_vinculacion VARCHAR(10),
  dispositivo_version INTEGER NOT NULL DEFAULT 0,
  dispositivo_vinculado_at TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS numero_empleado VARCHAR(20) UNIQUE,     -- código del empleado en NOMIPAQ
  ADD COLUMN IF NOT EXISTS salario_diario NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS servicio_id INTEGER REFERENCES servicios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(100);

-- Minutos máximos entre escaneos de rondín antes de alertar
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS intervalo_rondin_min INTEGER NOT NULL DEFAULT 60;

CREATE TABLE IF NOT EXISTS jornadas (
  id              SERIAL PRIMARY KEY,
  empleado_id     INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  servicio_id     INTEGER NOT NULL REFERENCES servicios(id),
  entrada_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entrada_lat     NUMERIC(10, 7),
  entrada_lng     NUMERIC(10, 7),
  entrada_foto    VARCHAR(500),
  entrada_en_zona BOOLEAN,
  salida_at       TIMESTAMPTZ,
  salida_lat      NUMERIC(10, 7),
  salida_lng      NUMERIC(10, 7),
  salida_foto     VARCHAR(500),
  salida_en_zona  BOOLEAN,
  observaciones   TEXT
);
CREATE INDEX IF NOT EXISTS idx_jornadas_empleado ON jornadas(empleado_id, entrada_at);
CREATE INDEX IF NOT EXISTS idx_jornadas_servicio ON jornadas(servicio_id, entrada_at);
-- Un guardia no puede tener dos jornadas abiertas
CREATE UNIQUE INDEX IF NOT EXISTS uq_jornada_abierta ON jornadas(empleado_id) WHERE salida_at IS NULL;

CREATE TABLE IF NOT EXISTS puntos_rondin (
  id                      SERIAL PRIMARY KEY,
  servicio_id             INTEGER NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  nombre                  VARCHAR(100) NOT NULL,
  descripcion             TEXT,
  qr_codigo               VARCHAR(40) NOT NULL UNIQUE,
  latitud                 NUMERIC(10, 7),
  longitud                NUMERIC(10, 7),
  radio_tolerancia_metros INTEGER NOT NULL DEFAULT 50,
  orden                   INTEGER NOT NULL DEFAULT 0,
  activo                  BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escaneos (
  id              SERIAL PRIMARY KEY,
  jornada_id      INTEGER REFERENCES jornadas(id) ON DELETE SET NULL,
  empleado_id     INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  punto_id        INTEGER NOT NULL REFERENCES puntos_rondin(id) ON DELETE CASCADE,
  latitud         NUMERIC(10, 7),
  longitud        NUMERIC(10, 7),
  precision_gps   NUMERIC(8, 2),
  distancia_metros INTEGER,
  dentro_de_rango BOOLEAN,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_escaneos_fecha ON escaneos(created_at);

CREATE TABLE IF NOT EXISTS alertas (
  id           SERIAL PRIMARY KEY,
  servicio_id  INTEGER REFERENCES servicios(id) ON DELETE CASCADE,
  empleado_id  INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
  jornada_id   INTEGER REFERENCES jornadas(id) ON DELETE SET NULL,
  tipo         VARCHAR(30) NOT NULL CHECK (tipo IN ('sos','no_escaneo','fuera_de_rango','fuera_de_zona')),
  mensaje      TEXT,
  latitud      NUMERIC(10, 7),
  longitud     NUMERIC(10, 7),
  resuelta     BOOLEAN NOT NULL DEFAULT false,
  resuelta_por INTEGER REFERENCES usuarios(id),
  resuelta_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alertas_pendientes ON alertas(resuelta, created_at);
