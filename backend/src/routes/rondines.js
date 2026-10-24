const router = require('express').Router();
const crypto = require('crypto');
const pool = require('../db/pool');
const requireRole = require('../middleware/requireRole');

const NOMBRE_EMP = "e.nombre || ' ' || e.apellido_paterno";

// ── Puntos QR ────────────────────────────────────────────────────────────────
router.get('/puntos', async (req, res, next) => {
  try {
    const params = [];
    let where = req.query.todos ? 'WHERE true' : 'WHERE p.activo';
    if (req.query.servicio_id) { params.push(req.query.servicio_id); where += ` AND p.servicio_id = $${params.length}`; }
    const { rows } = await pool.query(
      `SELECT p.*, s.nombre AS servicio_nombre FROM puntos_rondin p JOIN servicios s ON s.id = p.servicio_id
       ${where} ORDER BY s.nombre, p.orden, p.nombre`, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/puntos', requireRole('admin', 'rh', 'supervisor'), async (req, res, next) => {
  try {
    const { servicio_id, nombre, descripcion, latitud, longitud, radio_tolerancia_metros, orden } = req.body;
    if (!servicio_id || !nombre) return res.status(400).json({ error: 'Servicio y nombre son requeridos' });
    const qr = `GESSI-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const { rows } = await pool.query(
      `INSERT INTO puntos_rondin (servicio_id, nombre, descripcion, qr_codigo, latitud, longitud, radio_tolerancia_metros, orden)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [servicio_id, nombre, descripcion || null, qr, latitud || null, longitud || null, radio_tolerancia_metros || 50, orden || 0]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/puntos/:id', requireRole('admin', 'rh', 'supervisor'), async (req, res, next) => {
  try {
    const { servicio_id, nombre, descripcion, latitud, longitud, radio_tolerancia_metros, orden } = req.body;
    if (!servicio_id || !nombre) return res.status(400).json({ error: 'Servicio y nombre son requeridos' });
    const { rows } = await pool.query(
      `UPDATE puntos_rondin SET servicio_id=$1, nombre=$2, descripcion=$3, latitud=$4, longitud=$5,
              radio_tolerancia_metros=$6, orden=$7 WHERE id=$8 RETURNING *`,
      [servicio_id, nombre, descripcion || null, latitud || null, longitud || null, radio_tolerancia_metros || 50, orden || 0, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Punto no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/puntos/:id/toggle', requireRole('admin', 'rh', 'supervisor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('UPDATE puntos_rondin SET activo = NOT activo WHERE id=$1 RETURNING id, activo', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Punto no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/puntos/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM puntos_rondin WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Escaneos (bitácora / reportes) ─────────────────────────────────────────
router.get('/escaneos', async (req, res, next) => {
  try {
    const { desde, hasta, servicio_id, empleado_id } = req.query;
    const cond = [], params = [];
    if (desde) { params.push(desde); cond.push(`x.created_at >= $${params.length}::date`); }
    if (hasta) { params.push(hasta); cond.push(`x.created_at < $${params.length}::date + 1`); }
    if (servicio_id) { params.push(servicio_id); cond.push(`p.servicio_id = $${params.length}`); }
    if (empleado_id) { params.push(empleado_id); cond.push(`x.empleado_id = $${params.length}`); }
    const { rows } = await pool.query(`
      SELECT x.*, p.nombre AS punto_nombre, s.nombre AS servicio_nombre, ${NOMBRE_EMP} AS guardia_nombre
      FROM escaneos x
      JOIN puntos_rondin p ON p.id = x.punto_id
      JOIN servicios s ON s.id = p.servicio_id
      JOIN empleados e ON e.id = x.empleado_id
      ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}
      ORDER BY x.created_at DESC LIMIT 1000`, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/rondines/bitacora?desde&hasta&servicio_id — notas de turno desde la app de caseta
router.get('/bitacora', async (req, res, next) => {
  try {
    const { desde, hasta, servicio_id } = req.query;
    const cond = [], params = [];
    if (desde) { params.push(desde); cond.push(`b.created_at >= $${params.length}::date`); }
    if (hasta) { params.push(hasta); cond.push(`b.created_at < $${params.length}::date + 1`); }
    if (servicio_id) { params.push(servicio_id); cond.push(`b.servicio_id = $${params.length}`); }
    const { rows } = await pool.query(`
      SELECT b.*, s.nombre AS servicio_nombre, ${NOMBRE_EMP} AS guardia_nombre
      FROM bitacora_caseta b
      JOIN servicios s ON s.id = b.servicio_id
      LEFT JOIN empleados e ON e.id = b.empleado_id
      ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}
      ORDER BY b.created_at DESC LIMIT 1000`, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Alertas ─────────────────────────────────────────────────────────────────
router.get('/alertas', async (req, res, next) => {
  try {
    const params = [];
    let where = '';
    if (req.query.resuelta !== undefined) { params.push(req.query.resuelta === 'true'); where = `WHERE a.resuelta = $1`; }
    const { rows } = await pool.query(`
      SELECT a.*, s.nombre AS servicio_nombre, ${NOMBRE_EMP} AS guardia_nombre, u.nombre AS resuelta_por_nombre
      FROM alertas a
      LEFT JOIN servicios s ON s.id = a.servicio_id
      LEFT JOIN empleados e ON e.id = a.empleado_id
      LEFT JOIN usuarios u ON u.id = a.resuelta_por
      ${where} ORDER BY a.resuelta, a.created_at DESC LIMIT 300`, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.put('/alertas/:id/resolver', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE alertas SET resuelta = true, resuelta_por = $1, resuelta_at = NOW() WHERE id = $2 RETURNING *',
      [req.user.id, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Alerta no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── Pizarrón: avisos y SDR (situaciones de riesgo) ───────────────────────────
const CATEGORIAS_SDR = ['bloqueo', 'balacera', 'robo', 'manifestacion', 'otro'];

// GET /api/rondines/avisos?tipo=sdr|aviso&todos=1 — vigentes (o todos) con sus acuses por caseta
router.get('/avisos', async (req, res, next) => {
  try {
    const params = [];
    let where = req.query.todos ? 'WHERE true' : 'WHERE a.activo AND (a.vigente_hasta IS NULL OR a.vigente_hasta > NOW())';
    if (req.query.tipo) { params.push(req.query.tipo); where += ` AND a.tipo = $${params.length}`; }
    const { rows } = await pool.query(`
      SELECT a.*, u.nombre AS creado_por_nombre,
             (a.activo AND (a.vigente_hasta IS NULL OR a.vigente_hasta > NOW())) AS vigente,
             (SELECT COALESCE(json_agg(json_build_object('nombre', s.nombre, 'enterado_at', ac.created_at) ORDER BY s.nombre), '[]')
              FROM servicios s
              LEFT JOIN aviso_acuses ac ON ac.aviso_id = a.id AND ac.servicio_id = s.id
              WHERE s.activo AND (a.servicio_ids IS NULL OR s.id = ANY(a.servicio_ids))) AS destinatarios
      FROM avisos a LEFT JOIN usuarios u ON u.id = a.creado_por
      ${where} ORDER BY a.created_at DESC LIMIT 200`, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/rondines/avisos { tipo, categoria, nivel, titulo, texto, zona, servicio_ids, horas }
router.post('/avisos', requireRole('admin', 'rh', 'supervisor'), async (req, res, next) => {
  try {
    const { tipo, categoria, nivel, titulo, texto, zona, servicio_ids, horas } = req.body;
    if (!['aviso', 'sdr'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
    if (!String(titulo || '').trim()) return res.status(400).json({ error: 'El título es requerido' });
    const esSdr = tipo === 'sdr';
    if (esSdr && !CATEGORIAS_SDR.includes(categoria)) return res.status(400).json({ error: 'Categoría de riesgo inválida' });
    if (esSdr && !['precaucion', 'peligro'].includes(nivel)) return res.status(400).json({ error: 'Nivel inválido' });
    const ids = Array.isArray(servicio_ids) && servicio_ids.length ? servicio_ids.map(Number) : null;
    const h = Number(horas) > 0 ? Number(horas) : null;
    const { rows } = await pool.query(
      `INSERT INTO avisos (tipo, categoria, nivel, titulo, texto, zona, servicio_ids, vigente_hasta, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + make_interval(hours => $8::int), $9) RETURNING *`,
      [tipo, esSdr ? categoria : null, esSdr ? nivel : null, titulo.trim(), texto || null, zona || null, ids, h, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/avisos/:id/retirar', requireRole('admin', 'rh', 'supervisor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('UPDATE avisos SET activo = false WHERE id = $1 RETURNING *', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Aviso no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── Dashboard y mapa en vivo ─────────────────────────────────────────────────
router.get('/resumen', async (req, res, next) => {
  try {
    const { rows: [r] } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM servicios WHERE activo) AS servicios,
        (SELECT COUNT(*)::int FROM jornadas WHERE salida_at IS NULL) AS en_turno,
        (SELECT COUNT(*)::int FROM escaneos WHERE created_at >= CURRENT_DATE) AS escaneos_hoy,
        (SELECT COUNT(*)::int FROM escaneos WHERE created_at >= CURRENT_DATE AND dentro_de_rango = false) AS fuera_rango_hoy,
        (SELECT COUNT(*)::int FROM alertas WHERE NOT resuelta) AS alertas_pendientes,
        (SELECT COUNT(*)::int FROM alertas WHERE NOT resuelta AND tipo = 'sos') AS sos_pendientes`);
    const { rows: porHora } = await pool.query(`
      SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Mexico_City')::int AS hora, COUNT(*)::int AS escaneos
      FROM escaneos WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY 1 ORDER BY 1`);
    res.json({ ...r, por_hora: porHora });
  } catch (err) { next(err); }
});

// GET /api/rondines/en-vivo — servicios con caseta, guardias en turno (última posición conocida) y puntos
router.get('/en-vivo', async (req, res, next) => {
  try {
    const { rows: servicios } = await pool.query(
      `SELECT s.id, s.nombre, s.latitud, s.longitud, s.radio_metros, s.tiene_rondines, s.intervalo_rondin_min,
              COUNT(a.id) FILTER (WHERE a.tipo = 'sos')::int  AS sos,
              COUNT(a.id) FILTER (WHERE a.tipo <> 'sos')::int AS incidentes
       FROM servicios s LEFT JOIN alertas a ON a.servicio_id = s.id AND NOT a.resuelta
       WHERE s.activo GROUP BY s.id ORDER BY s.nombre`);
    const { rows: guardias } = await pool.query(`
      SELECT j.id AS jornada_id, j.entrada_at, j.servicio_id, j.entrada_foto, j.entrada_en_zona,
             e.id AS empleado_id, ${NOMBRE_EMP} AS nombre,
             ult.created_at AS ultimo_escaneo, ult.punto_nombre AS ultimo_punto,
             COALESCE(ult.latitud, j.entrada_lat) AS latitud, COALESCE(ult.longitud, j.entrada_lng) AS longitud,
             (SELECT COUNT(*)::int FROM escaneos x WHERE x.jornada_id = j.id) AS escaneos
      FROM jornadas j
      JOIN empleados e ON e.id = j.empleado_id
      LEFT JOIN LATERAL (
        SELECT x.created_at, x.latitud, x.longitud, p.nombre AS punto_nombre
        FROM escaneos x JOIN puntos_rondin p ON p.id = x.punto_id
        WHERE x.jornada_id = j.id ORDER BY x.created_at DESC LIMIT 1
      ) ult ON true
      WHERE j.salida_at IS NULL ORDER BY e.nombre`);
    const { rows: puntos } = await pool.query(
      'SELECT id, servicio_id, nombre, qr_codigo, latitud, longitud, radio_tolerancia_metros FROM puntos_rondin WHERE activo');
    res.json({ servicios, guardias, puntos });
  } catch (err) { next(err); }
});

module.exports = router;
