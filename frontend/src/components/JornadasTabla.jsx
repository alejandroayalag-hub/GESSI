import { useState } from 'react';
import { jornadas as api, errorDe, fechaHora } from '../api/operacion';
import Modal from './Modal';
import { btn, btnSec, input, label, card, th, td, chip } from './ui';

// datetime-local necesita "YYYY-MM-DDTHH:mm" en hora local
const local = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function Corregir({ j, onClose, onGuardado }) {
  const [f, setF] = useState({ entrada_at: local(j.entrada_at), salida_at: local(j.salida_at), observaciones: j.observaciones || '' });
  const [error, setError] = useState('');
  async function guardar(e) {
    e.preventDefault(); setError('');
    try {
      await api.actualizar(j.id, {
        entrada_at: new Date(f.entrada_at).toISOString(),
        salida_at: f.salida_at ? new Date(f.salida_at).toISOString() : null,
        observaciones: f.observaciones,
      });
      onGuardado();
    } catch (err) { setError(errorDe(err)); }
  }
  return (
    <Modal titulo={`Corregir jornada · ${j.guardia_nombre}`} onClose={onClose}>
      <form onSubmit={guardar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {j.entrada_foto && <img src={j.entrada_foto} alt="Selfie de entrada" className="rounded-lg w-full aspect-square object-cover" />}
          {j.entrada_foto_cuerpo && <img src={j.entrada_foto_cuerpo} alt="Cuerpo completo al entrar" className="rounded-lg w-full object-contain max-h-96" />}
          {j.salida_foto && <img src={j.salida_foto} alt="Selfie de salida" className="rounded-lg w-full aspect-square object-cover" />}
        </div>
        <div><label className={label}>Entrada</label>
          <input type="datetime-local" className={input} value={f.entrada_at} onChange={e => setF({ ...f, entrada_at: e.target.value })} required /></div>
        <div><label className={label}>Salida</label>
          <input type="datetime-local" className={input} value={f.salida_at} onChange={e => setF({ ...f, salida_at: e.target.value })} /></div>
        <div><label className={label}>Observaciones (motivo de la corrección)</label>
          <textarea className={input} rows="2" value={f.observaciones} onChange={e => setF({ ...f, observaciones: e.target.value })} /></div>
        {error && <p className="text-sm font-semibold text-black">⚠ {error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSec} onClick={onClose}>Cancelar</button>
          <button className={btn}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

function Selfie({ src, alt }) {
  if (!src) return <div className="w-10 h-10 rounded-full bg-neutral-100" />;
  return <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={alt} className="w-10 h-10 rounded-full object-cover grayscale hover:grayscale-0" /></a>;
}

export default function JornadasTabla({ lista, onCambio, mostrarGuardia = true }) {
  const [corrigiendo, setCorrigiendo] = useState(null);
  return (
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full">
        <thead><tr>
          {mostrarGuardia && <th className={th}>Guardia</th>}
          <th className={th}>Servicio</th><th className={th}>Entrada</th><th className={th}>Salida</th>
          <th className={th}>Horas</th><th className={th}>Notas</th><th className={th}></th>
        </tr></thead>
        <tbody>
          {lista.map(j => (
            <tr key={j.id}>
              {mostrarGuardia && <td className={td}>{j.guardia_nombre}</td>}
              <td className={td}>{j.servicio_nombre}</td>
              <td className={td}>
                <div className="flex items-center gap-2"><Selfie src={j.entrada_foto} alt="Selfie de entrada" />
                  <div>{fechaHora(j.entrada_at)}{j.entrada_en_zona === false && <div><span className={chip(true)}>Fuera de zona</span></div>}</div></div>
              </td>
              <td className={td}>
                {j.salida_at
                  ? <div className="flex items-center gap-2"><Selfie src={j.salida_foto} alt="Selfie de salida" />{fechaHora(j.salida_at)}</div>
                  : <span className={chip(true)}>Sin salida</span>}
              </td>
              <td className={td}>{j.horas ?? '—'}</td>
              <td className={`${td} text-xs text-neutral-500 max-w-[200px]`}>{j.observaciones}</td>
              <td className={td}><button className={btnSec} onClick={() => setCorrigiendo(j)}>Corregir</button></td>
            </tr>
          ))}
          {!lista.length && <tr><td className={td} colSpan="7">Sin jornadas en el periodo.</td></tr>}
        </tbody>
      </table>
      {corrigiendo && <Corregir j={corrigiendo} onClose={() => setCorrigiendo(null)} onGuardado={() => { setCorrigiendo(null); onCambio(); }} />}
    </div>
  );
}
