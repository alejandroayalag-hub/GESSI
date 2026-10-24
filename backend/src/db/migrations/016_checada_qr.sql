-- Checada con QR de caseta (entrada y salida) + foto de cuerpo completo al entrar (revisión de uniforme)

ALTER TABLE servicios ADD COLUMN IF NOT EXISTS qr_caseta VARCHAR(40) UNIQUE
  DEFAULT 'GESSI-CASETA-' || upper(substr(md5(random()::text), 1, 12));
-- ponytail: el DEFAULT ya llena las filas existentes; el UPDATE cubre corridas sobre una columna creada sin default
UPDATE servicios SET qr_caseta = 'GESSI-CASETA-' || upper(substr(md5(random()::text || id::text), 1, 12))
WHERE qr_caseta IS NULL;

ALTER TABLE jornadas ADD COLUMN IF NOT EXISTS entrada_foto_cuerpo VARCHAR(500);
