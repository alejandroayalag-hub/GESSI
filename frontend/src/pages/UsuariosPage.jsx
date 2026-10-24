import { useEffect, useState } from 'react';
import { usuarios as api, ROLES, errorDe, fechaHora } from '../api/operacion';
import Modal from '../components/Modal';
import { btn, btnSec, input, label, card, th, td, titulo, chip } from '../components/ui';

const ACCESO = {
  admin: 'Todo: Personal, Rondines, Finanzas y Usuarios',
  rh: 'Personal (expedientes, asistencia, pre-nómina, pagos) y Rondines',
  supervisor: 'Solo Rondines (sin tarifas ni salarios)',
};
const VACIO = { nombre: '', email: '', role: 'rh', activo: true, password: '' };

function FormUsuario({ inicial, onGuardado, onClose }) {
  const [f, setF] = useState({ ...inicial, password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setError('');
    try { onGuardado(f.id ? await api.actualizar(f.id, f) : await api.crear(f)); }
    catch (err) { setError(errorDe(err)); }
  }

  return (
    <Modal titulo={f.id ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose}>
      <form onSubmit={guardar} className="space-y-4">
        <div><label className={label}>Nombre</label>
          <input className={input} value={f.nombre} onChange={set('nombre')} required /></div>
        <div><label className={label}>Correo (para entrar)</label>
          <input type="email" className={input} value={f.email} onChange={set('email')} required /></div>
        <div><label className={label}>Rol</label>
          <select className={input} value={f.role} onChange={set('role')}>
            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <p className="text-xs text-neutral-500 mt-1">{ACCESO[f.role]}</p></div>
        <div><label className={label}>{f.id ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'}</label>
          <input type="password" className={input} value={f.password} onChange={set('password')}
            minLength={8} required={!f.id} autoComplete="new-password" placeholder="Mínimo 8 caracteres" /></div>
        {f.id && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-black" checked={f.activo} onChange={set('activo')} /> Usuario activo (puede entrar)
          </label>
        )}
        {error && <p className="text-sm font-semibold">⚠ {error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSec} onClick={onClose}>Cancelar</button>
          <button className={btn}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

export default function UsuariosPage() {
  const [lista, setLista] = useState([]);
  const [editando, setEditando] = useState(null);
  const cargar = () => api.listar().then(setLista);
  useEffect(() => { cargar(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={titulo}>Usuarios</h1>
          <p className="text-sm text-neutral-500">Quién entra al panel y qué puede ver. Los usuarios no se borran: se desactivan.</p>
        </div>
        <button className={btn} onClick={() => setEditando(VACIO)}>+ Nuevo usuario</button>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full">
          <thead><tr>
            <th className={th}>Nombre</th><th className={th}>Correo</th><th className={th}>Rol</th>
            <th className={th}>Alta</th><th className={th}></th>
          </tr></thead>
          <tbody>
            {lista.map(u => (
              <tr key={u.id} className={u.activo ? '' : 'opacity-50'}>
                <td className={td}>{u.nombre}{!u.activo && <span className="text-xs text-neutral-500"> · inactivo</span>}</td>
                <td className={td}>{u.email}</td>
                <td className={td}><span className={chip(u.role === 'admin')}>{ROLES[u.role]}</span></td>
                <td className={td}>{fechaHora(u.created_at)}</td>
                <td className={td}><button className={btnSec} onClick={() => setEditando(u)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editando && <FormUsuario inicial={editando} onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar(); }} />}
    </div>
  );
}
