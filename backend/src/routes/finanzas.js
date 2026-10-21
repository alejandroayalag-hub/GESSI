// Finanzas GESSI: movimientos, categorías, cuentas por pagar/cobrar y reportes. Solo admin (se monta con requireRole).
const router = require('express').Router();
const pool = require('../db/pool');

const MES = /^\d{4}-\d{2}$/;
const mesDe = (req) => (MES.test(req.query.mes || '') ? req.query.mes : new Date().toISOString().slice(0, 7));
const rangoMes = (mes) => [`${mes}-01`, `(DATE '${mes}-01' + INTERVAL '1 month')::date`];
// ponytail: 12x36 → cada turno de 12 h equivale a 2 días de salario (se paga la semana completa con 3.5 turnos)
const DIAS_POR_TURNO = 2;

async function categoriaPorNombre(client, nombre) {
  const { rows } = await client.query('SELECT id FROM categorias_movimiento WHERE nombre = $1', [nombre]);
  return rows[0]?.id || null;
}

// ── Categorías ───────────────────────────────────────────────────────────────
router.get('/categorias', async (req, res, next) => {
  try { res.json((await pool.query('SELECT * FROM categorias_movimiento ORDER BY tipo, nombre')).rows); }
  catch (err) { next(err); }
});
router.post('/categorias', async (req, res, next) => {
  try {
    const { nombre, tipo } = req.body;
    if (!nombre || !['ingreso', 'egreso'].includes(tipo)) return res.status(400).json({ error: 'Nombre y tipo son requeridos' });
    res.status(201).json((await pool.query('INSERT INTO categorias_movimiento (nombre, tipo) VALUES ($1, $2) RETURNING *', [nombre, tipo])).rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe esa categoría' });
    next(err);
  }
});
router.put('/categorias/:id', async (req, res, next) => {
  try {
    const { nombre, activo } = req.body;
    const { rows } = await pool.query('UPDATE categorias_movimiento SET nombre = $1, activo = $2 WHERE id = $3 RETURNING *', [nombre, activo !== false, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── Movimientos ──────────────────────────────────────────────────────────────
router.get('/movimientos', async (req, res, next) => {
  try {
    const [desde, hasta] = rangoMes(mesDe(req));
    const params = [];
    let extra = '';
    if (req.query.tipo) { params.push(req.query.tipo); extra += ` AND m.tipo = $${params.length}`; }
    const { rows } = await pool.query(`
      SELECT m.*, c.nombre AS categoria_nombre, s.nombre AS servicio_nombre
      FROM movimientos m
      LEFT JOIN categorias_movimiento c ON c.id = m.categoria_id
      LEFT JOIN servicios s ON s.id = m.servicio_id
      WHERE m.fecha >= '${desde}' AND m.fecha < ${hasta} ${extra}
      ORDER BY m.fecha DESC, m.id DESC`, params);
    res.json(rows);
  } catch (err) { next(err); }
});

const CAMPOS_MOV = ['tipo', 'categoria_id', 'servicio_id', 'concepto', 'monto', 'forma_pago', 'fecha', 'notas'];
function validarMov(b) {
  if (!['ingreso', 'egreso'].includes(b.tipo)) return 'Tipo inválido';
  if (!b.concepto) return 'El concepto es requerido';
  if (!(Number(b.monto) > 0)) return 'El monto debe ser mayor a 0';
  return null;
}
const valsMov = (b) => CAMPOS_MOV.map(c => (b[c] === '' || b[c] === undefined ? null : b[c]));

router.post('/movimientos', async (req, res, next) => {
  try {
    const error = validarMov(req.body);
    if (error) return res.status(400).json({ error });
    const b = { forma_pago: 'transferencia', fecha: new Date().toISOString().slice(0, 10), ...req.body };
    const { rows } = await pool.query(
      `INSERT INTO movimientos (${CAMPOS_MOV.join(', ')}, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [...valsMov(b), req.user.id]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put('/movimientos/:id', async (req, res, next) => {
  try {
    const { rows: [m] } = await pool.query('SELECT * FROM movimientos WHERE id = $1', [req.params.id]);
    if (!m) return res.status(404).json({ error: 'Movimiento no encontrado' });
    if (m.cxc_id || m.cxp_id) return res.status(409).json({ error: 'Este movimiento viene de una cuenta por cobrar/pagar: elimínalo y registra el abono de nuevo' });
    const b = { ...m, ...req.body };
    const error = validarMov(b);
    if (error) return res.status(400).json({ error });
    const { rows } = await pool.query(
      `UPDATE movimientos SET ${CAMPOS_MOV.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE id = $9 RETURNING *`,
      [...valsMov(b), req.params.id]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Borrar un abono también lo revierte en su cuenta por cobrar/pagar
router.delete('/movimientos/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [m] } = await client.query('DELETE FROM movimientos WHERE id = $1 RETURNING *', [req.params.id]);
    if (m?.cxc_id) await client.query('UPDATE cuentas_por_cobrar SET pagado = GREATEST(pagado - $1, 0) WHERE id = $2', [m.monto, m.cxc_id]);
    if (m?.cxp_id) await client.query('UPDATE cuentas_por_pagar SET pagado = GREATEST(pagado - $1, 0) WHERE id = $2', [m.monto, m.cxp_id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) { await client.query('ROLLBACK'); next(err); } finally { client.release(); }
});

// ── Cuentas por cobrar / pagar (misma mecánica: importe, pagado, abonos) ─────
const SALDO = 't.importe - t.pagado';
const ESTATUS = "CASE WHEN t.pagado >= t.importe THEN 'liquidada' WHEN t.pagado > 0 THEN 'parcial' ELSE 'pendiente' END";

function cuentas({ tabla, campos, select, join, tipoMov, categoriaDefault, servicioCol }) {
  const r = require('express').Router();

  r.get('/', async (req, res, next) => {
    try {
      const where = req.query.pendientes ? `WHERE t.pagado < t.importe` : '';
      const { rows } = await pool.query(`
        SELECT t.*, ${SALDO} AS saldo, ${ESTATUS} AS estatus,
               (t.fecha_vencimiento < CURRENT_DATE AND t.pagado < t.importe) AS vencida ${select}
        FROM ${tabla} t ${join} ${where}
        ORDER BY (t.pagado >= t.importe), t.fecha_vencimiento NULLS LAST, t.id DESC LIMIT 500`);
      res.json(rows);
    } catch (err) { next(err); }
  });

  r.post('/', async (req, res, next) => {
    try {
      const b = req.body;
      if (!(Number(b.importe) > 0) || !b.concepto) return res.status(400).json({ error: 'Concepto e importe son requeridos' });
      const { rows } = await pool.query(
        `INSERT INTO ${tabla} (${campos.join(', ')}) VALUES (${campos.map((_, i) => '$' + (i + 1)).join(', ')}) RETURNING *`,
        campos.map(c => (b[c] === '' || b[c] === undefined ? null : b[c])));
      res.status(201).json(rows[0]);
    } catch (err) {
      if (err.code === '23502') return res.status(400).json({ error: 'Faltan datos requeridos' });
      next(err);
    }
  });

  r.put('/:id', async (req, res, next) => {
    try {
      const b = req.body;
      const { rows } = await pool.query(
        `UPDATE ${tabla} SET ${campos.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE id = $${campos.length + 1} RETURNING *`,
        [...campos.map(c => (b[c] === '' || b[c] === undefined ? null : b[c])), req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'Cuenta no encontrada' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  });

  r.delete('/:id', async (req, res, next) => {
    try {
      const { rows: [c] } = await pool.query(`SELECT pagado FROM ${tabla} WHERE id = $1`, [req.params.id]);
      if (c && Number(c.pagado) > 0) return res.status(409).json({ error: 'Tiene abonos registrados: elimínalos primero en Movimientos' });
      await pool.query(`DELETE FROM ${tabla} WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // POST /:id/abono { monto, fecha, forma_pago } → suma a pagado y registra el movimiento
  r.post('/:id/abono', async (req, res, next) => {
    const client = await pool.connect();
    try {
      const monto = Number(req.body.monto);
      await client.query('BEGIN');
      const { rows: [c] } = await client.query(`SELECT * FROM ${tabla} WHERE id = $1 FOR UPDATE`, [req.params.id]);
      if (!c) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Cuenta no encontrada' }); }
      const saldo = Number(c.importe) - Number(c.pagado);
      if (!(monto > 0) || monto > saldo + 0.001) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `El abono debe ser mayor a 0 y no exceder el saldo ($${saldo.toFixed(2)})` });
      }
      await client.query(`UPDATE ${tabla} SET pagado = pagado + $1 WHERE id = $2`, [monto, c.id]);
      const categoria = c.categoria_id || await categoriaPorNombre(client, categoriaDefault);
      const { rows: [m] } = await client.query(
        `INSERT INTO movimientos (tipo, categoria_id, servicio_id, concepto, monto, forma_pago, fecha, ${tipoMov === 'ingreso' ? 'cxc_id' : 'cxp_id'}, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [tipoMov, categoria, servicioCol ? c[servicioCol] : null, c.concepto, monto,
         req.body.forma_pago || 'transferencia', req.body.fecha || new Date().toISOString().slice(0, 10), c.id, req.user.id]);
      await client.query('COMMIT');
      res.status(201).json(m);
    } catch (err) { await client.query('ROLLBACK'); next(err); } finally { client.release(); }
  });

  return r;
}

const cxc = cuentas({
  tabla: 'cuentas_por_cobrar',
  campos: ['servicio_id', 'periodo', 'concepto', 'folio_factura', 'fecha_vencimiento', 'importe', 'observaciones'],
  select: ', s.nombre AS servicio_nombre', join: 'JOIN servicios s ON s.id = t.servicio_id',
  tipoMov: 'ingreso', categoriaDefault: 'Servicio de seguridad', servicioCol: 'servicio_id',
});

// POST /cxc/generar-mes { periodo } — mensualidad de cada servicio activo con tarifa (no duplica)
cxc.post('/generar-mes', async (req, res, next) => {
  try {
    const periodo = MES.test(req.body.periodo || '') ? req.body.periodo : null;
    if (!periodo) return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' });
    const { rowCount } = await pool.query(`
      INSERT INTO cuentas_por_cobrar (servicio_id, periodo, concepto, importe, fecha_vencimiento, es_mensualidad)
      SELECT id, $1::text, 'Servicio de seguridad ' || $1::text, tarifa_mensual, (($1::text || '-01')::date + INTERVAL '1 month' - INTERVAL '1 day')::date, true
      FROM servicios WHERE activo AND tarifa_mensual > 0
      ON CONFLICT (servicio_id, periodo) WHERE es_mensualidad DO NOTHING`, [periodo]);
    res.json({ creadas: rowCount });
  } catch (err) { next(err); }
});
router.use('/cxc', cxc);

router.use('/cxp', cuentas({
  tabla: 'cuentas_por_pagar',
  campos: ['proveedor', 'folio_factura', 'concepto', 'categoria_id', 'fecha_factura', 'fecha_vencimiento', 'importe', 'observaciones'],
  select: ', c.nombre AS categoria_nombre', join: 'LEFT JOIN categorias_movimiento c ON c.id = t.categoria_id',
  tipoMov: 'egreso', categoriaDefault: 'Otros gastos',
}));

// ── Reportes ─────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const mes = mesDe(req);
    const [desde, hasta] = rangoMes(mes);
    const { rows: [k] } = await pool.query(`
      SELECT
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0)::float AS ingresos,
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0)::float AS egresos
      FROM movimientos WHERE fecha >= '${desde}' AND fecha < ${hasta}`);
    const { rows: [c] } = await pool.query(`
      SELECT
        (SELECT COALESCE(SUM(importe - pagado), 0)::float FROM cuentas_por_cobrar) AS por_cobrar,
        (SELECT COUNT(*)::int FROM cuentas_por_cobrar WHERE pagado < importe AND fecha_vencimiento < CURRENT_DATE) AS cobros_vencidos,
        (SELECT COALESCE(SUM(importe - pagado), 0)::float FROM cuentas_por_pagar) AS por_pagar,
        (SELECT COUNT(*)::int FROM cuentas_por_pagar WHERE pagado < importe AND fecha_vencimiento < CURRENT_DATE) AS pagos_vencidos,
        (SELECT COALESCE(SUM(tarifa_mensual), 0)::float FROM servicios WHERE activo) AS facturacion_mensual`);
    const { rows: tendencia } = await pool.query(`
      SELECT to_char(fecha, 'YYYY-MM') AS mes,
             COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0)::float AS ingresos,
             COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0)::float AS egresos
      FROM movimientos WHERE fecha >= (DATE '${desde}' - INTERVAL '5 months') AND fecha < ${hasta}
      GROUP BY 1 ORDER BY 1`);
    const utilidad = k.ingresos - k.egresos;
    res.json({ mes, ...k, utilidad, margen: k.ingresos ? (utilidad / k.ingresos) * 100 : 0, ...c, tendencia });
  } catch (err) { next(err); }
});

router.get('/estado-resultados', async (req, res, next) => {
  try {
    const mes = mesDe(req);
    const [desde, hasta] = rangoMes(mes);
    const { rows } = await pool.query(`
      SELECT m.tipo, COALESCE(c.nombre, 'Sin categoría') AS categoria, SUM(m.monto)::float AS total
      FROM movimientos m LEFT JOIN categorias_movimiento c ON c.id = m.categoria_id
      WHERE m.fecha >= '${desde}' AND m.fecha < ${hasta}
      GROUP BY 1, 2 ORDER BY 1 DESC, 3 DESC`);
    const ingresos = rows.filter(r => r.tipo === 'ingreso');
    const egresos = rows.filter(r => r.tipo === 'egreso');
    const suma = (a) => a.reduce((t, r) => t + r.total, 0);
    res.json({ mes, ingresos, egresos, total_ingresos: suma(ingresos), total_egresos: suma(egresos), utilidad: suma(ingresos) - suma(egresos) });
  } catch (err) { next(err); }
});

// Ganancia por servicio: lo facturado del mes (o la tarifa) − costo estimado de guardias según turnos trabajados
router.get('/ganancia-servicios', async (req, res, next) => {
  try {
    const mes = mesDe(req);
    const [desde, hasta] = rangoMes(mes);
    const { rows } = await pool.query(`
      SELECT s.id, s.nombre, s.tarifa_mensual::float,
             COALESCE((SELECT SUM(importe) FROM cuentas_por_cobrar x WHERE x.servicio_id = s.id AND x.periodo = $1), 0)::float AS facturado,
             COALESCE((SELECT SUM(monto) FROM movimientos m WHERE m.servicio_id = s.id AND m.tipo = 'ingreso'
                         AND m.fecha >= '${desde}' AND m.fecha < ${hasta}), 0)::float AS cobrado,
             COALESCE(t.turnos, 0)::int AS turnos,
             COALESCE(t.costo, 0)::float AS costo_guardias,
             COALESCE(t.sin_salario, 0)::int AS turnos_sin_salario
      FROM servicios s
      LEFT JOIN (
        SELECT j.servicio_id, COUNT(*) AS turnos,
               SUM(COALESCE(e.salario_diario, 0) * ${DIAS_POR_TURNO}) AS costo,
               COUNT(*) FILTER (WHERE e.salario_diario IS NULL) AS sin_salario
        FROM jornadas j JOIN empleados e ON e.id = j.empleado_id
        WHERE j.entrada_at >= '${desde}' AND j.entrada_at < ${hasta}
        GROUP BY j.servicio_id
      ) t ON t.servicio_id = s.id
      WHERE s.activo OR t.turnos > 0
      ORDER BY s.nombre`, [mes]);
    res.json(rows.map(r => {
      const ingreso = r.facturado || r.tarifa_mensual;
      const ganancia = ingreso - r.costo_guardias;
      return { ...r, ingreso, ganancia, margen: ingreso ? (ganancia / ingreso) * 100 : 0 };
    }));
  } catch (err) { next(err); }
});

module.exports = router;
