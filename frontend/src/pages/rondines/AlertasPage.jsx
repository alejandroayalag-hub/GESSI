import { useEffect, useState } from 'react';
import { rondines, fechaHora } from '../../api/operacion';
import { btnSec, card, th, td, titulo, chip } from '../../components/ui';

const TIPOS = { sos: 'SOS', incidente: 'Incidente', no_escaneo: 'Sin rondín', fuera_de_rango: 'Fuera de rango', fuera_de_zona: 'Checada fuera de zona' };
const CATEGORIAS = { robo: 'Robo / asalto', dano: 'Daño a instalaciones', sospechoso: 'Persona o vehículo sospechoso', accidente: 'Accidente / lesionado', otro: 'Otro' };

export default function AlertasPage() {
  const [lista, setLista] = useState([]);
  const [verResueltas, setVerResueltas] = useState(false);
  const cargar = () => rondines.alertas(verResueltas ? {} : { resuelta: false }).then(setLista);
  useEffect(() => { cargar(); const t = setInterval(cargar, 30000); return () => clearInterval(t); }, [verResueltas]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className={titulo}>Alertas</h1>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-black" checked={verResueltas} onChange={e => setVerResueltas(e.target.checked)} />
          Mostrar resueltas
        </label>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full">
          <thead><tr>
            <th className={th}>Tipo</th><th className={th}>Servicio / guardia</th><th className={th}>Detalle</th>
            <th className={th}>Fecha</th><th className={th}></th>
          </tr></thead>
          <tbody>
            {lista.map(a => (
              <tr key={a.id} className={a.resuelta ? 'opacity-50' : ''}>
                <td className={td}>
                  <span className={chip(['sos', 'incidente'].includes(a.tipo) && !a.resuelta)}>{TIPOS[a.tipo]}</span>
                  {a.categoria && <div className="text-xs text-neutral-500 mt-1">{CATEGORIAS[a.categoria]}</div>}
                </td>
                <td className={td}>{a.servicio_nombre}<div className="text-xs text-neutral-500">{a.guardia_nombre}</div></td>
                <td className={td}>
                  <span className="whitespace-pre-line">{a.mensaje}</span>
                  {a.fotos?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {a.fotos.map(f => <a key={f} href={f} target="_blank" rel="noreferrer"><img src={f} alt="Foto del incidente" className="w-16 h-16 object-cover rounded" /></a>)}
                    </div>
                  )}
                  {a.latitud && <a className="block text-xs underline" target="_blank" rel="noreferrer"
                    href={`https://www.google.com/maps?q=${a.latitud},${a.longitud}`}>Ver ubicación</a>}
                </td>
                <td className={td}>{fechaHora(a.created_at)}</td>
                <td className={td}>
                  {a.resuelta
                    ? <span className="text-xs text-neutral-500">Resuelta por {a.resuelta_por_nombre}</span>
                    : <button className={btnSec} onClick={() => rondines.resolverAlerta(a.id).then(cargar)}>Resolver</button>}
                </td>
              </tr>
            ))}
            {!lista.length && <tr><td className={td} colSpan="5">Sin alertas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
