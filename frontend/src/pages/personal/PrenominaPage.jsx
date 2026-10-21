import { useEffect, useState } from 'react';
import { jornadas, semanaActual, errorDe } from '../../api/operacion';
import { btn, input, label, card, th, td, titulo, chip } from '../../components/ui';

export default function PrenominaPage() {
  const [f, setF] = useState(semanaActual);
  const [filas, setFilas] = useState([]);
  const [descargando, setDescargando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { jornadas.prenomina(f).then(setFilas).catch(() => setFilas([])); }, [f]);

  async function descargar() {
    setDescargando(true);
    try { await jornadas.descargarPrenomina(f); } catch (e) { alert(errorDe(e)); } finally { setDescargando(false); }
  }

  const sinNumero = filas.filter(x => !x.numero_empleado).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className={titulo}>Pre-nómina</h1>
          <p className="text-sm text-neutral-500">Revisa la asistencia del periodo y descarga el Excel para NOMIPAQ.</p>
        </div>
        <button className={btn} onClick={descargar} disabled={descargando}>{descargando ? 'Generando…' : '⬇ Descargar Excel'}</button>
      </div>
      <div className="flex gap-4 items-end flex-wrap">
        <div><label className={label}>Desde</label><input type="date" className={input} value={f.desde} onChange={set('desde')} /></div>
        <div><label className={label}>Hasta</label><input type="date" className={input} value={f.hasta} onChange={set('hasta')} /></div>
        {sinNumero > 0 && <p className="text-sm pb-2"><span className={chip(true)}>{sinNumero} sin No. NOMIPAQ</span> no saldrán en la hoja NOMIPAQ (asígnalo en Rondines › Guardias).</p>}
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full">
          <thead><tr>
            <th className={th}>No.</th><th className={th}>Guardia</th><th className={th}>Servicio</th><th className={th}>Turnos</th>
            <th className={th}>Esperados 12x36</th><th className={th}>Faltas</th><th className={th}>Sin salida</th>
            <th className={th}>Horas</th><th className={th}>Prom. semanal</th>
          </tr></thead>
          <tbody>
            {filas.map(x => (
              <tr key={x.empleado_id}>
                <td className={td}>{x.numero_empleado || '—'}</td>
                <td className={td}>{x.nombre}</td>
                <td className={td}>{x.servicio || '—'}</td>
                <td className={td}>{x.turnos}</td>
                <td className={td}>{x.turnos_esperados}</td>
                <td className={td}>{x.faltas ? <span className={chip(true)}>{x.faltas}</span> : 0}</td>
                <td className={td}>{x.sin_salida ? <span className={chip(true)}>{x.sin_salida}</span> : 0}</td>
                <td className={td}>{x.horas}</td>
                <td className={td}>{x.promedio_semanal} h</td>
              </tr>
            ))}
            {!filas.length && <tr><td className={td} colSpan="9">Sin datos.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">"Sin salida" son jornadas que el guardia no cerró: corrígelas en Asistencia antes de exportar para que sus horas cuenten.</p>
    </div>
  );
}
