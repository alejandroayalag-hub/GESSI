const router = require('express').Router();
const crypto = require('crypto');
const pool = require('../db/pool');
const requireRole = require('../middleware/requireRole');

const CAMPOS = ['nombre', 'direccion', 'contacto_nombre', 'contacto_telefono', 'latitud', 'longitud',
  'radio_metros', 'tiene_rondines', 'intervalo_rondin_min', 'tarifa_mensual', 'activo'];

function valores(body) {
  return CAMPOS.map(c => (body[c] === '' || body[c] === undefined ? null : body[c]));
}

// GET /api/servicios — con conteo de guardias y estado del celular
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.id, ${CAMPOS.map(c => 's.' + c).join(', ')}, s.codigo_vinculacion, s.qr_caseta,
             s.dispositivo_vinculado_at, s.created_at,
             (SELECT COUNT(*)::int FROM empleados e WHERE e.servicio_id = s.id AND e.estado = 'activo') AS guardias,
             (SELECT COUNT(*)::int FROM jornadas j WHERE j.servicio_id = s.id AND j.salida_at IS NULL) AS en_turno
      FROM servicios s ORDER BY s.activo DESC, s.nombre`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireRole('admin', 'rh'), async (req, res, next) => {
  try {
    if (!req.body.nombre) return res.status(400).json({ error: 'El nombre es requerido' });
    const body = { radio_metros: 150, intervalo_rondin_min: 60, tarifa_mensual: 0, tiene_rondines: false, activo: true, ...req.body };
    const { rows } = await pool.query(
      `INSERT INTO servicios (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map((_, i) => '$' + (i + 1)).join(', ')}) RETURNING *`,
      valores(body));
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('admin', 'rh'), async (req, res, next) => {
  try {
    if (!req.body.nombre) return res.status(400).json({ error: 'El nombre es requerido' });
    const { rows: [actual] } = await pool.query('SELECT * FROM servicios WHERE id = $1', [req.params.id]);
    if (!actual) return res.status(404).json({ error: 'Servicio no encontrado' });
    const body = { ...actual, ...req.body };
    const { rows } = await pool.query(
      `UPDATE servicios SET ${CAMPOS.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE id = $${CAMPOS.length + 1} RETURNING *`,
      [...valores(body), req.params.id]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/servicios/:id/vincular — genera código de 6 dígitos para el celular de caseta.
// Invalida el celular anterior (dispositivo_version++).
router.post('/:id/vincular', requireRole('admin', 'rh'), async (req, res, next) => {
  try {
    const codigo = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
    const { rows } = await pool.query(
      `UPDATE servicios SET codigo_vinculacion = $1, dispositivo_version = dispositivo_version + 1,
              dispositivo_vinculado_at = NULL WHERE id = $2 RETURNING id, codigo_vinculacion`,
      [codigo, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/servicios/:id/desvincular — el celular actual deja de funcionar
router.post('/:id/desvincular', requireRole('admin', 'rh'), async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE servicios SET codigo_vinculacion = NULL, dispositivo_version = dispositivo_version + 1,
              dispositivo_vinculado_at = NULL WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
