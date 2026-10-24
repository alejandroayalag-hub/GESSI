import { useEffect, useState } from 'react';
import { guardias as api, servicios, errorDe, hora, nombreGuardia, rolActual } from '../../api/operacion';
import Modal from '../../components/Modal';
import { btn, btnSec, input, label, card, th, td, titulo, chip } from '../../components/ui';

function FormGuardia({ guardia, listaServicios, onClose, onGuardado }) {
  const [f, setF] = useState({
    servicio_id: guardia.servicio_id || '', numero_empleado: guardia.numero_empleado || '',
    salario_diario: guardia.salario_diario || '', pin: '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(e) {
    e.preventDefault(); setError('');
    if (f.pin && !/^\d{4}$/.test(f.pin)) return setError('El PIN debe ser de 4 dígitos');
    try {
      await api.actualizar(guardia.id, f);
      if (f.pin) await api.pin(guardia.id, f.pin);
      onGuardado();
    } catch (err) { setError(errorDe(err)); }
  }

  return (
    <Modal titulo={nombreGuardia(guardia)} onClose={onClose}>
      <form onSubmit={guardar} className="space-y-4">
        <div><label className={label}>Servicio asignado</label>
          <select className={input} value={f.servicio_id} onChange={set('servicio_id')}>
            <option value="">— Sin asignar —</option>
            {listaServicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={label}>No. empleado (NOMIPAQ)</label>
            <input className={input} value={f.numero_empleado} onChange={set('numero_empleado')} /></div>
          <div><label className={label}>Salario diario ($)</label>
            <input type="number" min="0" step="0.01" className={input} value={f.salario_diario} onChange={set('salario_diario')} /></div>
        </div>
        <div><label className={label}>{guardia.tiene_pin ? 'Cambiar PIN' : 'Asignar PIN'} (4 dígitos)</label>
          <input className={input} inputMode="numeric" maxLength="4" value={f.pin} onChange={set('pin')}
            placeholder={guardia.tiene_pin ? 'Dejar vacío para conservar el actual' : '0000'} /></div>
        {error && <p className="text-sm font-semibold text-black">⚠ {error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSec} onClick={onClose}>Cancelar</button>
          <button className={btn}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

export default function GuardiasPage() {
  const [lista, setLista] = useState([]);
  const [listaServicios, setListaServicios] = useState([]);
  const [editando, setEditando] = useState(null);
  const cargar = () => api.listar().then(setLista);
  useEffect(() => { cargar(); servicios.listar().then(s => setListaServicios(s.filter(x => x.activo))); }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className={titulo}>Guardias</h1>
        <p className="text-sm text-neutral-500">Asigna servicio y PIN para checar en caseta. Los expedientes se dan de alta en Personal.</p>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full">
          <thead><tr>
            <th className={th}>Guardia</th><th className={th}>Servicio</th><th className={th}>No. NOMIPAQ</th>
            <th className={th}>PIN</th><th className={th}>Estado</th><th className={th}></th>
          </tr></thead>
          <tbody>
            {lista.map(g => (
              <tr key={g.id}>
                <td className={td}><div className="font-medium">{nombreGuardia(g)}</div><div className="text-xs text-neutral-500">{g.puesto}</div></td>
                <td className={td}>{g.servicio_nombre || <span className={chip(true)}>Sin asignar</span>}</td>
                <td className={td}>{g.numero_empleado || '—'}</td>
                <td className={td}>{g.tiene_pin ? <span className={chip(false)}>Asignado</span> : <span className={chip(true)}>Falta</span>}</td>
                <td className={td}>{g.jornada_id ? `En turno desde ${hora(g.entrada_at)}` : 'Fuera de turno'}</td>
                <td className={td}>{rolActual() !== 'supervisor' && <button className={btnSec} onClick={() => setEditando(g)}>Configurar</button>}</td>
              </tr>
            ))}
            {!lista.length && <tr><td className={td} colSpan="6">No hay empleados activos. Dalos de alta en Personal.</td></tr>}
          </tbody>
        </table>
      </div>
      {editando && <FormGuardia guardia={editando} listaServicios={listaServicios}
        onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar(); }} />}
    </div>
  );
}
