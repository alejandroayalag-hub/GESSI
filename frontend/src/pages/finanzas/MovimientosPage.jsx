import { useEffect, useState } from 'react';
import { finanzas, mesActual, dinero, soloFecha, FORMAS_PAGO } from '../../api/finanzas';
import { servicios, errorDe } from '../../api/operacion';
import Modal from '../../components/Modal';
import SelectorMes from '../../components/SelectorMes';
import { btn, btnSec, input, label, card, th, td, titulo, chip } from '../../components/ui';

function FormMovimiento({ inicial, categorias, listaServicios, onClose, onGuardado }) {
  const [f, setF] = useState(inicial);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function guardar(e) {
    e.preventDefault(); setError('');
    try { await (f.id ? finanzas.actualizarMovimiento(f.id, f) : finanzas.crearMovimiento(f)); onGuardado(); }
    catch (err) { setError(errorDe(err)); }
  }
  return (
    <Modal titulo={f.id ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={onClose}>
      <form onSubmit={guardar} className="grid grid-cols-2 gap-4">
        <div className="col-span-2 flex gap-2">
          {['ingreso', 'egreso'].map(t => (
            <button type="button" key={t} onClick={() => setF({ ...f, tipo: t, categoria_id: '' })}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold border ${f.tipo === t ? 'bg-black text-white border-black' : 'border-neutral-300'}`}>
              {t === 'ingreso' ? 'Ingreso' : 'Egreso'}
            </button>
          ))}
        </div>
        <div className="col-span-2"><label className={label}>Concepto</label>
          <input className={input} value={f.concepto} onChange={set('concepto')} required /></div>
        <div><label className={label}>Monto</label>
          <input type="number" step="0.01" min="0.01" className={input} value={f.monto} onChange={set('monto')} required /></div>
        <div><label className={label}>Fecha</label>
          <input type="date" className={input} value={soloFecha(f.fecha)} onChange={set('fecha')} required /></div>
        <div><label className={label}>Categoría</label>
          <select className={input} value={f.categoria_id || ''} onChange={set('categoria_id')}>
            <option value="">—</option>
            {categorias.filter(c => c.tipo === f.tipo && c.activo).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select></div>
        <div><label className={label}>Forma de pago</label>
          <select className={input} value={f.forma_pago} onChange={set('forma_pago')}>
            {FORMAS_PAGO.map(x => <option key={x} value={x}>{x}</option>)}
          </select></div>
        <div className="col-span-2"><label className={label}>Servicio (opcional)</label>
          <select className={input} value={f.servicio_id || ''} onChange={set('servicio_id')}>
            <option value="">—</option>
            {listaServicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select></div>
        <div className="col-span-2"><label className={label}>Notas</label>
          <input className={input} value={f.notas || ''} onChange={set('notas')} /></div>
        {error && <p className="col-span-2 text-sm font-semibold">⚠ {error}</p>}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" className={btnSec} onClick={onClose}>Cancelar</button>
          <button className={btn}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

export default function MovimientosPage() {
  const [mes, setMes] = useState(mesActual);
  const [tipo, setTipo] = useState('');
  const [lista, setLista] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [listaServicios, setListaServicios] = useState([]);
  const [editando, setEditando] = useState(null);
  const cargar = () => finanzas.movimientos({ mes, tipo: tipo || undefined }).then(setLista);
  useEffect(() => { finanzas.categorias().then(setCategorias); servicios.listar().then(setListaServicios); }, []);
  useEffect(() => { cargar(); }, [mes, tipo]);

  async function eliminar(m) {
    const extra = m.cxc_id || m.cxp_id ? ' El abono se revertirá en su cuenta.' : '';
    if (!confirm(`¿Eliminar "${m.concepto}" por ${dinero(m.monto)}?${extra}`)) return;
    await finanzas.eliminarMovimiento(m.id); cargar();
  }
  const total = (t) => lista.filter(m => m.tipo === t).reduce((s, m) => s + Number(m.monto), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className={titulo}>Movimientos</h1>
        <div className="flex gap-3 items-end">
          <SelectorMes mes={mes} onChange={setMes} />
          <div><label className={label}>Tipo</label>
            <select className={input} value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="">Todos</option><option value="ingreso">Ingresos</option><option value="egreso">Egresos</option>
            </select></div>
          <button className={btn} onClick={() => setEditando({ tipo: 'egreso', concepto: '', monto: '', fecha: new Date().toISOString().slice(0, 10), forma_pago: 'transferencia' })}>+ Movimiento</button>
        </div>
      </div>
      <p className="text-sm text-neutral-600">Ingresos {dinero(total('ingreso'))} · Egresos {dinero(total('egreso'))}</p>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full">
          <thead><tr>
            <th className={th}>Fecha</th><th className={th}>Concepto</th><th className={th}>Categoría</th>
            <th className={th}>Servicio</th><th className={th}>Forma</th><th className={`${th} text-right`}>Monto</th><th className={th}></th>
          </tr></thead>
          <tbody>
            {lista.map(m => (
              <tr key={m.id}>
                <td className={td}>{soloFecha(m.fecha)}</td>
                <td className={td}>{m.concepto}{(m.cxc_id || m.cxp_id) && <span className={`${chip(false)} ml-2`}>{m.cxc_id ? 'Cobro' : 'Pago'}</span>}</td>
                <td className={td}>{m.categoria_nombre || '—'}</td>
                <td className={td}>{m.servicio_nombre || '—'}</td>
                <td className={td}>{m.forma_pago}</td>
                <td className={`${td} text-right font-medium whitespace-nowrap`}>{m.tipo === 'egreso' ? '−' : '+'} {dinero(m.monto)}</td>
                <td className={`${td} whitespace-nowrap space-x-2`}>
                  {!m.cxc_id && !m.cxp_id && <button className={btnSec} onClick={() => setEditando(m)}>Editar</button>}
                  <button className={btnSec} onClick={() => eliminar(m)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {!lista.length && <tr><td className={td} colSpan="7">Sin movimientos en el mes.</td></tr>}
          </tbody>
        </table>
      </div>
      {editando && <FormMovimiento inicial={editando} categorias={categorias} listaServicios={listaServicios}
        onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar(); }} />}
    </div>
  );
}
