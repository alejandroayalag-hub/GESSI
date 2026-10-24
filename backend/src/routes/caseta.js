// API del celular de caseta (uno por servicio, compartido por los guardias del turno).
// El celular se vincula con un código de 6 dígitos generado en el panel y recibe un token
// de dispositivo; cada guardia se identifica con su PIN + selfie.
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const { dentroDeRadio } = require('../lib/geo');

const limiteVincular = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
// ponytail: límite por IP; un celular por caseta, así que equivale a "por caseta"
const limitePin = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false });

const selfies = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(__dirname, '..', '..', 'uploads', 'jornadas');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    // nombre aleatorio: /uploads sirve imágenes sin auth (igual que fotos de perfil)
    filename(req, file, cb) { cb(null, `${crypto.randomUUID()}.jpg`); },
  }),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('La selfie debe ser JPG o PNG'));
  },
});

// POST /api/caseta/vincular { codigo }
router.post('/vincular', limiteVincular, async (req, res, next) => {
  try {
    const codigo = String(req.body.codigo || '').trim();
    if (!/^\d{6}$/.test(codigo)) return res.status(400).json({ error: 'Código inválido' });
    const { rows: [s] } = await pool.query(
      `UPDATE servicios SET codigo_vinculacion = NULL, dispositivo_vinculado_at = NOW()
       WHERE codigo_vinculacion = $1 AND activo = true RETURNING id, nombre, dispositivo_version`, [codigo]);
    if (!s) return res.status(404).json({ error: 'Código no válido o ya usado' });
    const token = jwt.sign({ tipo: 'dispositivo', servicio_id: s.id, v: s.dispositivo_version }, process.env.JWT_SECRET);
    res.json({ token, servicio: { id: s.id, nombre: s.nombre } });
  } catch (err) { next(err); }
});

// Middleware: token de dispositivo vigente (desvincular en el panel lo revoca)
async function dispositivo(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const datos = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (datos.tipo !== 'dispositivo') throw new Error('tipo');
    const { rows: [s] } = await pool.query('SELECT * FROM servicios WHERE id = $1', [datos.servicio_id]);
    if (!s || !s.activo || s.dispositivo_version !== datos.v) {
      return res.status(401).json({ error: 'Celular desvinculado. Pide un código nuevo a la oficina.' });
    }
    req.servicio = s;
    next();
  } catch {
    res.status(401).json({ error: 'Celular no vinculado' });
  }
}

async function validarGuardia(empleadoId, pin) {
  const { rows: [e] } = await pool.query(
    "SELECT id, nombre, apellido_paterno, pin_hash FROM empleados WHERE id = $1 AND estado = 'activo'", [empleadoId]);
  if (!e || !e.pin_hash) return { error: 'Guardia sin PIN asignado. Avisa a la oficina.' };
  if (!(await bcrypt.compare(String(pin || ''), e.pin_hash))) return { error: 'PIN incorrecto' };
  return { empleado: e };
}

function borrarSubida(req) {
  const archivos = [req.file, ...Object.values(req.files || {}).flat()].filter(Boolean);
  for (const f of archivos) fs.unlink(f.path, () => {});
}

router.use(dispositivo);

const NOMBRE_EMP = "e.nombre || ' ' || e.apellido_paterno";
const CATEGORIAS_INCIDENTE = ['robo', 'dano', 'sospechoso', 'accidente', 'otro'];

// Aviso vigente y dirigido al servicio $1
const AVISO_VISIBLE = `a.activo AND (a.vigente_hasta IS NULL OR a.vigente_hasta > NOW())
  AND (a.servicio_ids IS NULL OR $1 = ANY(a.servicio_ids))`;

// GET /api/caseta/estado — servicio, guardias (asignados primero) y puntos de rondín
router.get('/estado', async (req, res, next) => {
  try {
    const s = req.servicio;
    const { rows: guardias } = await pool.query(`
      SELECT e.id, e.nombre, e.apellido_paterno, e.apellido_materno, e.foto,
             (e.servicio_id = $1) AS asignado, (e.pin_hash IS NOT NULL) AS tiene_pin,
             j.id AS jornada_id, j.entrada_at, j.servicio_id AS jornada_servicio_id
      FROM empleados e
      LEFT JOIN jornadas j ON j.empleado_id = e.id AND j.salida_at IS NULL
      WHERE e.estado = 'activo'
      ORDER BY (e.servicio_id = $1) DESC NULLS LAST, e.nombre, e.apellido_paterno`, [s.id]);
    const { rows: puntos } = s.tiene_rondines
      ? await pool.query('SELECT id, nombre, descripcion, orden FROM puntos_rondin WHERE servicio_id = $1 AND activo ORDER BY orden, nombre', [s.id])
      : { rows: [] };
    // empleados.foto guarda la ruta absoluta en disco (heredado de RHATA): exponer solo la URL pública
    for (const g of guardias) g.foto = g.foto ? `/uploads/${path.basename(g.foto)}` : null;
    // Pizarrón: SDR primero (peligro antes que precaución), luego avisos; más recientes arriba
    const { rows: avisos } = await pool.query(`
      SELECT a.id, a.tipo, a.categoria, a.nivel, a.titulo, a.texto, a.zona, a.vigente_hasta, a.created_at,
             (ac.aviso_id IS NOT NULL) AS enterado
      FROM avisos a LEFT JOIN aviso_acuses ac ON ac.aviso_id = a.id AND ac.servicio_id = $1
      WHERE ${AVISO_VISIBLE}
      ORDER BY (a.tipo = 'sdr') DESC, (a.nivel = 'peligro') DESC, a.created_at DESC`, [s.id]);
    // Novedades de las últimas 24 h para el relevo
    const { rows: bitacora } = await pool.query(`
      SELECT b.id, b.texto, b.created_at, ${NOMBRE_EMP} AS guardia_nombre
      FROM bitacora_caseta b LEFT JOIN empleados e ON e.id = b.empleado_id
      WHERE b.servicio_id = $1 AND b.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY b.created_at DESC LIMIT 10`, [s.id]);
    res.json({
      servicio: { id: s.id, nombre: s.nombre, tiene_rondines: s.tiene_rondines },
      guardias, puntos, avisos, bitacora,
    });
  } catch (err) { next(err); }
});

const fotosEntrada = selfies.fields([{ name: 'foto', maxCount: 1 }, { name: 'foto_cuerpo', maxCount: 1 }]);
const archivo = (req, campo) => req.files?.[campo]?.[0];

// El guardia escanea el QR pegado en la caseta al entrar y al salir: prueba que estuvo ahí
function qrCasetaInvalido(req) {
  if (!req.body.qr_caseta) return 'Escanea el QR de la caseta';
  if (req.body.qr_caseta !== req.servicio.qr_caseta) return 'Ese QR no es de esta caseta';
  return null;
}

// POST /api/caseta/entrada (multipart: foto, foto_cuerpo, empleado_id, pin, qr_caseta, lat, lng)
router.post('/entrada', limitePin, fotosEntrada, async (req, res, next) => {
  try {
    const { empleado_id, pin, lat, lng } = req.body;
    if (!archivo(req, 'foto') || !archivo(req, 'foto_cuerpo')) {
      borrarSubida(req); return res.status(400).json({ error: 'La selfie y la foto de cuerpo completo son obligatorias' });
    }
    const errorQr = qrCasetaInvalido(req);
    if (errorQr) { borrarSubida(req); return res.status(400).json({ error: errorQr }); }
    const { empleado, error } = await validarGuardia(empleado_id, pin);
    if (error) { borrarSubida(req); return res.status(401).json({ error }); }

    const s = req.servicio;
    const zona = dentroDeRadio(lat, lng, s.latitud, s.longitud, s.radio_metros);
    const { rows: [j] } = await pool.query(
      `INSERT INTO jornadas (empleado_id, servicio_id, entrada_lat, entrada_lng, entrada_foto, entrada_foto_cuerpo, entrada_en_zona)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [empleado.id, s.id, lat || null, lng || null, `/uploads/jornadas/${archivo(req, 'foto').filename}`,
        `/uploads/jornadas/${archivo(req, 'foto_cuerpo').filename}`, zona.dentro]);
    if (zona.dentro === false) {
      await pool.query(
        `INSERT INTO alertas (servicio_id, empleado_id, jornada_id, tipo, mensaje, latitud, longitud)
         VALUES ($1, $2, $3, 'fuera_de_zona', $4, $5, $6)`,
        [s.id, empleado.id, j.id, `Entrada registrada a ${zona.distancia} m de la caseta`, lat, lng]);
    }
    res.status(201).json({ jornada: j, mensaje: `Bienvenido, ${empleado.nombre}` });
  } catch (err) {
    borrarSubida(req);
    if (err.code === '23505') return res.status(409).json({ error: 'Ya tienes una jornada abierta. Registra tu salida primero.' });
    next(err);
  }
});

// POST /api/caseta/salida (multipart: foto, empleado_id, pin, qr_caseta, lat, lng)
router.post('/salida', limitePin, selfies.single('foto'), async (req, res, next) => {
  try {
    const { empleado_id, pin, lat, lng } = req.body;
    if (!req.file) return res.status(400).json({ error: 'La selfie es obligatoria' });
    const errorQr = qrCasetaInvalido(req);
    if (errorQr) { borrarSubida(req); return res.status(400).json({ error: errorQr }); }
    const { empleado, error } = await validarGuardia(empleado_id, pin);
    if (error) { borrarSubida(req); return res.status(401).json({ error }); }

    const s = req.servicio;
    const zona = dentroDeRadio(lat, lng, s.latitud, s.longitud, s.radio_metros);
    const { rows: [j] } = await pool.query(
      `UPDATE jornadas SET salida_at = NOW(), salida_lat = $1, salida_lng = $2, salida_foto = $3, salida_en_zona = $4
       WHERE empleado_id = $5 AND salida_at IS NULL RETURNING *`,
      [lat || null, lng || null, `/uploads/jornadas/${req.file.filename}`, zona.dentro, empleado.id]);
    if (!j) { borrarSubida(req); return res.status(404).json({ error: 'No tienes jornada abierta' }); }
    res.json({ jornada: j, mensaje: `Hasta luego, ${empleado.nombre}` });
  } catch (err) { borrarSubida(req); next(err); }
});

// POST /api/caseta/escaneo { empleado_id, qr_codigo, lat, lng, precision_gps, notas }
// El guardia se identificó con PIN al iniciar el rondín; aquí basta con que tenga jornada abierta en este servicio.
router.post('/escaneo', async (req, res, next) => {
  try {
    const { empleado_id, qr_codigo, lat, lng, precision_gps, notas } = req.body;
    const s = req.servicio;
    const { rows: [j] } = await pool.query(
      'SELECT id FROM jornadas WHERE empleado_id = $1 AND servicio_id = $2 AND salida_at IS NULL', [empleado_id, s.id]);
    if (!j) return res.status(403).json({ error: 'Registra tu entrada antes de hacer rondín' });
    const { rows: [p] } = await pool.query(
      'SELECT * FROM puntos_rondin WHERE qr_codigo = $1 AND servicio_id = $2 AND activo', [qr_codigo, s.id]);
    if (!p) return res.status(404).json({ error: 'Código QR no pertenece a este servicio' });

    const zona = dentroDeRadio(lat, lng, p.latitud, p.longitud, p.radio_tolerancia_metros);
    const { rows: [e] } = await pool.query(
      `INSERT INTO escaneos (jornada_id, empleado_id, punto_id, latitud, longitud, precision_gps, distancia_metros, dentro_de_rango, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [j.id, empleado_id, p.id, lat || null, lng || null, precision_gps || null, zona.distancia, zona.dentro, notas || null]);
    if (zona.dentro === false) {
      await pool.query(
        `INSERT INTO alertas (servicio_id, empleado_id, jornada_id, tipo, mensaje, latitud, longitud)
         VALUES ($1, $2, $3, 'fuera_de_rango', $4, $5, $6)`,
        [s.id, empleado_id, j.id, `Escaneo de "${p.nombre}" a ${zona.distancia} m (máx ${p.radio_tolerancia_metros} m)`, lat, lng]);
    }
    res.status(201).json({ escaneo: e, punto: { id: p.id, nombre: p.nombre }, dentro_de_rango: zona.dentro, distancia_metros: zona.distancia });
  } catch (err) { next(err); }
});

// POST /api/caseta/sos { empleado_id?, lat, lng, mensaje }
router.post('/sos', async (req, res, next) => {
  try {
    const { empleado_id, lat, lng, mensaje } = req.body;
    const { rows: [a] } = await pool.query(
      `INSERT INTO alertas (servicio_id, empleado_id, tipo, mensaje, latitud, longitud)
       VALUES ($1, $2, 'sos', $3, $4, $5) RETURNING *`,
      [req.servicio.id, empleado_id || null, mensaje || 'Alerta SOS', lat || null, lng || null]);
    res.status(201).json({ alerta: a });
  } catch (err) { next(err); }
});

// POST /api/caseta/avisos/:id/enterado { empleado_id? }
router.post('/avisos/:id/enterado', async (req, res, next) => {
  try {
    const { rows: [a] } = await pool.query(`SELECT a.id FROM avisos a WHERE ${AVISO_VISIBLE} AND a.id = $2`,
      [req.servicio.id, req.params.id]);
    if (!a) return res.status(404).json({ error: 'El aviso ya no está vigente' });
    await pool.query(
      `INSERT INTO aviso_acuses (aviso_id, servicio_id, empleado_id) VALUES ($1, $2, $3)
       ON CONFLICT (aviso_id, servicio_id) DO NOTHING`,
      [a.id, req.servicio.id, req.body.empleado_id || null]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/caseta/bitacora { empleado_id?, texto } — nota del turno
router.post('/bitacora', async (req, res, next) => {
  try {
    const texto = String(req.body.texto || '').trim();
    if (!texto) return res.status(400).json({ error: 'Escribe la nota' });
    const { rows: [b] } = await pool.query(
      'INSERT INTO bitacora_caseta (servicio_id, empleado_id, texto) VALUES ($1, $2, $3) RETURNING *',
      [req.servicio.id, req.body.empleado_id || null, texto.slice(0, 2000)]);
    res.status(201).json(b);
  } catch (err) { next(err); }
});

// POST /api/caseta/incidente (multipart: fotos[0..3], empleado_id?, categoria, descripcion, lat, lng)
// Queda como alerta 'incidente' para que la oficina le dé seguimiento.
router.post('/incidente', selfies.array('fotos', 3), async (req, res, next) => {
  try {
    const { empleado_id, categoria, descripcion, lat, lng } = req.body;
    if (!CATEGORIAS_INCIDENTE.includes(categoria)) { borrarSubida(req); return res.status(400).json({ error: 'Elige el tipo de incidente' }); }
    if (!String(descripcion || '').trim()) { borrarSubida(req); return res.status(400).json({ error: 'Describe qué pasó' }); }
    const fotos = (req.files || []).map(f => `/uploads/jornadas/${f.filename}`);
    const { rows: [a] } = await pool.query(
      `INSERT INTO alertas (servicio_id, empleado_id, tipo, categoria, mensaje, fotos, latitud, longitud)
       VALUES ($1, $2, 'incidente', $3, $4, $5, $6, $7) RETURNING *`,
      [req.servicio.id, empleado_id || null, categoria, descripcion.trim().slice(0, 2000), fotos.length ? fotos : null, lat || null, lng || null]);
    res.status(201).json({ alerta: a });
  } catch (err) { borrarSubida(req); next(err); }
});

module.exports = router;
