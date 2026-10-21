import { useEffect, useState } from 'react';
import { servicios as api, errorDe, fechaHora } from '../../api/operacion';
import Modal from '../../components/Modal';
import { btn, btnSec, input, label, card, th, td, titulo, chip } from '../../components/ui';

const VACIO = { nombre: '', direccion: '', contacto_nombre: '', contacto_telefono: '', latitud: '', longitud: '',
  radio_metros: 150, tiene_rondines: false, intervalo_rondin_min: 60, tarifa_mensual: 0, activo: true };

function FormServicio({ inicial, onGuardado, onClose }) {
  const [f, setF] = useState(inicial);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function miUbicacion() {
    navigator.geolocation.getCurrentPosition(
      p => setF(v => ({ ...v, latitud: p.coords.latitude.toFixed(7), longitud: p.coords.longitude.toFixed(7) })),
      () => setError('No se pudo obtener la ubicación'));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true); setError('');
    try {
      onGuardado(f.id ? await api.actualizar(f.id, f) : await api.crear(f));
    } catch (err) { setError(errorDe(err)); } finally { setGuardando(false); }
  }

  return (
    <Modal titulo={f.id ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <form onSubmit={guardar} className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className={label}>Nombre del servicio</label>
          <input className={input} value={f.nombre} onChange={set('nombre')} required placeholder="Fracc. Las Lomas" /></div>
        <div className="col-span-2"><label className={label}>Dirección</label>
          <input className={input} value={f.direccion || ''} onChange={set('direccion')} /></div>
        <div><label className={label}>Contacto</label>
          <input className={input} value={f.contacto_nombre || ''} onChange={set('contacto_nombre')} /></div>
        <div><label className={label}>Teléfono</label>
          <input className={input} value={f.contacto_telefono || ''} onChange={set('contacto_telefono')} /></div>
        <div><label className={label}>Latitud caseta</label>
          <input className={input} value={f.latitud || ''} onChange={set('latitud')} placeholder="19.4195" /></div>
        <div><label className={label}>Longitud caseta</label>
          <input className={input} value={f.longitud || ''} onChange={set('longitud')} placeholder="-102.0630" /></div>
        <div className="col-span-2 -mt-2">
          <button type="button" onClick={miUbicacion} className="text-xs underline text-neutral-600 hover:text-black">Usar mi ubicación actual</button>
          <span className="text-xs text-neutral-400"> · o copia las coordenadas desde Google Maps</span>
        </div>
        <div><label className={label}>Radio de checada (m)</label>
          <input type="number" min="20" className={input} value={f.radio_metros} onChange={set('radio_metros')} /></div>
        <div><label className={label}>Tarifa mensual ($)</label>
          <input type="number" min="0" step="0.01" className={input} value={f.tarifa_mensual} onChange={set('tarifa_mensual')} /></div>
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.tiene_rondines} onChange={set('tiene_rondines')} className="accent-black" />
          Este servicio tiene rondines contratados
        </label>
        {f.tiene_rondines && (
          <div><label className={label}>Alerta si no hay rondín en (min)</label>
            <input type="number" min="10" className={input} value={f.intervalo_rondin_min} onChange={set('intervalo_rondin_min')} /></div>
        )}
        {f.id && (
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.activo} onChange={set('activo')} className="accent-black" /> Servicio activo
          </label>
        )}
        {error && <p className="col-span-2 text-sm font-semibold text-black">⚠ {error}</p>}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" className={btnSec} onClick={onClose}>Cancelar</button>
          <button className={btn} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

function Vincular({ servicio, onClose, onCambio }) {
  const [codigo, setCodigo] = useState(servicio.codigo_vinculacion);
  const [error, setError] = useState('');
  async function generar() {
    if (servicio.dispositivo_vinculado_at && !confirm('El celular actual dejará de funcionar. ¿Continuar?')) return;
    try { setCodigo((await api.vincular(servicio.id)).codigo_vinculacion); onCambio(); } catch (e) { setError(errorDe(e)); }
  }
  async function desvincular() {
    if (!confirm('El celular de esta caseta dejará de funcionar. ¿Continuar?')) return;
    await api.desvincular(servicio.id); setCodigo(null); onCambio();
  }
  return (
    <Modal titulo={`Celular de caseta · ${servicio.nombre}`} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p className="text-neutral-600">
          {servicio.dispositivo_vinculado_at
            ? `Celular vinculado el ${fechaHora(servicio.dispositivo_vinculado_at)}.`
            : 'Ningún celular vinculado.'}
        </p>
        {codigo ? (
          <div className="text-center border-2 border-black rounded-xl py-6">
            <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Código de vinculación</p>
            <p className="text-5xl font-bold tracking-[0.3em] text-black">{codigo}</p>
            <p className="text-xs text-neutral-500 mt-3">Escríbelo en la app GESSI del celular de la caseta. Sirve una sola vez.</p>
          </div>
        ) : (
          <button className={btn} onClick={generar}>
            {servicio.dispositivo_vinculado_at ? 'Vincular otro celular' : 'Generar código'}
          </button>
        )}
        {error && <p className="font-semibold text-black">⚠ {error}</p>}
        {(servicio.dispositivo_vinculado_at || codigo) && (
          <button className={btnSec} onClick={desvincular}>Desvincular celular</button>
        )}
      </div>
    </Modal>
  );
}

export default function ServiciosPage() {
  const [lista, setLista] = useState([]);
  const [editando, setEditando] = useState(null);
  const [vinculando, setVinculando] = useState(null);
  const cargar = () => api.listar().then(setLista);
  useEffect(() => { cargar(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={titulo}>Clientes</h1>
          <p className="text-sm text-neutral-500">Servicios contratados, su caseta y su celular.</p>
        </div>
        <button className={btn} onClick={() => setEditando(VACIO)}>+ Nuevo cliente</button>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full">
          <thead><tr>
            <th className={th}>Servicio</th><th className={th}>Guardias</th><th className={th}>En turno</th>
            <th className={th}>Rondines</th><th className={th}>Celular</th><th className={th}>Tarifa</th><th className={th}></th>
          </tr></thead>
          <tbody>
            {lista.map(s => (
              <tr key={s.id} className={s.activo ? '' : 'opacity-50'}>
                <td className={td}>
                  <div className="font-medium">{s.nombre}</div>
                  <div className="text-xs text-neutral-500">{s.direccion}</div>
                  {!s.latitud && <span className={chip(true)}>Sin ubicación</span>}
                </td>
                <td className={td}>{s.guardias}</td>
                <td className={td}>{s.en_turno}</td>
                <td className={td}>{s.tiene_rondines ? <span className={chip(false)}>Sí · {s.intervalo_rondin_min} min</span> : '—'}</td>
                <td className={td}>
                  <button className="underline text-sm" onClick={() => setVinculando(s)}>
                    {s.dispositivo_vinculado_at ? 'Vinculado' : s.codigo_vinculacion ? `Código ${s.codigo_vinculacion}` : 'Vincular'}
                  </button>
                </td>
                <td className={td}>${Number(s.tarifa_mensual).toLocaleString('es-MX')}</td>
                <td className={td}><button className={btnSec} onClick={() => setEditando(s)}>Editar</button></td>
              </tr>
            ))}
            {!lista.length && <tr><td className={td} colSpan="7">Aún no hay clientes. Agrega el primero.</td></tr>}
          </tbody>
        </table>
      </div>
      {editando && <FormServicio inicial={editando} onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar(); }} />}
      {vinculando && <Vincular servicio={vinculando} onClose={() => setVinculando(null)} onCambio={cargar} />}
    </div>
  );
}
