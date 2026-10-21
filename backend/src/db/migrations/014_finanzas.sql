-- Finanzas GESSI (basado en Finanzas de Gioval, sin lo médico): movimientos, categorías,
-- cuentas por pagar y cuentas por cobrar por servicio

CREATE TABLE IF NOT EXISTS categorias_movimiento (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL UNIQUE,
  tipo       VARCHAR(10)  NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  activo     BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO categorias_movimiento (nombre, tipo) VALUES
  ('Servicio de seguridad', 'ingreso'),
  ('Otros ingresos',        'ingreso'),
  ('Nómina',                'egreso'),
  ('IMSS / Infonavit',      'egreso'),
  ('Uniformes y equipo',    'egreso'),
  ('Combustible',           'egreso'),
  ('Renta',                 'egreso'),
  ('Servicios (luz, teléfono, internet)', 'egreso'),
  ('Impuestos',             'egreso'),
  ('Otros gastos',          'egreso')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS movimientos (
  id           SERIAL PRIMARY KEY,
  tipo         VARCHAR(10)   NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  categoria_id INTEGER       REFERENCES categorias_movimiento(id) ON DELETE SET NULL,
  servicio_id  INTEGER       REFERENCES servicios(id) ON DELETE SET NULL,
  concepto     TEXT          NOT NULL,
  monto        NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  forma_pago   VARCHAR(20)   NOT NULL DEFAULT 'transferencia'
               CHECK (forma_pago IN ('efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro')),
  fecha        DATE          NOT NULL DEFAULT CURRENT_DATE,
  notas        TEXT,
  -- origen automático (abono a cuenta por cobrar / pago a cuenta por pagar)
  cxc_id       INTEGER,
  cxp_id       INTEGER,
  created_by   INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha);

CREATE TABLE IF NOT EXISTS cuentas_por_pagar (
  id                SERIAL PRIMARY KEY,
  proveedor         VARCHAR(150)  NOT NULL,
  folio_factura     VARCHAR(50),
  concepto          TEXT          NOT NULL,
  categoria_id      INTEGER       REFERENCES categorias_movimiento(id) ON DELETE SET NULL,
  fecha_factura     DATE,
  fecha_vencimiento DATE,
  importe           NUMERIC(12,2) NOT NULL CHECK (importe > 0),
  pagado            NUMERIC(12,2) NOT NULL DEFAULT 0,
  observaciones     TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cuentas_por_cobrar (
  id                SERIAL PRIMARY KEY,
  servicio_id       INTEGER       NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  periodo           CHAR(7)       NOT NULL,             -- YYYY-MM
  concepto          TEXT          NOT NULL,
  folio_factura     VARCHAR(50),
  fecha_vencimiento DATE,
  importe           NUMERIC(12,2) NOT NULL CHECK (importe > 0),
  pagado            NUMERIC(12,2) NOT NULL DEFAULT 0,
  es_mensualidad    BOOLEAN       NOT NULL DEFAULT false,
  observaciones     TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
-- Una sola mensualidad automática por servicio y mes
CREATE UNIQUE INDEX IF NOT EXISTS uq_cxc_mensualidad ON cuentas_por_cobrar(servicio_id, periodo) WHERE es_mensualidad;
