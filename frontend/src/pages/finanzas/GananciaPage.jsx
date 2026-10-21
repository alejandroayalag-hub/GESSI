import { useEffect, useState } from 'react';
import { finanzas, mesActual, dinero } from '../../api/finanzas';
import SelectorMes from '../../components/SelectorMes';
import { card, th, td, titulo, chip } from '../../components/ui';

export default function GananciaPage() {
  const [mes, setMes] = useState(mesActual);
  const [filas, setFilas] = useState([]);
  useEffect(() => { finanzas.ganancia(mes).then(setFilas); }, [mes]);
  const tot = (k) => filas.reduce((s, r) => s + r[k], 0);
  const sinSalario = filas.reduce((s, r) => s + r.turnos_sin_salario, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className={titulo}>Ganancia por servicio</h1>
          <p className="text-sm text-neutral-500">Ingreso del mes menos el costo estimado de los guardias que cubrieron cada servicio.</p>
        </div>
        <SelectorMes mes={mes} onChange={setMes} />
      </div>
      {sinSalario > 0 && <p className="text-sm"><span className={chip(true)}>{sinSalario} turnos</span> de guardias sin salario diario capturado cuentan como $0 (captúralo en Rondines › Guardias).</p>}
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full">
          <thead><tr>
            <th className={th}>Servicio</th><th className={`${th} text-right`}>Ingreso</th><th className={`${th} text-right`}>Cobrado</th>
            <th className={`${th} text-right`}>Turnos</th><th className={`${th} text-right`}>Costo guardias</th>
            <th className={`${th} text-right`}>Ganancia</th><th className={`${th} text-right`}>Margen</th>
          </tr></thead>
          <tbody>
            {filas.map(r => (
              <tr key={r.id}>
                <td className={td}>{r.nombre}{!r.facturado && r.tarifa_mensual > 0 && <div className="text-xs text-neutral-500">Ingreso = tarifa (sin cargo generado)</div>}</td>
                <td className={`${td} text-right`}>{dinero(r.ingreso)}</td>
                <td className={`${td} text-right`}>{dinero(r.cobrado)}</td>
                <td className={`${td} text-right`}>{r.turnos}</td>
                <td className={`${td} text-right`}>{dinero(r.costo_guardias)}</td>
                <td className={`${td} text-right font-semibold`}>{dinero(r.ganancia)}</td>
                <td className={`${td} text-right`}><span className={chip(r.margen < 20)}>{r.margen.toFixed(1)}%</span></td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className={td}>Total</td><td className={`${td} text-right`}>{dinero(tot('ingreso'))}</td><td className={`${td} text-right`}>{dinero(tot('cobrado'))}</td>
              <td className={`${td} text-right`}>{tot('turnos')}</td><td className={`${td} text-right`}>{dinero(tot('costo_guardias'))}</td>
              <td className={`${td} text-right`}>{dinero(tot('ganancia'))}</td><td className={td}></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">Costo guardias = turnos trabajados × salario diario × 2 (en 12x36 cada turno de 12 h equivale a dos días de salario). No incluye IMSS ni prestaciones.</p>
    </div>
  );
}
