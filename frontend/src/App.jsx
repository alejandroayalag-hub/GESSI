import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import logoGessi from './assets/logo-gessi.png';
import EmpleadosPage from './pages/EmpleadosPage';
import EmpleadoDetallePage from './pages/EmpleadoDetallePage';
import EmpleadoFormPage from './pages/EmpleadoFormPage';
import PagosPage from './pages/PagosPage';
import FormatosPage from './pages/FormatosPage';
import SalidaDetailPage from './pages/SalidaDetailPage';
import CulturePage from './pages/CulturePage';
import CultureElementDetailPage from './pages/CultureElementDetailPage';
import AsistenciaPage from './pages/personal/AsistenciaPage';
import PrenominaPage from './pages/personal/PrenominaPage';
import DashboardRondines from './pages/rondines/DashboardRondines';
import MapaPage from './pages/rondines/MapaPage';
import AlertasPage from './pages/rondines/AlertasPage';
import PizarronPage from './pages/rondines/PizarronPage';
import BitacoraPage from './pages/rondines/BitacoraPage';
import PuntosPage from './pages/rondines/PuntosPage';
import ServiciosPage from './pages/rondines/ServiciosPage';
import GuardiasPage from './pages/rondines/GuardiasPage';
import DashboardFinanzas from './pages/finanzas/DashboardFinanzas';
import EstadoResultados from './pages/finanzas/EstadoResultados';
import MovimientosPage from './pages/finanzas/MovimientosPage';
import CuentasPage from './pages/finanzas/CuentasPage';
import GananciaPage from './pages/finanzas/GananciaPage';
import CategoriasPage from './pages/finanzas/CategoriasPage';
import { rondines, rolActual } from './api/operacion';
import UsuariosPage from './pages/UsuariosPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

// Personal conserva las rutas heredadas de RHATA (/empleados, /pagos…); la raíz es el escritorio
const PANELES = [
  { id: 'personal', label: 'Personal', to: '/personal', roles: ['admin', 'rh'], desc: 'Expedientes, asistencia, pre-nómina y formatos', links: [
    { to: '/personal', label: 'Empleados', end: true },
    { to: '/asistencia', label: 'Asistencia' },
    { to: '/prenomina', label: 'Pre-nómina' },
    { to: '/pagos', label: 'Pagos' },
    { to: '/formatos', label: 'Formatos' },
    { to: '/cultura', label: 'Cultura' },
  ] },
  { id: 'rondines', label: 'Rondines', to: '/rondines', roles: ['admin', 'rh', 'supervisor'], desc: 'Mapa en vivo, alertas, puntos QR y clientes', lateral: true, links: [
    { to: '/rondines', label: 'Dashboard', end: true },
    { to: '/rondines/mapa', label: 'Mapa en vivo' },
    { to: '/rondines/alertas', label: 'Alertas' },
    { to: '/rondines/pizarron', label: 'Pizarrón / SDR' },
    { to: '/rondines/bitacora', label: 'Bitácora' },
    { to: '/rondines/puntos', label: 'Puntos QR' },
    { to: '/rondines/clientes', label: 'Clientes' },
    { to: '/rondines/guardias', label: 'Guardias' },
  ] },
  { id: 'finanzas', label: 'Finanzas', to: '/finanzas', desc: 'Ingresos, egresos, cobranza y ganancia por servicio', roles: ['admin'], links: [
    { to: '/finanzas', label: 'Dashboard', end: true },
    { to: '/finanzas/resultados', label: 'Estado de resultados' },
    { to: '/finanzas/movimientos', label: 'Movimientos' },
    { to: '/finanzas/cobrar', label: 'Cuentas por cobrar' },
    { to: '/finanzas/pagar', label: 'Cuentas por pagar' },
    { to: '/finanzas/ganancia', label: 'Ganancia por servicio' },
    { to: '/finanzas/categorias', label: 'Categorías' },
  ] },
];

function panelActual(pathname) {
  if (pathname === '/' || pathname.startsWith('/usuarios')) return null;
  return PANELES.find(p => p.id !== 'personal' && pathname.startsWith(p.to)) || PANELES[0];
}

// Íconos estilo lucide (users, shield-check, dollar-sign) en SVG para no agregar dependencia
const ICONOS = {
  personal: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  rondines: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  finanzas: <><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
};

const permitido = (p) => p.roles.includes(rolActual());
const panelesVisibles = () => PANELES.filter(permitido);

function Escritorio() {
  const navigate = useNavigate();
  const visibles = panelesVisibles();
  if (visibles.length === 1) return <Navigate to={visibles[0].to} replace />;
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-8">
      <img src={logoGessi} alt="G.E.S.S.I. Seguridad Privada" className="h-24 object-contain mb-4 bg-black rounded-2xl p-3" />
      <p className="text-sm text-gray-500 mb-10">Selecciona un módulo para continuar</p>
      <div className="grid gap-5 w-full max-w-4xl grid-cols-1 sm:grid-cols-3">
        {visibles.map(p => (
          <button key={p.id} onClick={() => navigate(p.to)}
            className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-black active:scale-95">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 bg-black text-white flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONOS[p.id]}</svg>
            </div>
            <h2 className="text-lg font-bold uppercase tracking-widest mb-2">{p.label}</h2>
            <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

const ladoLink = ({ isActive }) =>
  `block px-4 py-2 rounded-md text-sm ${isActive ? 'bg-black text-white font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`;

const subLink = ({ isActive }) =>
  isActive ? 'text-black font-semibold text-sm border-b-2 border-black pb-2'
           : 'text-gray-500 hover:text-black text-sm pb-2 border-b-2 border-transparent';


function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const nombre = localStorage.getItem('nombre');
  const panel = panelActual(pathname);
  const [sos, setSos] = useState(0);

  // Aviso de SOS visible desde cualquier panel
  useEffect(() => {
    const revisar = () => rondines.resumen().then(r => setSos(r.sos_pendientes)).catch(() => {});
    revisar();
    const t = setInterval(revisar, 30000);
    return () => clearInterval(t);
  }, []);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-black text-white">
        <div className="px-6 flex items-center gap-6 h-16">
          <button onClick={() => navigate('/')} title="Escritorio">
            <img src={logoGessi} alt="G.E.S.S.I. Seguridad Privada" className="h-12 object-contain" />
          </button>
          <nav className="flex gap-1 flex-1">
            {panelesVisibles().map(p => (
              <button key={p.id} onClick={() => navigate(p.to)}
                className={`px-4 py-2 rounded-md text-sm font-semibold uppercase tracking-widest ${
                  panel?.id === p.id ? 'bg-white text-black' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>
                {p.label}
              </button>
            ))}
          </nav>
          {rolActual() === 'admin' && (
            <button onClick={() => navigate('/usuarios')} className="text-sm text-gray-300 hover:text-white">Usuarios</button>
          )}
          <span className="text-sm text-gray-300">{nombre}</span>
          <button onClick={logout} className="text-xs text-white border border-white/40 rounded px-2 py-1 hover:bg-white hover:text-black">
            Cerrar sesión
          </button>
        </div>
      </header>
      {sos > 0 && (
        <button onClick={() => navigate('/rondines/alertas')}
          className="w-full bg-white text-black border-b-4 border-black py-2 text-sm font-bold uppercase tracking-widest animate-pulse">
          ⚠ {sos} alerta{sos > 1 ? 's' : ''} SOS sin atender — ver alertas
        </button>
      )}
      {panel && !panel.lateral && (
        <nav className="bg-white border-b border-gray-200 px-6 pt-3 flex gap-6 overflow-x-auto whitespace-nowrap">
          {panel.links.map(l => <NavLink key={l.to} to={l.to} end={l.end} className={subLink}>{l.label}</NavLink>)}
        </nav>
      )}
      <div className="flex flex-col md:flex-row">
      {panel?.lateral && (
        <aside className="md:w-56 md:min-h-[calc(100vh-4rem)] bg-white border-b md:border-b-0 md:border-r border-gray-200 p-3 flex md:flex-col gap-1 overflow-x-auto whitespace-nowrap">
          <p className="hidden md:block px-4 pt-2 pb-3 text-xs font-bold uppercase tracking-widest text-gray-400">{panel.label}</p>
          {panel.links.map(l => <NavLink key={l.to} to={l.to} end={l.end} className={ladoLink}>{l.label}</NavLink>)}
        </aside>
      )}
      <main className="flex-1 min-w-0 max-w-6xl mx-auto p-6">
        {/* Rol sin acceso a este panel (o a Usuarios) → escritorio; el backend también lo bloquea */}
        {((panel && !permitido(panel)) || (pathname.startsWith('/usuarios') && rolActual() !== 'admin')) ? <Navigate to="/" replace /> : (
        <Routes>
          <Route path="/" element={<Escritorio />} />
          <Route path="/personal" element={<EmpleadosPage />} />
          <Route path="/empleados/nuevo" element={<EmpleadoFormPage />} />
          <Route path="/empleados/:id" element={<EmpleadoDetallePage />} />
          <Route path="/empleados/:id/editar" element={<EmpleadoFormPage />} />
          <Route path="/pagos" element={<PagosPage />} />
          <Route path="/formatos" element={<FormatosPage />} />
          <Route path="/salidas/:id" element={<SalidaDetailPage />} />
          <Route path="/cultura" element={<CulturePage />} />
          <Route path="/cultura/:culturaId" element={<CultureElementDetailPage />} />
          <Route path="/asistencia" element={<AsistenciaPage />} />
          <Route path="/prenomina" element={<PrenominaPage />} />
          <Route path="/rondines" element={<DashboardRondines />} />
          <Route path="/rondines/mapa" element={<MapaPage />} />
          <Route path="/rondines/alertas" element={<AlertasPage />} />
          <Route path="/rondines/pizarron" element={<PizarronPage />} />
          <Route path="/rondines/bitacora" element={<BitacoraPage />} />
          <Route path="/rondines/puntos" element={<PuntosPage />} />
          <Route path="/rondines/clientes" element={<ServiciosPage />} />
          <Route path="/rondines/guardias" element={<GuardiasPage />} />
          <Route path="/finanzas" element={<DashboardFinanzas />} />
          <Route path="/finanzas/resultados" element={<EstadoResultados />} />
          <Route path="/finanzas/movimientos" element={<MovimientosPage />} />
          <Route path="/finanzas/cobrar" element={<CuentasPage key="cxc" tipo="cxc" />} />
          <Route path="/finanzas/pagar" element={<CuentasPage key="cxp" tipo="cxp" />} />
          <Route path="/finanzas/ganancia" element={<GananciaPage />} />
          <Route path="/finanzas/categorias" element={<CategoriasPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
        </Routes>
        )}
      </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
