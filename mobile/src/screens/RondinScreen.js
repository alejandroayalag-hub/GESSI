import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { escanear, ubicacionActual, errorDe } from '../api';
import { s, C } from '../ui';

export default function RondinScreen({ route, navigation }) {
  const { guardia, puntos } = route.params;
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [hechos, setHechos] = useState({}); // punto_id → { hora, dentro }
  const [aviso, setAviso] = useState(null);
  const ocupado = useRef(false);
  const ultimo = useRef({ qr: null, t: 0 });

  async function leido({ data }) {
    // evita leer el mismo QR varias veces seguidas
    if (ocupado.current || (data === ultimo.current.qr && Date.now() - ultimo.current.t < 15000)) return;
    ocupado.current = true;
    ultimo.current = { qr: data, t: Date.now() };
    try {
      const ubicacion = await ubicacionActual();
      const r = await escanear({ empleado_id: guardia.id, qr_codigo: data, lat: ubicacion?.latitude, lng: ubicacion?.longitude, precision_gps: ubicacion?.accuracy });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHechos(h => ({ ...h, [r.punto.id]: { hora: new Date(), dentro: r.dentro_de_rango } }));
      setAviso({ ok: true, texto: `✓ ${r.punto.nombre}${r.dentro_de_rango === false ? ` (a ${r.distancia_metros} m)` : ''}` });
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setAviso({ ok: false, texto: `✕ ${errorDe(e)}` });
    } finally {
      setTimeout(() => { ocupado.current = false; }, 1500);
    }
  }

  if (!permiso?.granted) {
    return (
      <View style={[s.pantalla, { justifyContent: 'center' }]}>
        <Text style={[s.sub, { marginBottom: 20 }]}>Se necesita la cámara para leer los QR.</Text>
        <TouchableOpacity style={s.boton} onPress={pedirPermiso}><Text style={s.botonTexto}>PERMITIR CÁMARA</Text></TouchableOpacity>
      </View>
    );
  }

  const total = puntos.length;
  const listos = Object.keys(hechos).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo }}>
      <CameraView style={{ height: '42%' }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={leido} />
      {aviso && (
        <Text style={{ backgroundColor: aviso.ok ? C.negro : C.blanco, color: aviso.ok ? C.blanco : C.negro, fontSize: 18, fontWeight: '800', padding: 14, textAlign: 'center', borderBottomWidth: 1, borderColor: C.linea }}>
          {aviso.texto}
        </Text>
      )}
      <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>{guardia.nombre} · {listos} de {total} puntos</Text>
        {puntos.map(p => (
          <View key={p.id} style={[s.tarjeta, { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, hechos[p.id] && { backgroundColor: C.negro }]}>
            <Text style={{ fontSize: 22, color: hechos[p.id] ? C.blanco : C.linea }}>{hechos[p.id] ? '✓' : '○'}</Text>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: hechos[p.id] ? C.blanco : C.negro }}>{p.nombre}</Text>
            {hechos[p.id] && <Text style={{ color: C.linea }}>{hechos[p.id].hora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</Text>}
          </View>
        ))}
        <TouchableOpacity style={[s.boton, { marginTop: 10 }]} onPress={() => navigation.popToTop()}>
          <Text style={s.botonTexto}>{listos === total ? 'RONDÍN COMPLETO' : 'TERMINAR RONDÍN'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
