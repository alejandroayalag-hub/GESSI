import { useEffect, useState } from 'react';
import { jornadas, servicios, semanaActual } from '../../api/operacion';
import JornadasTabla from '../../components/JornadasTabla';
import { input, label, titulo } from '../../components/ui';

export default function AsistenciaPage() {
  const [f, setF] = useState({ ...semanaActual(), servicio_id: '' });
  const [lista, setLista] = useState([]);
  const [listaServicios, setListaServicios] = useState([]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const cargar = () => jornadas.listar({ ...f, servicio_id: f.servicio_id || undefined }).then(setLista);
  useEffect(() => { servicios.listar().then(setListaServicios); }, []);
  useEffect(() => { cargar(); }, [f]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className={titulo}>Asistencia</h1>
        <p className="text-sm text-neutral-500">Entradas y salidas registradas en caseta con PIN y selfie.</p>
      </div>
      <div className="flex gap-4 flex-wrap items-end">
        <div><label className={label}>Desde</label><input type="date" className={input} value={f.desde} onChange={set('desde')} /></div>
        <div><label className={label}>Hasta</label><input type="date" className={input} value={f.hasta} onChange={set('hasta')} /></div>
        <div><label className={label}>Servicio</label>
          <select className={input} value={f.servicio_id} onChange={set('servicio_id')}>
            <option value="">Todos</option>
            {listaServicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select></div>
      </div>
      <JornadasTabla lista={lista} onCambio={cargar} />
    </div>
  );
}
