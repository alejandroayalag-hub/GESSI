import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
import { rondines } from './api/operacion';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

// Personal vive en la raíz para no tocar las rutas heredadas de RHATA
const PANELES = [
  { id: 'personal', label: 'Personal', to: '/', links: [
    { to: '/', label: 'Empleados', end: true },
    { to: '/asistencia', label: 'Asistencia' },
    { to: '/prenomina', label: 'Pre-nómina' },
    { to: '/pagos', label: 'Pagos' },
    { to: '/formatos', label: 'Formatos' },
    { to: '/cultura', label: 'Cultura' },
  ] },
  { id: 'rondines', label: 'Rondines', to: '/rondines', links: [
    { to: '/rondines', label: 'Dashboard', end: true },
    { to: '/rondines/mapa', label: 'Mapa en vivo' },
    { to: '/rondines/alertas', label: 'Alertas' },
    { to: '/rondines/bitacora', label: 'Bitácora' },
    { to: '/rondines/puntos', label: 'Puntos QR' },
    { to: '/rondines/clientes', label: 'Clientes' },
    { to: '/rondines/guardias', label: 'Guardias' },
  ] },
  { id: 'finanzas', label: 'Finanzas', to: '/finanzas', soloAdmin: true, links: [
    { to: '/finanzas', label: 'Dashboard', end: true },
    { to: '/finanzas/resultados', label: 'Estado de resultados' },
    { to: '/finanzas/movimientos', label: 'Movimientos' },
    { to: '/finanzas/cobrar', label: 'Cuentas por cobrar' },
    { to: '/finanzas/pagar', label: 'Cuentas por pagar' },
    { to: '/finanzas/ganancia', label: 'Ganancia por servicio' },
    { to: '/finanzas/categorias', label: 'Categorías' },
  ] },
];

function rolActual() {
  try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1])).role; } catch { return null; }
}

function panelActual(pathname) {
  return PANELES.find(p => p.to !== '/' && pathname.startsWith(p.to)) || PANELES[0];
}

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
          <img src={logoGessi} alt="G.E.S.S.I. Seguridad Privada" className="h-12 object-contain" />
          <nav className="flex gap-1 flex-1">
            {PANELES.filter(p => !p.soloAdmin || rolActual() === 'admin').map(p => (
              <button key={p.id} onClick={() => navigate(p.to)}
                className={`px-4 py-2 rounded-md text-sm font-semibold uppercase tracking-widest ${
                  panel.id === p.id ? 'bg-white text-black' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>
                {p.label}
              </button>
            ))}
          </nav>
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
      {panel.links.length > 0 && (
        <nav className="bg-white border-b border-gray-200 px-6 pt-3 flex gap-6 overflow-x-auto whitespace-nowrap">
          {panel.links.map(l => <NavLink key={l.to} to={l.to} end={l.end} className={subLink}>{l.label}</NavLink>)}
        </nav>
      )}
      <main className="max-w-6xl mx-auto p-6">
        <Routes>
          <Route path="/" element={<EmpleadosPage />} />
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
        </Routes>
      </main>
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
