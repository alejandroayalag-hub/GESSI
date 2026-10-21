import { useEffect, useState } from 'react';
import { finanzas } from '../../api/finanzas';
import { errorDe } from '../../api/operacion';
import { btn, btnSec, input, card, th, td, titulo } from '../../components/ui';

export default function CategoriasPage() {
  const [lista, setLista] = useState([]);
  const [nueva, setNueva] = useState({ nombre: '', tipo: 'egreso' });
  const [error, setError] = useState('');
  const cargar = () => finanzas.categorias().then(setLista);
  useEffect(() => { cargar(); }, []);

  async function crear(e) {
    e.preventDefault(); setError('');
    try { await finanzas.crearCategoria(nueva); setNueva({ ...nueva, nombre: '' }); cargar(); } catch (err) { setError(errorDe(err)); }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className={titulo}>Categorías</h1>
      <form onSubmit={crear} className="flex gap-2">
        <input className={input} placeholder="Nueva categoría" value={nueva.nombre} onChange={e => setNueva({ ...nueva, nombre: e.target.value })} required />
        <select className={input + ' !w-40'} value={nueva.tipo} onChange={e => setNueva({ ...nueva, tipo: e.target.value })}>
          <option value="egreso">Egreso</option><option value="ingreso">Ingreso</option>
        </select>
        <button className={btn}>Agregar</button>
      </form>
      {error && <p className="text-sm font-semibold">⚠ {error}</p>}
      <div className={card}>
        <table className="w-full">
          <thead><tr><th className={th}>Nombre</th><th className={th}>Tipo</th><th className={th}></th></tr></thead>
          <tbody>
            {lista.map(c => (
              <tr key={c.id} className={c.activo ? '' : 'opacity-50'}>
                <td className={td}>{c.nombre}</td><td className={td}>{c.tipo}</td>
                <td className={td}><button className={btnSec} onClick={() => finanzas.actualizarCategoria(c.id, { nombre: c.nombre, activo: !c.activo }).then(cargar)}>
                  {c.activo ? 'Desactivar' : 'Activar'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
