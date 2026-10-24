import api from './client';

const d = (p) => p.then(r => r.data);

export const servicios = {
  listar: () => d(api.get('/servicios')),
  crear: (data) => d(api.post('/servicios', data)),
  actualizar: (id, data) => d(api.put(`/servicios/${id}`, data)),
  vincular: (id) => d(api.post(`/servicios/${id}/vincular`)),
  desvincular: (id) => d(api.post(`/servicios/${id}/desvincular`)),
};

export const guardias = {
  listar: () => d(api.get('/guardias')),
  actualizar: (id, data) => d(api.put(`/guardias/${id}`, data)),
  pin: (id, pin) => d(api.put(`/guardias/${id}/pin`, { pin })),
};

export const rondines = {
  puntos: (params) => d(api.get('/rondines/puntos', { params })),
  crearPunto: (data) => d(api.post('/rondines/puntos', data)),
  actualizarPunto: (id, data) => d(api.put(`/rondines/puntos/${id}`, data)),
  togglePunto: (id) => d(api.patch(`/rondines/puntos/${id}/toggle`)),
  eliminarPunto: (id) => d(api.delete(`/rondines/puntos/${id}`)),
  escaneos: (params) => d(api.get('/rondines/escaneos', { params })),
  bitacora: (params) => d(api.get('/rondines/bitacora', { params })),
  alertas: (params) => d(api.get('/rondines/alertas', { params })),
  resolverAlerta: (id) => d(api.put(`/rondines/alertas/${id}/resolver`)),
  resumen: () => d(api.get('/rondines/resumen')),
  enVivo: () => d(api.get('/rondines/en-vivo')),
  avisos: (params) => d(api.get('/rondines/avisos', { params })),
  publicarAviso: (data) => d(api.post('/rondines/avisos', data)),
  retirarAviso: (id) => d(api.put(`/rondines/avisos/${id}/retirar`)),
};

export const jornadas = {
  listar: (params) => d(api.get('/jornadas', { params })),
  actualizar: (id, data) => d(api.put(`/jornadas/${id}`, data)),
  prenomina: (params) => d(api.get('/jornadas/prenomina', { params })),
  async descargarPrenomina(params) {
    const r = await api.get('/jornadas/prenomina.xlsx', { params, responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = Object.assign(document.createElement('a'), { href: url, download: `prenomina_${params.desde}_${params.hasta}.xlsx` });
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ── utilidades de fecha (hora local del navegador) ──
const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
export const hoy = () => iso(new Date());
export function semanaActual() {
  const lunes = new Date();
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return { desde: iso(lunes), hasta: iso(domingo) };
}
export const fechaHora = (v) => v ? new Date(v).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—';
export const hora = (v) => v ? new Date(v).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
export const nombreGuardia = (g) => [g.nombre, g.apellido_paterno, g.apellido_materno].filter(Boolean).join(' ');
export const errorDe = (e) => e.response?.data?.error || 'Ocurrió un error';
