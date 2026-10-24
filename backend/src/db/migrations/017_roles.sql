-- Roles GESSI: admin (todo), rh = Asistente de oficina (Personal + Rondines), supervisor (solo Rondines)
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_role_check CHECK (role IN ('admin', 'rh', 'supervisor'));
-- Los usuarios no se borran (firman alertas, avisos, movimientos): se desactivan
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
