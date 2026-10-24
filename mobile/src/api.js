import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';

const CLAVE = 'gessi_dispositivo';
export const API_URL = Constants.expoConfig?.extra?.apiUrl;

const api = axios.create({ baseURL: API_URL, timeout: 20000 });
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(CLAVE);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const leerToken = () => SecureStore.getItemAsync(CLAVE);
export const borrarToken = () => SecureStore.deleteItemAsync(CLAVE);
export const errorDe = (e) => e.response?.data?.error || (e.response ? 'Error del servidor' : 'Sin conexión. Revisa el internet del celular.');
export const desvinculado = (e) => e.response?.status === 401;

export async function vincular(codigo) {
  const { data } = await api.post('/caseta/vincular', { codigo });
  await SecureStore.setItemAsync(CLAVE, data.token);
  return data;
}

export const estado = () => api.get('/caseta/estado').then(r => r.data);

// tipo: 'entrada' | 'salida'
export async function checar(tipo, { empleado_id, pin, foto, fotoCuerpo, qr, ubicacion }) {
  const form = new FormData();
  form.append('empleado_id', String(empleado_id));
  form.append('pin', pin);
  form.append('qr_caseta', qr);
  if (fotoCuerpo) form.append('foto_cuerpo', { uri: fotoCuerpo, name: 'cuerpo.jpg', type: 'image/jpeg' });
  if (ubicacion) { form.append('lat', String(ubicacion.latitude)); form.append('lng', String(ubicacion.longitude)); }
  form.append('foto', { uri: foto, name: 'selfie.jpg', type: 'image/jpeg' });
  const { data } = await api.post(`/caseta/${tipo}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
}

export const escanear = (datos) => api.post('/caseta/escaneo', datos).then(r => r.data);
export const sos = (datos) => api.post('/caseta/sos', datos).then(r => r.data);
export const enterado = (id, empleado_id) => api.post(`/caseta/avisos/${id}/enterado`, { empleado_id }).then(r => r.data);

// GPS sin bloquear la checada: si tarda o falla, se manda sin ubicación
export async function ubicacionActual() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise(r => setTimeout(() => r(null), 10000)),
    ]);
    return (pos || await Location.getLastKnownPositionAsync())?.coords || null;
  } catch {
    return null;
  }
}
