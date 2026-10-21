// Resumen de asistencia por guardia para revisar antes de capturar en NOMIPAQ.
// jornadas: [{ empleado_id, fecha: 'YYYY-MM-DD' (local), horas: number|null }] — horas null = sin salida

function diasEntre(desde, hasta) {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000) + 1;
}

function resumirPrenomina(empleados, jornadas, desde, hasta) {
  const dias = diasEntre(desde, hasta);
  // ponytail: esquema fijo 12x36 = un turno cada 2 días; si cambian de esquema, hacerlo configurable por guardia
  const esperados = Math.ceil(dias / 2);
  return empleados.map(e => {
    const propias = jornadas.filter(j => j.empleado_id === e.id);
    const cerradas = propias.filter(j => j.horas !== null && j.horas !== undefined);
    const horas = cerradas.reduce((t, j) => t + Number(j.horas), 0);
    const diasTrabajados = new Set(propias.map(j => j.fecha)).size;
    return {
      empleado_id: e.id,
      numero_empleado: e.numero_empleado || '',
      nombre: e.nombre,
      servicio: e.servicio || '',
      turnos: propias.length,
      dias_trabajados: diasTrabajados,
      turnos_esperados: esperados,
      faltas: Math.max(0, esperados - propias.length),
      sin_salida: propias.length - cerradas.length,
      horas: Math.round(horas * 100) / 100,
      promedio_semanal: Math.round((horas / (dias / 7)) * 10) / 10,
    };
  });
}

module.exports = { resumirPrenomina, diasEntre };
