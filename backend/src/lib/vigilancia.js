// Revisa cada 5 min los servicios con rondines: si nadie ha escaneado en `intervalo_rondin_min`
// desde el último escaneo (o desde que empezó la primera jornada abierta), crea una alerta no_escaneo.
const pool = require('../db/pool');

async function revisarRondines() {
  const { rows } = await pool.query(`
    WITH ref AS (
      SELECT s.id, s.nombre, s.intervalo_rondin_min,
             GREATEST(
               (SELECT MIN(j.entrada_at) FROM jornadas j WHERE j.servicio_id = s.id AND j.salida_at IS NULL),
               (SELECT MAX(x.created_at) FROM escaneos x JOIN puntos_rondin p ON p.id = x.punto_id WHERE p.servicio_id = s.id)
             ) AS desde
      FROM servicios s
      WHERE s.activo AND s.tiene_rondines
        AND EXISTS (SELECT 1 FROM jornadas j WHERE j.servicio_id = s.id AND j.salida_at IS NULL)
    )
    SELECT * FROM ref
    WHERE desde < NOW() - make_interval(mins => intervalo_rondin_min)
      AND NOT EXISTS (SELECT 1 FROM alertas a WHERE a.servicio_id = ref.id AND a.tipo = 'no_escaneo' AND a.created_at > ref.desde)`);
  for (const s of rows) {
    await pool.query(
      "INSERT INTO alertas (servicio_id, tipo, mensaje) VALUES ($1, 'no_escaneo', $2)",
      [s.id, `${s.nombre}: más de ${s.intervalo_rondin_min} min sin rondín`]);
  }
}

function iniciarVigilancia() {
  setInterval(() => revisarRondines().catch(err => console.error('Vigilancia rondines:', err.message)), 5 * 60 * 1000);
}

module.exports = { iniciarVigilancia, revisarRondines };
