import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checar, ubicacionActual, errorDe } from '../api';
import { s, C } from '../ui';

// Último paso de la checada: escanear el QR pegado en la caseta y enviar (fotos + PIN + GPS)
export default function ChecarScreen({ route, navigation }) {
  const { modo, guardia, pin, foto, fotoCuerpo } = route.params;
  const insets = useSafeAreaInsets();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, mensaje }
  const ocupado = useRef(false);

  async function leido({ data }) {
    if (ocupado.current) return;
    ocupado.current = true;
    setEnviando(true);
    try {
      const ubicacion = await ubicacionActual();
      const r = await checar(modo, { empleado_id: guardia.id, pin, foto, fotoCuerpo, qr: data, ubicacion });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResultado({ ok: true, mensaje: r.mensaje });
      setTimeout(() => navigation.popToTop(), 2500);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setResultado({ ok: false, mensaje: errorDe(e) });
    } finally { setEnviando(false); }
  }

  if (resultado) {
    // QR equivocado: se puede reintentar sin repetir fotos ni PIN
    const reintentar = !resultado.ok && /QR/.test(resultado.mensaje);
    return (
      <View style={{ flex: 1, backgroundColor: resultado.ok ? C.negro : C.blanco, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 90, color: resultado.ok ? C.blanco : C.negro }}>{resultado.ok ? '✓' : '✕'}</Text>
        <Text style={{ fontSize: 26, fontWeight: '800', textAlign: 'center', color: resultado.ok ? C.blanco : C.negro }}>{resultado.mensaje}</Text>
        {resultado.ok
          ? <Text style={{ color: C.linea, marginTop: 10, fontSize: 16 }}>{modo === 'entrada' ? 'Jornada iniciada' : 'Jornada terminada'} · {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</Text>
          : <>
              {reintentar && <TouchableOpacity style={[s.boton, { marginTop: 30, alignSelf: 'stretch' }]}
                onPress={() => { ocupado.current = false; setResultado(null); }}><Text style={s.botonTexto}>ESCANEAR DE NUEVO</Text></TouchableOpacity>}
              <TouchableOpacity style={[reintentar ? s.botonSec : s.boton, { marginTop: 14, alignSelf: 'stretch' }]} onPress={() => navigation.popToTop()}>
                <Text style={reintentar ? s.botonSecTexto : s.botonTexto}>REGRESAR</Text>
              </TouchableOpacity>
            </>}
      </View>
    );
  }

  if (!permiso?.granted) {
    return (
      <View style={[s.pantalla, { justifyContent: 'center' }]}>
        <Text style={[s.sub, { marginBottom: 20 }]}>Se necesita la cámara para leer el QR de la caseta.</Text>
        <TouchableOpacity style={s.boton} onPress={pedirPermiso}><Text style={s.botonTexto}>PERMITIR CÁMARA</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.negro }}>
      <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={enviando ? undefined : leido} />
      <View style={{ position: 'absolute', top: insets.top + 12, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ color: C.blanco, fontSize: 20, fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10 }}>
          Escanea el QR de la caseta
        </Text>
      </View>
      {enviando && (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={C.blanco} size="large" />
          <Text style={{ color: C.blanco, marginTop: 12, fontSize: 18 }}>Registrando…</Text>
        </View>
      )}
    </View>
  );
}
