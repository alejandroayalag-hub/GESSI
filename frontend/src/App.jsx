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
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

// Personal vive en la raíz para no tocar las rutas heredadas de RHATA
const PANELES = [
  { id: 'personal', label: 'Personal', to: '/', links: [
    { to: '/', label: 'Empleados', end: true },
    { to: '/pagos', label: 'Pagos' },
    { to: '/formatos', label: 'Formatos' },
    { to: '/cultura', label: 'Cultura' },
  ] },
  { id: 'rondines', label: 'Rondines', to: '/rondines', links: [] },
  { id: 'finanzas', label: 'Finanzas', to: '/finanzas', links: [] },
];

function panelActual(pathname) {
  return PANELES.find(p => p.to !== '/' && pathname.startsWith(p.to)) || PANELES[0];
}

const subLink = ({ isActive }) =>
  isActive ? 'text-black font-semibold text-sm border-b-2 border-black pb-2'
           : 'text-gray-500 hover:text-black text-sm pb-2 border-b-2 border-transparent';

function Proximamente({ titulo }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
      <h1 className="text-2xl font-semibold text-black mb-2">{titulo}</h1>
      <p className="text-gray-500 text-sm">Módulo en construcción.</p>
    </div>
  );
}

function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const nombre = localStorage.getItem('nombre');
  const panel = panelActual(pathname);

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
            {PANELES.map(p => (
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
      {panel.links.length > 0 && (
        <nav className="bg-white border-b border-gray-200 px-6 pt-3 flex gap-6">
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
          <Route path="/rondines/*" element={<Proximamente titulo="Rondines" />} />
          <Route path="/finanzas/*" element={<Proximamente titulo="Finanzas" />} />
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
