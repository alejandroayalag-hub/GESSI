// Usuarios del panel (solo admin). No se borran: se desactivan.
// ponytail: desactivar corta el login; un token ya emitido vive hasta 8 h. Revisar activo por petición si hace falta corte inmediato.
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

const ROLES = ['admin', 'rh', 'supervisor'];
const CAMPOS = 'id, nombre, email, role, activo, created_at';

function validar({ nombre, email, role, password }, nuevo) {
  if (!String(nombre || '').trim() || !String(email || '').trim()) return 'Nombre y correo son requeridos';
  if (!ROLES.includes(role)) return 'Rol inválido';
  if ((nuevo || password) && String(password || '').length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  return null;
}

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT ${CAMPOS} FROM usuarios ORDER BY activo DESC, nombre`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const error = validar(req.body, true);
    if (error) return res.status(400).json({ error });
    const { nombre, email, role, password } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, role, password) VALUES ($1, $2, $3, $4) RETURNING ${CAMPOS}`,
      [nombre.trim(), email.trim().toLowerCase(), role, await bcrypt.hash(password, 10)]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    next(err);
  }
});

// PUT /api/usuarios/:id { nombre, email, role, activo, password? } — password vacío = no cambiar
router.put('/:id', async (req, res, next) => {
  try {
    const error = validar(req.body, false);
    if (error) return res.status(400).json({ error });
    const { nombre, email, role, activo, password } = req.body;
    // Evita que el admin se quite el acceso a sí mismo
    if (Number(req.params.id) === req.user.id && (role !== 'admin' || activo === false)) {
      return res.status(400).json({ error: 'No puedes quitarte el rol de administrador ni desactivarte' });
    }
    const hash = password ? await bcrypt.hash(password, 10) : null;
    const { rows } = await pool.query(
      `UPDATE usuarios SET nombre = $1, email = $2, role = $3, activo = $4, password = COALESCE($5, password)
       WHERE id = $6 RETURNING ${CAMPOS}`,
      [nombre.trim(), email.trim().toLowerCase(), role, activo !== false, hash, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    next(err);
  }
});

module.exports = router;
