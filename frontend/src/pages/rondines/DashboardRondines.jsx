import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rondines, fechaHora } from '../../api/operacion';
import { card, titulo, chip } from '../../components/ui';

const kpiNormal = 'bg-white border border-neutral-200 rounded-xl p-5';
const kpiAlerta = 'bg-black text-white border border-black rounded-xl p-5';

function Kpi({ etiqueta, valor, alerta }) {
  return (
    <div className={alerta ? kpiAlerta : kpiNormal}>
      <p className={`text-xs uppercase tracking-widest ${alerta ? 'text-neutral-300' : 'text-neutral-500'}`}>{etiqueta}</p>
      <p className="text-3xl font-bold mt-1">{valor ?? '—'}</p>
    </div>
  );
}

export default function DashboardRondines() {
  const [r, setR] = useState(null);
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    const cargar = () => {
      rondines.resumen().then(setR);
      rondines.alertas({ resuelta: false }).then(a => setAlertas(a.slice(0, 6)));
    };
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, []);

  const max = Math.max(1, ...(r?.por_hora || []).map(h => h.escaneos));
  const horas = Array.from({ length: 24 }, (_, h) => r?.por_hora?.find(x => x.hora === h)?.escaneos || 0);

  return (
    <div className="space-y-6">
      <h1 className={titulo}>Operación en vivo</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Kpi etiqueta="Servicios activos" valor={r?.servicios} />
        <Kpi etiqueta="Guardias en turno" valor={r?.en_turno} />
        <Kpi etiqueta="Escaneos hoy" valor={r?.escaneos_hoy} />
        <Kpi etiqueta="Fuera de rango hoy" valor={r?.fuera_rango_hoy} />
        <Kpi etiqueta={r?.sos_pendientes ? '¡SOS sin atender!' : 'Alertas pendientes'}
          valor={r?.sos_pendientes || r?.alertas_pendientes} alerta={r?.sos_pendientes > 0} />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className={`${card} p-5 md:col-span-2`}>
          <p className="text-sm font-semibold mb-4">Escaneos últimas 24 h (por hora)</p>
          <div className="flex items-end gap-1 h-40" role="img" aria-label="Escaneos por hora">
            {horas.map((v, h) => (
              <div key={h} className="flex-1 h-full flex flex-col justify-end items-center gap-1" title={`${h}:00 · ${v} escaneos`}>
                <div className="w-full bg-black rounded-t" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0 }} />
                <span className="text-[10px] text-neutral-400">{h % 3 === 0 ? h : ''}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`${card} p-5`}>
          <div className="flex justify-between mb-3">
            <p className="text-sm font-semibold">Alertas pendientes</p>
            <Link to="/rondines/alertas" className="text-xs underline">Ver todas</Link>
          </div>
          <ul className="space-y-3">
            {alertas.map(a => (
              <li key={a.id} className="text-sm">
                <span className={chip(a.tipo === 'sos')}>{a.tipo.replaceAll('_', ' ').toUpperCase()}</span>
                <p className="mt-1">{a.servicio_nombre}{a.guardia_nombre ? ` · ${a.guardia_nombre}` : ''}</p>
                <p className="text-xs text-neutral-500">{fechaHora(a.created_at)}</p>
              </li>
            ))}
            {!alertas.length && <li className="text-sm text-neutral-500">Sin alertas pendientes.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
