import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rondines, fechaHora } from '../api/operacion';

const URGENTES = ['sos', 'incidente'];
const CATEGORIAS = { robo: 'Robo / asalto', dano: 'Daño a instalaciones', sospechoso: 'Persona o vehículo sospechoso', accidente: 'Accidente / lesionado', otro: 'Otro' };

// Pitido de sirena con Web Audio (sin archivo de sonido)
function pitar() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    for (let i = 0; i < 6; i++) osc.frequency.setValueAtTime(i % 2 ? 660 : 990, ctx.currentTime + i * 0.25);
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
    osc.onended = () => ctx.close();
  } catch { /* navegador sin audio */ }
}

// Alerta SOS / incidente a pantalla completa desde cualquier panel. "Enterado" la oculta
// en esta sesión; sigue pendiente en Alertas hasta que alguien la resuelva.
export default function AlertaSOS() {
  const navigate = useNavigate();
  const [pendientes, setPendientes] = useState([]);
  const vistas = useRef(new Set());

  useEffect(() => {
    const revisar = () => rondines.alertas({ resuelta: false })
      .then(l => setPendientes(l.filter(a => URGENTES.includes(a.tipo) && !vistas.current.has(a.id))))
      .catch(() => {});
    revisar();
    const t = setInterval(revisar, 10000);
    return () => clearInterval(t);
  }, []);

  // Sirena cada 5 s y título de pestaña parpadeando mientras haya alertas sin ver
  useEffect(() => {
    if (!pendientes.length) return;
    const titulo = document.title;
    let n = 0;
    pitar();
    const sirena = setInterval(pitar, 5000);
    const tab = setInterval(() => { document.title = n++ % 2 ? titulo : '⚠ ALERTA ⚠'; }, 800);
    return () => { clearInterval(sirena); clearInterval(tab); document.title = titulo; };
  }, [pendientes.length]);

  if (!pendientes.length) return null;
  const a = pendientes[0];
  const sos = a.tipo === 'sos';

  function enterado() {
    vistas.current.add(a.id);
    setPendientes(p => p.slice(1));
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sos-flash">
      <div className="bg-white text-black border-8 border-black rounded-xl max-w-lg w-full p-8 text-center shadow-2xl">
        <p className="text-6xl font-black tracking-widest">{sos ? '⚠ SOS' : '⚠ INCIDENTE'}</p>
        <p className="mt-2 text-sm uppercase tracking-widest text-neutral-500">
          {sos ? 'Alerta de pánico' : CATEGORIAS[a.categoria] || 'Incidente reportado'}{pendientes.length > 1 ? ` · ${pendientes.length} sin atender` : ''}
        </p>
        <p className="mt-6 text-2xl font-bold">{a.servicio_nombre || 'Servicio sin nombre'}</p>
        {a.guardia_nombre && <p className="text-lg">{a.guardia_nombre}</p>}
        {a.mensaje && <p className="mt-3 text-neutral-700 whitespace-pre-line">{a.mensaje}</p>}
        {a.fotos?.length > 0 && (
          <div className="mt-4 flex gap-2 justify-center">
            {a.fotos.map(f => <a key={f} href={f} target="_blank" rel="noreferrer"><img src={f} alt="Foto del incidente" className="w-20 h-20 object-cover rounded" /></a>)}
          </div>
        )}
        <p className="mt-2 text-sm text-neutral-500">{fechaHora(a.created_at)}</p>
        {a.latitud && (
          <a className="mt-4 inline-block underline font-semibold" target="_blank" rel="noreferrer"
            href={`https://www.google.com/maps?q=${a.latitud},${a.longitud}`}>Ver ubicación en mapa</a>
        )}
        <div className="mt-8 flex gap-3 justify-center">
          <button onClick={() => { enterado(); navigate('/rondines/alertas'); }}
            className="bg-black text-white font-bold uppercase tracking-widest px-6 py-3 rounded-md">
            Atender
          </button>
          <button onClick={enterado}
            className="border-2 border-black font-bold uppercase tracking-widest px-6 py-3 rounded-md">
            Enterado
          </button>
        </div>
      </div>
    </div>
  );
}
