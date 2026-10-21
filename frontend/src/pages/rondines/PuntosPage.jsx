import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { rondines as api, servicios, errorDe } from '../../api/operacion';
import Modal from '../../components/Modal';
import { btn, btnSec, input, label, card, th, td, titulo, chip } from '../../components/ui';

const VACIO = { servicio_id: '', nombre: '', descripcion: '', latitud: '', longitud: '', radio_tolerancia_metros: 50, orden: 0 };

function FormPunto({ inicial, listaServicios, onClose, onGuardado }) {
  const [f, setF] = useState(inicial);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  function miUbicacion() {
    navigator.geolocation.getCurrentPosition(
      p => setF(v => ({ ...v, latitud: p.coords.latitude.toFixed(7), longitud: p.coords.longitude.toFixed(7) })),
      () => setError('No se pudo obtener la ubicación'));
  }
  async function guardar(e) {
    e.preventDefault(); setError('');
    try { onGuardado(f.id ? await api.actualizarPunto(f.id, f) : await api.crearPunto(f)); }
    catch (err) { setError(errorDe(err)); }
  }
  return (
    <Modal titulo={f.id ? 'Editar punto' : 'Nuevo punto de rondín'} onClose={onClose}>
      <form onSubmit={guardar} className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className={label}>Servicio</label>
          <select className={input} value={f.servicio_id} onChange={set('servicio_id')} required>
            <option value="">— Elige —</option>
            {listaServicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select></div>
        <div className="col-span-2"><label className={label}>Nombre</label>
          <input className={input} value={f.nombre} onChange={set('nombre')} required placeholder="Portón norte" /></div>
        <div className="col-span-2"><label className={label}>Descripción</label>
          <input className={input} value={f.descripcion || ''} onChange={set('descripcion')} /></div>
        <div><label className={label}>Latitud</label><input className={input} value={f.latitud || ''} onChange={set('latitud')} /></div>
        <div><label className={label}>Longitud</label><input className={input} value={f.longitud || ''} onChange={set('longitud')} /></div>
        <div className="col-span-2 -mt-2">
          <button type="button" onClick={miUbicacion} className="text-xs underline text-neutral-600 hover:text-black">Usar mi ubicación actual</button>
        </div>
        <div><label className={label}>Tolerancia (m)</label>
          <input type="number" min="5" className={input} value={f.radio_tolerancia_metros} onChange={set('radio_tolerancia_metros')} /></div>
        <div><label className={label}>Orden en el rondín</label>
          <input type="number" min="0" className={input} value={f.orden} onChange={set('orden')} /></div>
        {error && <p className="col-span-2 text-sm font-semibold text-black">⚠ {error}</p>}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" className={btnSec} onClick={onClose}>Cancelar</button>
          <button className={btn}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

function VerQR({ punto, onClose }) {
  return (
    <Modal titulo={punto.nombre} onClose={onClose} ancho="max-w-sm">
      <div id="qr-imprimir" className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs uppercase tracking-widest text-neutral-500">G.E.S.S.I. · {punto.servicio_nombre}</p>
        <QRCodeSVG value={punto.qr_codigo} size={240} />
        <p className="font-bold text-lg">{punto.nombre}</p>
        <p className="text-xs text-neutral-500 font-mono">{punto.qr_codigo}</p>
      </div>
      <button className={`${btn} w-full mt-4 print:hidden`} onClick={() => window.print()}>Imprimir</button>
    </Modal>
  );
}

export default function PuntosPage() {
  const [lista, setLista] = useState([]);
  const [listaServicios, setListaServicios] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [editando, setEditando] = useState(null);
  const [qr, setQr] = useState(null);
  const cargar = () => api.puntos({ todos: 1, servicio_id: filtro || undefined }).then(setLista);
  useEffect(() => { servicios.listar().then(s => setListaServicios(s.filter(x => x.activo))); }, []);
  useEffect(() => { cargar(); }, [filtro]);

  async function eliminar(p) {
    if (!confirm(`¿Eliminar "${p.nombre}" y su historial de escaneos?`)) return;
    try { await api.eliminarPunto(p.id); cargar(); } catch (e) { alert(errorDe(e)); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className={titulo}>Puntos QR</h1>
          <p className="text-sm text-neutral-500">Imprime cada código y pégalo en su punto de rondín.</p>
        </div>
        <div className="flex gap-2">
          <select className={input} value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="">Todos los servicios</option>
            {listaServicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <button className={`${btn} whitespace-nowrap`} onClick={() => setEditando({ ...VACIO, servicio_id: filtro })}>+ Nuevo punto</button>
        </div>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full">
          <thead><tr>
            <th className={th}>#</th><th className={th}>Punto</th><th className={th}>Servicio</th>
            <th className={th}>Ubicación</th><th className={th}>Estado</th><th className={th}></th>
          </tr></thead>
          <tbody>
            {lista.map(p => (
              <tr key={p.id} className={p.activo ? '' : 'opacity-50'}>
                <td className={td}>{p.orden}</td>
                <td className={td}><div className="font-medium">{p.nombre}</div><div className="text-xs text-neutral-500 font-mono">{p.qr_codigo}</div></td>
                <td className={td}>{p.servicio_nombre}</td>
                <td className={td}>{p.latitud ? `± ${p.radio_tolerancia_metros} m` : <span className={chip(true)}>Sin GPS</span>}</td>
                <td className={td}><button className="underline text-sm" onClick={() => api.togglePunto(p.id).then(cargar)}>{p.activo ? 'Activo' : 'Inactivo'}</button></td>
                <td className={`${td} whitespace-nowrap space-x-2`}>
                  <button className={btnSec} onClick={() => setQr(p)}>QR</button>
                  <button className={btnSec} onClick={() => setEditando(p)}>Editar</button>
                  <button className={btnSec} onClick={() => eliminar(p)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!lista.length && <tr><td className={td} colSpan="6">Sin puntos de rondín.</td></tr>}
          </tbody>
        </table>
      </div>
      {editando && <FormPunto inicial={editando} listaServicios={listaServicios.filter(s => s.tiene_rondines || s.id == editando.servicio_id)}
        onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar(); }} />}
      {qr && <VerQR punto={qr} onClose={() => setQr(null)} />}
    </div>
  );
}
