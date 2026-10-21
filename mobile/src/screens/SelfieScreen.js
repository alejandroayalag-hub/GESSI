import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checar, ubicacionActual, errorDe } from '../api';
import { s, C } from '../ui';

export default function SelfieScreen({ route, navigation }) {
  const { modo, guardia, pin } = route.params;
  const insets = useSafeAreaInsets();
  const camara = useRef(null);
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [foto, setFoto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, mensaje }

  if (!permiso) return <View style={{ flex: 1, backgroundColor: C.negro }} />;
  if (!permiso.granted) {
    return (
      <View style={[s.pantalla, { justifyContent: 'center' }]}>
        <Text style={s.titulo}>Permiso de cámara</Text>
        <Text style={[s.sub, { marginBottom: 20 }]}>La selfie es obligatoria para registrar tu jornada.</Text>
        <TouchableOpacity style={s.boton} onPress={pedirPermiso}><Text style={s.botonTexto}>PERMITIR CÁMARA</Text></TouchableOpacity>
      </View>
    );
  }

  async function tomar() {
    const f = await camara.current?.takePictureAsync({ quality: 0.35, skipProcessing: true });
    if (f) setFoto(f.uri);
  }

  async function enviar() {
    setEnviando(true);
    try {
      const ubicacion = await ubicacionActual();
      const r = await checar(modo, { empleado_id: guardia.id, pin, foto, ubicacion });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResultado({ ok: true, mensaje: r.mensaje });
      setTimeout(() => navigation.popToTop(), 2500);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setResultado({ ok: false, mensaje: errorDe(e) });
    } finally { setEnviando(false); }
  }

  if (resultado) {
    return (
      <View style={{ flex: 1, backgroundColor: resultado.ok ? C.negro : C.blanco, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 90, color: resultado.ok ? C.blanco : C.negro }}>{resultado.ok ? '✓' : '✕'}</Text>
        <Text style={{ fontSize: 26, fontWeight: '800', textAlign: 'center', color: resultado.ok ? C.blanco : C.negro }}>{resultado.mensaje}</Text>
        {resultado.ok
          ? <Text style={{ color: C.linea, marginTop: 10, fontSize: 16 }}>{modo === 'entrada' ? 'Jornada iniciada' : 'Jornada terminada'} · {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</Text>
          : <TouchableOpacity style={[s.boton, { marginTop: 30, alignSelf: 'stretch' }]} onPress={() => navigation.popToTop()}><Text style={s.botonTexto}>REGRESAR</Text></TouchableOpacity>}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.negro }}>
      {foto
        ? <Image source={{ uri: foto }} style={{ flex: 1, transform: [{ scaleX: -1 }] }} />
        : <CameraView ref={camara} style={{ flex: 1 }} facing="front" />}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ color: C.blanco, fontSize: 20, fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10 }}>
          {modo === 'entrada' ? 'Selfie de entrada' : 'Selfie de salida'} · {guardia.nombre}
        </Text>
      </View>
      <View style={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
        {!foto ? (
          <TouchableOpacity onPress={tomar} style={[s.boton, { backgroundColor: C.blanco }]}><Text style={[s.botonTexto, { color: C.negro }]}>TOMAR SELFIE</Text></TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity onPress={enviar} disabled={enviando} style={[s.boton, { backgroundColor: C.blanco }]}>
              {enviando ? <ActivityIndicator color={C.negro} /> : <Text style={[s.botonTexto, { color: C.negro }]}>CONFIRMAR</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFoto(null)} disabled={enviando} style={{ alignItems: 'center', padding: 8 }}>
              <Text style={{ color: C.blanco, fontSize: 16 }}>Repetir foto</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
