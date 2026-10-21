import { StyleSheet } from 'react-native';

// Marca GESSI: blanco y negro
export const C = { negro: '#000000', blanco: '#FFFFFF', fondo: '#F5F5F5', gris: '#737373', linea: '#D4D4D4' };

export const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.fondo, padding: 20 },
  titulo: { fontSize: 26, fontWeight: '800', color: C.negro },
  sub: { fontSize: 15, color: C.gris, marginTop: 4 },
  boton: { backgroundColor: C.negro, borderRadius: 14, paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { color: C.blanco, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  botonSec: { backgroundColor: C.blanco, borderWidth: 2, borderColor: C.negro, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  botonSecTexto: { color: C.negro, fontSize: 18, fontWeight: '700' },
  tarjeta: { backgroundColor: C.blanco, borderRadius: 14, borderWidth: 1, borderColor: C.linea, padding: 16 },
  error: { color: C.negro, fontWeight: '700', fontSize: 15, textAlign: 'center', marginTop: 12 },
});
