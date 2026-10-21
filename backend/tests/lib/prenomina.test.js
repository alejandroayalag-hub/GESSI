const { resumirPrenomina, diasEntre } = require('../../src/lib/prenomina');

test('resume turnos, horas, faltas y promedio semanal en 12x36', () => {
  const empleados = [
    { id: 1, numero_empleado: '001', nombre: 'Juan Pérez', servicio: 'Fracc. Lomas' },
    { id: 2, numero_empleado: '', nombre: 'Ana López', servicio: '' },
  ];
  const jornadas = [
    { empleado_id: 1, fecha: '2026-10-01', horas: 12 },
    { empleado_id: 1, fecha: '2026-10-03', horas: 12 },
    { empleado_id: 1, fecha: '2026-10-05', horas: 11.5 },
    { empleado_id: 1, fecha: '2026-10-07', horas: null }, // olvidó checar salida
  ];
  const [juan, ana] = resumirPrenomina(empleados, jornadas, '2026-10-01', '2026-10-14');

  expect(diasEntre('2026-10-01', '2026-10-14')).toBe(14);
  expect(juan).toMatchObject({ turnos: 4, dias_trabajados: 4, turnos_esperados: 7, faltas: 3, sin_salida: 1, horas: 35.5 });
  expect(juan.promedio_semanal).toBe(17.8);
  expect(ana).toMatchObject({ turnos: 0, faltas: 7, horas: 0, promedio_semanal: 0 });
});
