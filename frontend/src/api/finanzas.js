import api from './client';

const d = (p) => p.then(r => r.data);
const F = '/finanzas';

export const finanzas = {
  dashboard: (mes) => d(api.get(`${F}/dashboard`, { params: { mes } })),
  estado: (mes) => d(api.get(`${F}/estado-resultados`, { params: { mes } })),
  ganancia: (mes) => d(api.get(`${F}/ganancia-servicios`, { params: { mes } })),
  categorias: () => d(api.get(`${F}/categorias`)),
  crearCategoria: (data) => d(api.post(`${F}/categorias`, data)),
  actualizarCategoria: (id, data) => d(api.put(`${F}/categorias/${id}`, data)),
  movimientos: (params) => d(api.get(`${F}/movimientos`, { params })),
  crearMovimiento: (data) => d(api.post(`${F}/movimientos`, data)),
  actualizarMovimiento: (id, data) => d(api.put(`${F}/movimientos/${id}`, data)),
  eliminarMovimiento: (id) => d(api.delete(`${F}/movimientos/${id}`)),
  // tipo: 'cxc' | 'cxp'
  cuentas: (tipo, params) => d(api.get(`${F}/${tipo}`, { params })),
  crearCuenta: (tipo, data) => d(api.post(`${F}/${tipo}`, data)),
  actualizarCuenta: (tipo, id, data) => d(api.put(`${F}/${tipo}/${id}`, data)),
  eliminarCuenta: (tipo, id) => d(api.delete(`${F}/${tipo}/${id}`)),
  abonar: (tipo, id, data) => d(api.post(`${F}/${tipo}/${id}/abono`, data)),
  generarMes: (periodo) => d(api.post(`${F}/cxc/generar-mes`, { periodo })),
};

export const mesActual = () => new Date().toISOString().slice(0, 7);
export const dinero = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const soloFecha = (v) => (v ? String(v).slice(0, 10) : '');
export const FORMAS_PAGO = ['transferencia', 'efectivo', 'cheque', 'tarjeta', 'otro'];
