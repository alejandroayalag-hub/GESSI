import { useEffect, useState } from 'react';
import { finanzas, mesActual, dinero } from '../../api/finanzas';
import SelectorMes from '../../components/SelectorMes';
import { card, titulo } from '../../components/ui';

function Kpi({ etiqueta, valor, nota, invertido }) {
  return (
    <div className={invertido ? 'bg-black text-white rounded-xl p-5' : `${card} p-5`}>
      <p className={`text-xs uppercase tracking-widest ${invertido ? 'text-neutral-300' : 'text-neutral-500'}`}>{etiqueta}</p>
      <p className="text-2xl font-bold mt-1">{valor}</p>
      {nota && <p className={`text-xs mt-1 ${invertido ? 'text-neutral-300' : 'text-neutral-500'}`}>{nota}</p>}
    </div>
  );
}

export default function DashboardFinanzas() {
  const [mes, setMes] = useState(mesActual);
  const [k, setK] = useState(null);
  useEffect(() => { finanzas.dashboard(mes).then(setK); }, [mes]);
  const max = Math.max(1, ...(k?.tendencia || []).flatMap(t => [t.ingresos, t.egresos]));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className={titulo}>Finanzas</h1>
        <SelectorMes mes={mes} onChange={setMes} />
      </div>
      {k && <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi etiqueta="Ingresos del mes" valor={dinero(k.ingresos)} />
          <Kpi etiqueta="Egresos del mes" valor={dinero(k.egresos)} />
          <Kpi etiqueta="Utilidad" valor={dinero(k.utilidad)} nota={`Margen ${k.margen.toFixed(1)}%`} invertido />
          <Kpi etiqueta="Facturación mensual" valor={dinero(k.facturacion_mensual)} nota="Suma de tarifas de servicios activos" />
          <Kpi etiqueta="Por cobrar" valor={dinero(k.por_cobrar)} nota={k.cobros_vencidos ? `${k.cobros_vencidos} vencidas` : 'Sin vencidas'} invertido={k.cobros_vencidos > 0} />
          <Kpi etiqueta="Por pagar" valor={dinero(k.por_pagar)} nota={k.pagos_vencidos ? `${k.pagos_vencidos} vencidas` : 'Sin vencidas'} invertido={k.pagos_vencidos > 0} />
        </div>
        <div className={`${card} p-5`}>
          <p className="text-sm font-semibold mb-1">Últimos 6 meses</p>
          <p className="text-xs text-neutral-500 mb-4">■ Ingresos (negro) · □ Egresos (contorno)</p>
          <div className="flex items-end gap-6 h-48">
            {k.tendencia.map(t => (
              <div key={t.mes} className="flex-1 max-w-[120px] h-full flex flex-col justify-end items-center gap-2">
                <div className="flex items-end gap-1 h-full w-full justify-center">
                  <div className="w-6 bg-black rounded-t" style={{ height: `${(t.ingresos / max) * 100}%` }} title={`Ingresos ${dinero(t.ingresos)}`} />
                  <div className="w-6 border-2 border-black rounded-t" style={{ height: `${(t.egresos / max) * 100}%` }} title={`Egresos ${dinero(t.egresos)}`} />
                </div>
                <span className="text-xs text-neutral-500">{t.mes}</span>
              </div>
            ))}
            {!k.tendencia.length && <p className="text-sm text-neutral-500">Sin movimientos registrados.</p>}
          </div>
        </div>
      </>}
    </div>
  );
}
