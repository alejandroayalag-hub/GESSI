import { useEffect, useState } from 'react';
import { finanzas, mesActual, dinero } from '../../api/finanzas';
import SelectorMes from '../../components/SelectorMes';
import { card, titulo } from '../../components/ui';

function Bloque({ titulo: t, filas, total }) {
  return (
    <>
      <tr><td colSpan="2" className="pt-4 pb-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">{t}</td></tr>
      {filas.map(f => (
        <tr key={f.categoria} className="border-b border-neutral-100">
          <td className="py-2 pl-4 text-sm">{f.categoria}</td><td className="py-2 text-right text-sm">{dinero(f.total)}</td>
        </tr>
      ))}
      <tr className="border-b border-neutral-300"><td className="py-2 text-sm font-semibold">Total {t.toLowerCase()}</td><td className="py-2 text-right font-semibold">{dinero(total)}</td></tr>
    </>
  );
}

export default function EstadoResultados() {
  const [mes, setMes] = useState(mesActual);
  const [e, setE] = useState(null);
  useEffect(() => { finanzas.estado(mes).then(setE); }, [mes]);
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-end justify-between gap-4">
        <h1 className={titulo}>Estado de resultados</h1>
        <SelectorMes mes={mes} onChange={setMes} />
      </div>
      {e && (
        <div className={`${card} p-6`}>
          <table className="w-full">
            <tbody>
              <Bloque titulo="Ingresos" filas={e.ingresos} total={e.total_ingresos} />
              <Bloque titulo="Egresos" filas={e.egresos} total={e.total_egresos} />
              <tr><td className="pt-4 text-lg font-bold">Utilidad del mes</td><td className="pt-4 text-right text-lg font-bold">{dinero(e.utilidad)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
