import { useEffect, useState } from 'react';
import { jornadas, semanaActual } from '../api/operacion';
import JornadasTabla from './JornadasTabla';
import { input, label } from './ui';

export default function TabAsistencia({ empleadoId }) {
  const [filtro, setFiltro] = useState(semanaActual);
  const [lista, setLista] = useState([]);
  const cargar = () => jornadas.listar({ ...filtro, empleado_id: empleadoId }).then(setLista);
  useEffect(() => { cargar(); }, [empleadoId, filtro.desde, filtro.hasta]);
  const horas = lista.reduce((t, j) => t + (j.horas || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end flex-wrap">
        <div><label className={label}>Desde</label><input type="date" className={input} value={filtro.desde} onChange={e => setFiltro({ ...filtro, desde: e.target.value })} /></div>
        <div><label className={label}>Hasta</label><input type="date" className={input} value={filtro.hasta} onChange={e => setFiltro({ ...filtro, hasta: e.target.value })} /></div>
        <p className="text-sm text-neutral-600 pb-2">{lista.length} turnos · {horas.toFixed(1)} h</p>
      </div>
      <JornadasTabla lista={lista} onCambio={cargar} mostrarGuardia={false} />
    </div>
  );
}
