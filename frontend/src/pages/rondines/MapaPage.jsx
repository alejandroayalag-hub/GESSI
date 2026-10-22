import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { rondines, hora } from '../../api/operacion';
import { card, titulo, chip } from '../../components/ui';

const URUAPAN = [19.4195, -102.063];

const iniciales = (n) => n.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

// Semáforo: verde OK, amarillo incidente (rondín atrasado, fuera de zona, alerta sin resolver), rojo SOS
const COLOR = { ok: '#16a34a', incidente: '#eab308', alerta: '#dc2626' };

const estadoServicio = (s) => s?.sos ? 'alerta' : s?.incidentes ? 'incidente' : 'ok';

// Guardia: círculo de color con iniciales
const iconoGuardia = (g, estado) => L.divIcon({
  className: '',
  html: `<div style="width:34px;height:34px;border-radius:50%;background:${COLOR[estado]};color:#fff;display:flex;align-items:center;justify-content:center;font:600 12px system-ui;border:3px solid #fff;box-shadow:0 0 0 2px #000${estado === 'alerta' ? ';animation:pulse 1s infinite' : ''}">${iniciales(g.nombre)}</div>`,
  iconSize: [34, 34], iconAnchor: [17, 17],
});
const iconoCaseta = (estado) => L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;background:${COLOR[estado]};border:3px solid #000;border-radius:4px"></div>`,
  iconSize: [22, 22], iconAnchor: [11, 11],
});
const iconoPunto = L.divIcon({
  className: '',
  html: '<div style="width:12px;height:12px;background:#000;transform:rotate(45deg)"></div>',
  iconSize: [12, 12], iconAnchor: [6, 6],
});

const conGps = (x) => x.latitud && x.longitud;
const pos = (x) => [Number(x.latitud), Number(x.longitud)];

function Encuadre({ puntos }) {
  const map = useMap();
  const clave = puntos.map(p => p.join()).join('|');
  useEffect(() => {
    if (puntos.length === 1) map.setView(puntos[0], 16);
    else if (puntos.length > 1) map.fitBounds(puntos, { padding: [40, 40] });
  }, [clave]); // solo reencuadra si cambia la lista de casetas
  return null;
}

export default function MapaPage() {
  const [datos, setDatos] = useState({ servicios: [], guardias: [], puntos: [] });
  const [actualizado, setActualizado] = useState(null);

  useEffect(() => {
    const cargar = () => rondines.enVivo().then(d => { setDatos(d); setActualizado(new Date()); });
    cargar();
    const t = setInterval(cargar, 20000);
    return () => clearInterval(t);
  }, []);

  const serviciosPorId = useMemo(() => Object.fromEntries(datos.servicios.map(s => [s.id, s])), [datos]);
  const atrasado = (g) => {
    const s = serviciosPorId[g.servicio_id];
    if (!s?.tiene_rondines) return false;
    const ref = new Date(g.ultimo_escaneo || g.entrada_at);
    return (Date.now() - ref) / 60000 > s.intervalo_rondin_min;
  };
  const estadoGuardia = (g) => {
    const e = estadoServicio(serviciosPorId[g.servicio_id]);
    if (e === 'ok' && (atrasado(g) || g.entrada_en_zona === false)) return 'incidente';
    return e;
  };
  const Punto = ({ estado }) => <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ background: COLOR[estado] }} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={titulo}>Mapa en vivo</h1>
          <p className="text-sm text-neutral-500">{datos.guardias.length} guardias en turno · se actualiza cada 20 s {actualizado && `· ${hora(actualizado)}`}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <div className={`${card} p-4 space-y-4 max-h-[70vh] overflow-y-auto`}>
          {datos.servicios.map(s => {
            const gs = datos.guardias.filter(g => g.servicio_id === s.id);
            return (
              <div key={s.id}>
                <p className="text-sm font-semibold"><Punto estado={estadoServicio(s)} />{s.nombre}</p>
                {s.sos > 0 && <p className="text-xs font-semibold" style={{ color: COLOR.alerta }}>SOS sin atender</p>}
                {s.incidentes > 0 && <p className="text-xs" style={{ color: '#a16207' }}>{s.incidentes} incidente{s.incidentes > 1 ? 's' : ''} sin resolver</p>}
                {gs.length === 0 && <p className="text-xs text-neutral-400">Sin guardia en turno</p>}
                {gs.map(g => (
                  <div key={g.jornada_id} className="text-xs text-neutral-700 mt-1">
                    <Punto estado={estadoGuardia(g)} />{g.nombre} · desde {hora(g.entrada_at)}
                    {s.tiene_rondines && <div className="text-neutral-500">
                      {g.ultimo_punto ? `Último: ${g.ultimo_punto} ${hora(g.ultimo_escaneo)}` : 'Sin rondín aún'}
                      {atrasado(g) && <span className={`${chip(true)} ml-1`}>ATRASADO</span>}
                    </div>}
                  </div>
                ))}
              </div>
            );
          })}
          <div className="border-t border-neutral-200 pt-3 text-xs text-neutral-500 space-y-1">
            <p>■ Caseta · ◆ Punto QR · ● Guardia</p>
            <p><Punto estado="ok" />OK · <Punto estado="incidente" />Incidente · <Punto estado="alerta" />Alerta SOS</p>
          </div>
        </div>
        <div className={`${card} overflow-hidden h-[70vh] mapa-gessi`}>
          <MapContainer center={URUAPAN} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            <Encuadre puntos={datos.servicios.filter(conGps).map(pos)} />
            {datos.servicios.filter(conGps).map(s => (
              <Circle key={`c${s.id}`} center={pos(s)} radius={s.radio_metros}
                pathOptions={{ color: COLOR[estadoServicio(s)], weight: 2, fillOpacity: 0.05, dashArray: '4' }} />
            ))}
            {datos.servicios.filter(conGps).map(s => (
              <Marker key={`s${s.id}`} position={pos(s)} icon={iconoCaseta(estadoServicio(s))}><Popup><b>{s.nombre}</b><br />Caseta</Popup></Marker>
            ))}
            {datos.puntos.filter(conGps).map(p => (
              <Marker key={`p${p.id}`} position={pos(p)} icon={iconoPunto}><Popup><b>{p.nombre}</b><br />Punto de rondín</Popup></Marker>
            ))}
            {datos.guardias.filter(conGps).map(g => (
              <Marker key={`g${g.jornada_id}`} position={pos(g)} icon={iconoGuardia(g, estadoGuardia(g))}>
                <Popup>
                  <b>{g.nombre}</b><br />{serviciosPorId[g.servicio_id]?.nombre}<br />
                  En turno desde {hora(g.entrada_at)} · {g.escaneos} escaneos
                  {g.entrada_foto && <img src={g.entrada_foto} alt="Selfie de entrada" style={{ width: 120, marginTop: 6, borderRadius: 6 }} />}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
