import { useEffect, useState } from 'react';
import { rondines, servicios, hoy, fechaHora } from '../../api/operacion';
import { input, label, card, th, td, titulo, chip } from '../../components/ui';

export default function BitacoraPage() {
  const [f, setF] = useState({ desde: hoy(), hasta: hoy(), servicio_id: '' });
  const [lista, setLista] = useState([]);
  const [listaServicios, setListaServicios] = useState([]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { servicios.listar().then(setListaServicios); }, []);
  useEffect(() => { rondines.escaneos({ ...f, servicio_id: f.servicio_id || undefined }).then(setLista); }, [f]);

  const fuera = lista.filter(x => x.dentro_de_rango === false).length;

  return (
    <div className="space-y-4">
      <h1 className={titulo}>Bitácora de rondines</h1>
      <div className="flex gap-4 flex-wrap items-end">
        <div><label className={label}>Desde</label><input type="date" className={input} value={f.desde} onChange={set('desde')} /></div>
        <div><label className={label}>Hasta</label><input type="date" className={input} value={f.hasta} onChange={set('hasta')} /></div>
        <div><label className={label}>Servicio</label>
          <select className={input} value={f.servicio_id} onChange={set('servicio_id')}>
            <option value="">Todos</option>
            {listaServicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select></div>
        <p className="text-sm text-neutral-600 pb-2">{lista.length} escaneos · {fuera} fuera de rango</p>
      </div>
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
    </div>
  );
}
