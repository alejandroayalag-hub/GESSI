import { useEffect, useState } from 'react';
import { rondines, servicios as apiServicios, fechaHora, errorDe } from '../../api/operacion';
import Modal from '../../components/Modal';
import { btn, btnSec, input, label, card, titulo, chip } from '../../components/ui';

const CATEGORIAS = { bloqueo: 'Bloqueo', balacera: 'Balacera', robo: 'Robo / asalto', manifestacion: 'Manifestación', otro: 'Otro riesgo' };
const NIVELES = { precaucion: 'Precaución', peligro: 'Peligro' };
const VIGENCIAS = [[2, '2 horas'], [6, '6 horas'], [12, '12 horas'], [24, '24 horas'], [72, '3 días'], [168, '7 días'], ['', 'Hasta retirarlo']];

function FormAviso({ tipo, onGuardado, onClose }) {
  const sdr = tipo === 'sdr';
  const [f, setF] = useState({ tipo, categoria: 'bloqueo', nivel: 'precaucion', titulo: '', texto: '', zona: '', horas: sdr ? 6 : '', servicio_ids: [] });
  const [lista, setLista] = useState([]);
  const [todos, setTodos] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { apiServicios.listar().then(r => setLista(r.filter(s => s.activo))); }, []);

  function toggleServicio(id) {
    setF(v => ({ ...v, servicio_ids: v.servicio_ids.includes(id) ? v.servicio_ids.filter(x => x !== id) : [...v.servicio_ids, id] }));
  }

  async function guardar(e) {
    e.preventDefault();
    if (!todos && !f.servicio_ids.length) return setError('Elige al menos un servicio');
    setGuardando(true); setError('');
    try {
      onGuardado(await rondines.publicarAviso({ ...f, servicio_ids: todos ? null : f.servicio_ids }));
    } catch (err) { setError(errorDe(err)); } finally { setGuardando(false); }
  }

  return (
    <Modal titulo={sdr ? 'Publicar situación de riesgo (SDR)' : 'Publicar aviso'} onClose={onClose}>
      <form onSubmit={guardar} className="grid grid-cols-2 gap-4">
        {sdr && <>
          <div><label className={label}>Tipo de riesgo</label>
            <select className={input} value={f.categoria} onChange={set('categoria')}>
              {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div><label className={label}>Nivel</label>
            <select className={input} value={f.nivel} onChange={set('nivel')}>
              {Object.entries(NIVELES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
        </>}
        <div className="col-span-2"><label className={label}>Título</label>
          <input className={input} value={f.titulo} onChange={set('titulo')} required maxLength={150}
            placeholder={sdr ? 'Bloqueo en salida a Pátzcuaro' : 'Cambio de horario de relevo'} /></div>
        {sdr && <div className="col-span-2"><label className={label}>Zona (calle, colonia, referencia)</label>
          <input className={input} value={f.zona} onChange={set('zona')} maxLength={200} placeholder="Libramiento Oriente a la altura de…" /></div>}
        <div className="col-span-2"><label className={label}>Detalle / indicaciones</label>
          <textarea className={input} rows={4} value={f.texto} onChange={set('texto')}
            placeholder={sdr ? 'Mantener portón cerrado, no salir a rondín perimetral hasta nuevo aviso.' : ''} /></div>
        <div><label className={label}>Vigencia</label>
          <select className={input} value={f.horas} onChange={set('horas')}>
            {VIGENCIAS.map(([h, t]) => <option key={t} value={h}>{t}</option>)}
          </select></div>
        <div><label className={label}>Para</label>
          <select className={input} value={todos ? 'todos' : 'algunos'} onChange={e => setTodos(e.target.value === 'todos')}>
            <option value="todos">Todos los servicios</option>
            <option value="algunos">Solo algunos servicios</option>
          </select></div>
        {!todos && (
          <div className="col-span-2 grid grid-cols-2 gap-1 max-h-40 overflow-y-auto border border-neutral-200 rounded-lg p-2">
            {lista.map(s => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-black" checked={f.servicio_ids.includes(s.id)} onChange={() => toggleServicio(s.id)} />
                {s.nombre}
              </label>
            ))}
          </div>
        )}
        {error && <p className="col-span-2 text-sm font-semibold">⚠ {error}</p>}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" className={btnSec} onClick={onClose}>Cancelar</button>
          <button className={btn} disabled={guardando}>{guardando ? 'Publicando…' : 'Publicar'}</button>
        </div>
      </form>
    </Modal>
  );
}

function Tarjeta({ a, onRetirar }) {
  const [verAcuses, setVerAcuses] = useState(false);
  const enterados = a.destinatarios.filter(d => d.enterado_at).length;
  const peligro = a.nivel === 'peligro' && a.vigente;
  return (
    <div className={`${card} p-4 ${peligro ? 'border-2 border-black' : ''} ${a.vigente ? '' : 'opacity-50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2">
            {a.tipo === 'sdr' && <span className={chip(peligro)}>{NIVELES[a.nivel]}</span>}
            {a.tipo === 'sdr' && <span className={chip(false)}>{CATEGORIAS[a.categoria]}</span>}
            {!a.vigente && <span className={chip(false)}>{a.activo ? 'Vencido' : 'Retirado'}</span>}
          </div>
          <h3 className="font-semibold text-black">{a.titulo}</h3>
          {a.zona && <p className="text-sm font-medium">📍 {a.zona}</p>}
          {a.texto && <p className="text-sm text-neutral-700 whitespace-pre-line">{a.texto}</p>}
          <p className="text-xs text-neutral-500">
            {fechaHora(a.created_at)} · {a.creado_por_nombre || '—'} · {a.vigente_hasta ? `vence ${fechaHora(a.vigente_hasta)}` : 'sin vencimiento'}
            {' · '}{a.servicio_ids ? `${a.destinatarios.length} servicio(s)` : 'todos los servicios'}
          </p>
        </div>
        {a.vigente && <button className={btnSec} onClick={() => onRetirar(a)}>Retirar</button>}
      </div>
      <button className="mt-2 text-xs underline text-neutral-600 hover:text-black" onClick={() => setVerAcuses(v => !v)}>
        Enterados {enterados} de {a.destinatarios.length}
      </button>
      {verAcuses && (
        <ul className="mt-2 grid grid-cols-2 gap-x-4 text-sm">
          {a.destinatarios.map(d => (
            <li key={d.nombre} className={d.enterado_at ? '' : 'font-semibold'}>
              {d.enterado_at ? '✓' : '○'} {d.nombre}
              <span className="text-xs text-neutral-500"> {d.enterado_at ? fechaHora(d.enterado_at) : 'pendiente'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PizarronPage() {
  const [tipo, setTipo] = useState('sdr');
  const [lista, setLista] = useState([]);
  const [historial, setHistorial] = useState(false);
  const [form, setForm] = useState(false);
  const cargar = () => rondines.avisos({ tipo, ...(historial && { todos: 1 }) }).then(setLista);
  useEffect(() => { cargar(); const t = setInterval(cargar, 30000); return () => clearInterval(t); }, [tipo, historial]);

  async function retirar(a) {
    if (!confirm(`¿Retirar "${a.titulo}"? Dejará de verse en las casetas.`)) return;
    try { await rondines.retirarAviso(a.id); cargar(); } catch (err) { alert(errorDe(err)); }
  }

  const pestaña = (t, texto) => (
    <button onClick={() => setTipo(t)}
      className={`px-4 py-2 text-sm font-medium border-b-2 ${tipo === t ? 'border-black text-black' : 'border-transparent text-neutral-500 hover:text-black'}`}>
      {texto}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className={titulo}>Pizarrón</h1>
        <button className={btn} onClick={() => setForm(true)}>{tipo === 'sdr' ? '+ Publicar SDR' : '+ Publicar aviso'}</button>
      </div>
      <div className="flex items-center justify-between border-b border-neutral-200">
        <div className="flex">{pestaña('sdr', 'SDR · Situaciones de riesgo')}{pestaña('aviso', 'Avisos')}</div>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" className="accent-black" checked={historial} onChange={e => setHistorial(e.target.checked)} />
          Ver vencidos y retirados
        </label>
      </div>
      <p className="text-sm text-neutral-500">
        {tipo === 'sdr'
          ? 'Bloqueos, balaceras y otros riesgos en la zona. Aparecen arriba en la app de caseta y el celular vibra.'
          : 'Avisos generales para los guardias. Aparecen en la app de caseta.'}
      </p>
      <div className="space-y-3">
        {lista.map(a => <Tarjeta key={a.id} a={a} onRetirar={retirar} />)}
        {!lista.length && <div className={`${card} p-6 text-sm text-neutral-500`}>{tipo === 'sdr' ? 'Sin situaciones de riesgo activas.' : 'Sin avisos activos.'}</div>}
      </div>
      {form && <FormAviso tipo={tipo} onClose={() => setForm(false)} onGuardado={() => { setForm(false); cargar(); }} />}
    </div>
  );
}
