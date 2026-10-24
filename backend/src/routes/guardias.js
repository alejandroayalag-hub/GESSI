const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const requireRole = require('../middleware/requireRole');

// GET /api/guardias — empleados activos con su servicio, PIN y jornada abierta
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.id, e.nombre, e.apellido_paterno, e.apellido_materno, e.puesto, e.telefono, e.foto,
             e.numero_empleado, e.salario_diario, e.servicio_id, s.nombre AS servicio_nombre,
             (e.pin_hash IS NOT NULL) AS tiene_pin,
             j.id AS jornada_id, j.entrada_at
      FROM empleados e
      LEFT JOIN servicios s ON s.id = e.servicio_id
      LEFT JOIN jornadas j ON j.empleado_id = e.id AND j.salida_at IS NULL
      WHERE e.estado = 'activo'
      ORDER BY s.nombre NULLS LAST, e.apellido_paterno, e.nombre`);
    // El supervisor solo ve operación, no dinero
    if (req.user.role === 'supervisor') for (const r of rows) delete r.salario_diario;
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT /api/guardias/:id — asignación de servicio, número NOMIPAQ y salario diario
router.put('/:id', requireRole('admin', 'rh'), async (req, res, next) => {
  try {
    const { servicio_id, numero_empleado, salario_diario } = req.body;
    const { rows } = await pool.query(
      `UPDATE empleados SET servicio_id = $1, numero_empleado = $2, salario_diario = $3, updated_at = NOW()
       WHERE id = $4 RETURNING id, servicio_id, numero_empleado, salario_diario`,
      [servicio_id || null, numero_empleado || null, salario_diario || null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ese número de empleado ya está en uso' });
    next(err);
  }
});

// PUT /api/guardias/:id/pin — PIN de 4 dígitos para checar en caseta
router.put('/:id/pin', requireRole('admin', 'rh'), async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!/^\d{4}$/.test(pin || '')) return res.status(400).json({ error: 'El PIN debe ser de 4 dígitos' });
    const hash = await bcrypt.hash(pin, 10);
    const { rowCount } = await pool.query('UPDATE empleados SET pin_hash = $1 WHERE id = $2', [hash, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
