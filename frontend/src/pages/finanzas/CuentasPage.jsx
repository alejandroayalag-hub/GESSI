import { useEffect, useState } from 'react';
import { finanzas, mesActual, dinero, soloFecha, FORMAS_PAGO } from '../../api/finanzas';
import { servicios, errorDe } from '../../api/operacion';
import Modal from '../../components/Modal';
import { btn, btnSec, input, label, card, th, td, titulo, chip } from '../../components/ui';

// tipo 'cxc' = cuentas por cobrar (a clientes/servicios), 'cxp' = cuentas por pagar (a proveedores)
const TEXTOS = {
  cxc: { titulo: 'Cuentas por cobrar', sub: 'Mensualidades y cargos a cada servicio.', quien: 'Servicio', abono: 'Registrar cobro' },
  cxp: { titulo: 'Cuentas por pagar', sub: 'Facturas de proveedores pendientes de pago.', quien: 'Proveedor', abono: 'Registrar pago' },
};

function FormCuenta({ tipo, inicial, listaServicios, categorias, onClose, onGuardado }) {
  const [f, setF] = useState(inicial);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function guardar(e) {
    e.preventDefault(); setError('');
    const datos = { ...f, fecha_vencimiento: soloFecha(f.fecha_vencimiento), fecha_factura: soloFecha(f.fecha_factura) };
    try { await (f.id ? finanzas.actualizarCuenta(tipo, f.id, datos) : finanzas.crearCuenta(tipo, datos)); onGuardado(); }
    catch (err) { setError(errorDe(err)); }
  }
  return (
    <Modal titulo={f.id ? 'Editar cuenta' : TEXTOS[tipo].titulo.replace('Cuentas', 'Nueva cuenta')} onClose={onClose}>
      <form onSubmit={guardar} className="grid grid-cols-2 gap-4">
        {tipo === 'cxc' ? <>
          <div className="col-span-2"><label className={label}>Servicio</label>
            <select className={input} value={f.servicio_id || ''} onChange={set('servicio_id')} required>
              <option value="">— Elige —</option>
              {listaServicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select></div>
          <div><label className={label}>Periodo</label>
            <input type="month" className={input} value={f.periodo || ''} onChange={set('periodo')} required /></div>
        </> : <>
          <div className="col-span-2"><label className={label}>Proveedor</label>
            <input className={input} value={f.proveedor || ''} onChange={set('proveedor')} required /></div>
          <div><label className={label}>Categoría</label>
            <select className={input} value={f.categoria_id || ''} onChange={set('categoria_id')}>
              <option value="">—</option>
              {categorias.filter(c => c.tipo === 'egreso').map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select></div>
        </>}
        <div><label className={label}>Folio factura</label>
          <input className={input} value={f.folio_factura || ''} onChange={set('folio_factura')} /></div>
        <div className="col-span-2"><label className={label}>Concepto</label>
          <input className={input} value={f.concepto || ''} onChange={set('concepto')} required /></div>
        <div><label className={label}>Importe</label>
          <input type="number" step="0.01" min="0.01" className={input} value={f.importe || ''} onChange={set('importe')} required /></div>
        <div><label className={label}>Vence</label>
          <input type="date" className={input} value={soloFecha(f.fecha_vencimiento)} onChange={set('fecha_vencimiento')} /></div>
        <div className="col-span-2"><label className={label}>Observaciones</label>
          <input className={input} value={f.observaciones || ''} onChange={set('observaciones')} /></div>
        {error && <p className="col-span-2 text-sm font-semibold">⚠ {error}</p>}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" className={btnSec} onClick={onClose}>Cancelar</button>
          <button className={btn}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

function Abono({ tipo, cuenta, onClose, onGuardado }) {
  const [f, setF] = useState({ monto: cuenta.saldo, fecha: new Date().toISOString().slice(0, 10), forma_pago: 'transferencia' });
  const [error, setError] = useState('');
  async function guardar(e) {
    e.preventDefault(); setError('');
    try { await finanzas.abonar(tipo, cuenta.id, f); onGuardado(); } catch (err) { setError(errorDe(err)); }
  }
  return (
    <Modal titulo={`${TEXTOS[tipo].abono} · ${cuenta.servicio_nombre || cuenta.proveedor}`} onClose={onClose}>
      <form onSubmit={guardar} className="space-y-4">
        <p className="text-sm text-neutral-600">{cuenta.concepto} · saldo {dinero(cuenta.saldo)}</p>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={label}>Monto</label><input type="number" step="0.01" className={input} value={f.monto} onChange={e => setF({ ...f, monto: e.target.value })} /></div>
          <div><label className={label}>Fecha</label><input type="date" className={input} value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} /></div>
          <div><label className={label}>Forma</label>
            <select className={input} value={f.forma_pago} onChange={e => setF({ ...f, forma_pago: e.target.value })}>
              {FORMAS_PAGO.map(x => <option key={x}>{x}</option>)}
            </select></div>
        </div>
        <p className="text-xs text-neutral-500">Se registrará automáticamente en Movimientos.</p>
        {error && <p className="text-sm font-semibold">⚠ {error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnSec} onClick={onClose}>Cancelar</button>
          <button className={btn}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

export default function CuentasPage({ tipo }) {
  const t = TEXTOS[tipo];
  const [lista, setLista] = useState([]);
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [listaServicios, setListaServicios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [editando, setEditando] = useState(null);
  const [abonando, setAbonando] = useState(null);
  const [aviso, setAviso] = useState('');
  const cargar = () => finanzas.cuentas(tipo, soloPendientes ? { pendientes: 1 } : {}).then(setLista);
  useEffect(() => { servicios.listar().then(setListaServicios); finanzas.categorias().then(setCategorias); }, []);
  useEffect(() => { cargar(); }, [tipo, soloPendientes]);

  async function generar() {
    const periodo = mesActual();
    const r = await finanzas.generarMes(periodo);
    setAviso(r.creadas ? `Se generaron ${r.creadas} mensualidades de ${periodo}.` : `Las mensualidades de ${periodo} ya estaban generadas.`);
    cargar();
  }
  async function eliminar(c) {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    try { await finanzas.eliminarCuenta(tipo, c.id); cargar(); } catch (e) { alert(errorDe(e)); }
  }
  const saldo = lista.reduce((s, c) => s + Number(c.saldo), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div><h1 className={titulo}>{t.titulo}</h1><p className="text-sm text-neutral-500">{t.sub}</p></div>
        <div className="flex gap-2">
          {tipo === 'cxc' && <button className={btnSec} onClick={generar}>Generar mensualidades del mes</button>}
          <button className={btn} onClick={() => setEditando(tipo === 'cxc' ? { periodo: mesActual() } : {})}>+ Nueva</button>
        </div>
      </div>
      {aviso && <p className="text-sm border border-black rounded-lg px-3 py-2">{aviso}</p>}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-black" checked={soloPendientes} onChange={e => setSoloPendientes(e.target.checked)} /> Solo pendientes
        </label>
        <p className="text-sm font-semibold">Saldo: {dinero(saldo)}</p>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full">
          <thead><tr>
            <th className={th}>{t.quien}</th><th className={th}>Concepto</th><th className={th}>Vence</th>
            <th className={`${th} text-right`}>Importe</th><th className={`${th} text-right`}>Saldo</th><th className={th}>Estatus</th><th className={th}></th>
          </tr></thead>
          <tbody>
            {lista.map(c => (
              <tr key={c.id}>
                <td className={td}>{c.servicio_nombre || c.proveedor}{c.folio_factura && <div className="text-xs text-neutral-500">Folio {c.folio_factura}</div>}</td>
                <td className={td}>{c.concepto}</td>
                <td className={`${td} whitespace-nowrap`}>{soloFecha(c.fecha_vencimiento) || '—'}</td>
                <td className={`${td} text-right`}>{dinero(c.importe)}</td>
                <td className={`${td} text-right font-medium`}>{dinero(c.saldo)}</td>
                <td className={td}><span className={chip(c.vencida)}>{c.vencida ? 'Vencida' : c.estatus}</span></td>
                <td className={`${td} whitespace-nowrap space-x-2`}>
                  {c.estatus !== 'liquidada' && <button className={btn + ' !py-1.5 !px-3'} onClick={() => setAbonando(c)}>{t.abono}</button>}
                  <button className={btnSec} onClick={() => setEditando(c)}>Editar</button>
                  {Number(c.pagado) === 0 && <button className={btnSec} onClick={() => eliminar(c)}>Eliminar</button>}
                </td>
              </tr>
            ))}
            {!lista.length && <tr><td className={td} colSpan="7">Sin cuentas.</td></tr>}
          </tbody>
        </table>
      </div>
      {editando && <FormCuenta tipo={tipo} inicial={editando} listaServicios={listaServicios} categorias={categorias}
        onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar(); }} />}
      {abonando && <Abono tipo={tipo} cuenta={abonando} onClose={() => setAbonando(null)} onGuardado={() => { setAbonando(null); cargar(); }} />}
    </div>
  );
}
