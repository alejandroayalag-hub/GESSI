import { useEffect, useState } from 'react';
import { rondines, servicios, hoy, fechaHora } from '../../api/operacion';
import { input, label, card, th, td, titulo, chip } from '../../components/ui';

export default function BitacoraPage() {
  const [f, setF] = useState({ desde: hoy(), hasta: hoy(), servicio_id: '' });
  const [lista, setLista] = useState([]);
  const [vista, setVista] = useState('rondines'); // rondines | novedades
  const [listaServicios, setListaServicios] = useState([]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { servicios.listar().then(setListaServicios); }, []);
  useEffect(() => {
    setLista([]);
    (vista === 'rondines' ? rondines.escaneos : rondines.bitacora)({ ...f, servicio_id: f.servicio_id || undefined }).then(setLista);
  }, [f, vista]);

  const fuera = lista.filter(x => x.dentro_de_rango === false).length;

  return (
    <div className="space-y-4">
      <h1 className={titulo}>Bitácora</h1>
      <div className="flex border-b border-neutral-200">
        {[['rondines', 'Rondines (escaneos QR)'], ['novedades', 'Novedades del turno']].map(([k, t]) => (
          <button key={k} onClick={() => setVista(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${vista === k ? 'border-black text-black' : 'border-transparent text-neutral-500 hover:text-black'}`}>{t}</button>
        ))}
      </div>
      <div className="flex gap-4 flex-wrap items-end">
        <div><label className={label}>Desde</label><input type="date" className={input} value={f.desde} onChange={set('desde')} /></div>
        <div><label className={label}>Hasta</label><input type="date" className={input} value={f.hasta} onChange={set('hasta')} /></div>
        <div><label className={label}>Servicio</label>
          <select className={input} value={f.servicio_id} onChange={set('servicio_id')}>
            <option value="">Todos</option>
            {listaServicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select></div>
        <p className="text-sm text-neutral-600 pb-2">
          {vista === 'rondines' ? `${lista.length} escaneos · ${fuera} fuera de rango` : `${lista.length} notas`}
        </p>
      </div>
      {vista === 'novedades' ? (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full">
            <thead><tr><th className={th}>Fecha</th><th className={th}>Servicio</th><th className={th}>Guardia</th><th className={th}>Nota</th></tr></thead>
            <tbody>
              {lista.map(b => (
                <tr key={b.id}>
                  <td className={`${td} whitespace-nowrap`}>{fechaHora(b.created_at)}</td>
                  <td className={td}>{b.servicio_nombre}</td>
                  <td className={td}>{b.guardia_nombre || '—'}</td>
                  <td className={`${td} whitespace-pre-line`}>{b.texto}</td>
                </tr>
              ))}
              {!lista.length && <tr><td className={td} colSpan="4">Sin notas en el periodo.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full">
          <thead><tr>
            <th className={th}>Fecha</th><th className={th}>Servicio</th><th className={th}>Punto</th>
            <th className={th}>Guardia</th><th className={th}>GPS</th>
          </tr></thead>
          <tbody>
            {lista.map(x => (
              <tr key={x.id}>
                <td className={td}>{fechaHora(x.created_at)}</td>
                <td className={td}>{x.servicio_nombre}</td>
                <td className={td}>{x.punto_nombre}</td>
                <td className={td}>{x.guardia_nombre}</td>
                <td className={td}>
                  {x.dentro_de_rango === null ? '—'
                    : <span className={chip(!x.dentro_de_rango)}>{x.dentro_de_rango ? 'En rango' : `A ${x.distancia_metros} m`}</span>}
                </td>
              </tr>
            ))}
            {!lista.length && <tr><td className={td} colSpan="5">Sin escaneos en el periodo.</td></tr>}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
