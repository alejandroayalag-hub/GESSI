const router = require('express').Router();
const ExcelJS = require('exceljs');
const pool = require('../db/pool');
const requireRole = require('../middleware/requireRole');
const { resumirPrenomina } = require('../lib/prenomina');

const TZ = 'America/Mexico_City';
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function rango(req, res) {
  const { desde, hasta } = req.query;
  if (!FECHA.test(desde || '') || !FECHA.test(hasta || '') || desde > hasta) {
    res.status(400).json({ error: 'Rango de fechas inválido (desde/hasta YYYY-MM-DD)' });
    return null;
  }
  return { desde, hasta };
}

// Jornadas cuya entrada (hora local) cae en el rango
async function jornadasEnRango(desde, hasta, filtros = {}) {
  const params = [desde, hasta];
  let extra = '';
  if (filtros.servicio_id) { params.push(filtros.servicio_id); extra += ` AND j.servicio_id = $${params.length}`; }
  if (filtros.empleado_id) { params.push(filtros.empleado_id); extra += ` AND j.empleado_id = $${params.length}`; }
  const { rows } = await pool.query(`
    SELECT j.*, s.nombre AS servicio_nombre,
           e.nombre || ' ' || e.apellido_paterno || COALESCE(' ' || e.apellido_materno, '') AS guardia_nombre,
           e.numero_empleado,
           to_char(j.entrada_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS fecha,
           ROUND((EXTRACT(EPOCH FROM (j.salida_at - j.entrada_at)) / 3600)::numeric, 2)::float AS horas
    FROM jornadas j
    JOIN empleados e ON e.id = j.empleado_id
    JOIN servicios s ON s.id = j.servicio_id
    WHERE (j.entrada_at AT TIME ZONE '${TZ}')::date BETWEEN $1 AND $2 ${extra}
    ORDER BY j.entrada_at DESC`, params);
  return rows;
}

async function prenomina(desde, hasta) {
  const { rows: empleados } = await pool.query(`
    SELECT e.id, e.numero_empleado,
           e.nombre || ' ' || e.apellido_paterno || COALESCE(' ' || e.apellido_materno, '') AS nombre,
           s.nombre AS servicio
    FROM empleados e LEFT JOIN servicios s ON s.id = e.servicio_id
    WHERE e.estado = 'activo' OR e.id IN (
      SELECT empleado_id FROM jornadas WHERE (entrada_at AT TIME ZONE '${TZ}')::date BETWEEN $1 AND $2)
    ORDER BY e.numero_empleado NULLS LAST, e.apellido_paterno, e.nombre`, [desde, hasta]);
  const jornadas = await jornadasEnRango(desde, hasta);
  return { filas: resumirPrenomina(empleados, jornadas, desde, hasta), jornadas };
}

// GET /api/jornadas?desde&hasta&servicio_id&empleado_id
router.get('/', async (req, res, next) => {
  try {
    const r = rango(req, res); if (!r) return;
    res.json(await jornadasEnRango(r.desde, r.hasta, req.query));
  } catch (err) { next(err); }
});

// PUT /api/jornadas/:id — corrección manual (olvidó checar salida, etc.)
router.put('/:id', requireRole('admin', 'rh'), async (req, res, next) => {
  try {
    const { entrada_at, salida_at, observaciones } = req.body;
    if (!entrada_at) return res.status(400).json({ error: 'La entrada es requerida' });
    if (salida_at && new Date(salida_at) <= new Date(entrada_at)) {
      return res.status(400).json({ error: 'La salida debe ser posterior a la entrada' });
    }
    const { rows } = await pool.query(
      'UPDATE jornadas SET entrada_at = $1, salida_at = $2, observaciones = $3 WHERE id = $4 RETURNING *',
      [entrada_at, salida_at || null, observaciones || null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Jornada no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El guardia ya tiene otra jornada abierta' });
    next(err);
  }
});

// GET /api/jornadas/prenomina?desde&hasta — JSON para la tabla del panel
router.get('/prenomina', async (req, res, next) => {
  try {
    const r = rango(req, res); if (!r) return;
    res.json((await prenomina(r.desde, r.hasta)).filas);
  } catch (err) { next(err); }
});

// GET /api/jornadas/prenomina.xlsx?desde&hasta — hoja de revisión + hoja para NOMIPAQ
router.get('/prenomina.xlsx', async (req, res, next) => {
  try {
    const r = rango(req, res); if (!r) return;
    const { filas, jornadas } = await prenomina(r.desde, r.hasta);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'GESSI';
    const negrita = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } } };
    const encabezar = (ws) => ws.getRow(1).eachCell(c => Object.assign(c, negrita));

    const resumen = wb.addWorksheet('Revisión');
    resumen.columns = [
      { header: 'No. empleado', key: 'numero_empleado', width: 13 },
      { header: 'Guardia', key: 'nombre', width: 32 },
      { header: 'Servicio', key: 'servicio', width: 24 },
      { header: 'Turnos', key: 'turnos', width: 9 },
      { header: 'Esperados 12x36', key: 'turnos_esperados', width: 15 },
      { header: 'Faltas', key: 'faltas', width: 9 },
      { header: 'Sin salida', key: 'sin_salida', width: 11 },
      { header: 'Horas', key: 'horas', width: 9 },
      { header: 'Prom. semanal', key: 'promedio_semanal', width: 14 },
    ];
    resumen.addRows(filas);
    encabezar(resumen);

    const detalle = wb.addWorksheet('Detalle');
    detalle.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Guardia', key: 'guardia_nombre', width: 32 },
      { header: 'Servicio', key: 'servicio_nombre', width: 24 },
      { header: 'Entrada', key: 'entrada', width: 18 },
      { header: 'Salida', key: 'salida', width: 18 },
      { header: 'Horas', key: 'horas', width: 9 },
      { header: 'En zona', key: 'zona', width: 9 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
    ];
    const hora = (d) => d ? new Date(d).toLocaleString('es-MX', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }) : '';
    detalle.addRows(jornadas.slice().reverse().map(j => ({
      ...j, entrada: hora(j.entrada_at), salida: hora(j.salida_at) || 'SIN SALIDA',
      zona: j.entrada_en_zona === false ? 'NO' : 'SÍ',
    })));
    encabezar(detalle);

    // ponytail: columnas genéricas; ajustar al layout exacto cuando Claudio pase su plantilla de importación NOMIPAQ
    const nomipaq = wb.addWorksheet('NOMIPAQ');
    nomipaq.columns = [
      { header: 'Codigo', key: 'numero_empleado', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 32 },
      { header: 'Dias trabajados', key: 'dias_trabajados', width: 15 },
      { header: 'Faltas', key: 'faltas', width: 9 },
      { header: 'Horas trabajadas', key: 'horas', width: 16 },
    ];
    nomipaq.addRows(filas.filter(f => f.numero_empleado));
    encabezar(nomipaq);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="prenomina_${r.desde}_${r.hasta}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

module.exports = router;
