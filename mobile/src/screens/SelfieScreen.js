import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, C } from '../ui';

// Paso de foto de la checada. paso 'rostro' = selfie; paso 'cuerpo' = foto de cuerpo completo al entrar
// (revisión de uniforme): la toma el guardia que sale con la cámara trasera, o él mismo si no hay relevo.
export default function SelfieScreen({ route, navigation }) {
  const { modo, guardia, paso = 'rostro' } = route.params;
  const cuerpo = paso === 'cuerpo';
  const [frontal, setFrontal] = useState(!cuerpo);
  const insets = useSafeAreaInsets();
  const camara = useRef(null);
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [foto, setFoto] = useState(null);

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

  function siguiente() {
    if (!cuerpo && modo === 'entrada') return navigation.replace('Selfie', { ...route.params, paso: 'cuerpo', foto });
    navigation.replace('Checar', cuerpo ? { ...route.params, fotoCuerpo: foto } : { ...route.params, foto });
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.negro }}>
      {foto
        ? <Image source={{ uri: foto }} style={{ flex: 1, transform: frontal ? [{ scaleX: -1 }] : [] }} />
        : <CameraView ref={camara} style={{ flex: 1 }} facing={frontal ? 'front' : 'back'} />}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ color: C.blanco, fontSize: 20, fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 10 }}>
          {cuerpo ? 'Foto de cuerpo completo' : modo === 'entrada' ? 'Selfie de entrada' : 'Selfie de salida'} · {guardia.nombre}
        </Text>
        {cuerpo && <Text style={{ color: C.blanco, marginTop: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
          De pies a cabeza, que se vea el uniforme</Text>}
      </View>
      <View style={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
        {!foto ? (
          <>
            <TouchableOpacity onPress={tomar} style={[s.boton, { backgroundColor: C.blanco }]}>
              <Text style={[s.botonTexto, { color: C.negro }]}>{cuerpo ? 'TOMAR FOTO' : 'TOMAR SELFIE'}</Text>
            </TouchableOpacity>
            {cuerpo && (
              <TouchableOpacity onPress={() => setFrontal(f => !f)} style={{ alignItems: 'center', padding: 8 }}>
                <Text style={{ color: C.blanco, fontSize: 16 }}>{frontal ? 'Usar cámara trasera (la toma un compañero)' : 'No hay compañero: tomarla yo mismo'}</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity onPress={siguiente} style={[s.boton, { backgroundColor: C.blanco }]}>
              <Text style={[s.botonTexto, { color: C.negro }]}>CONTINUAR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFoto(null)} style={{ alignItems: 'center', padding: 8 }}>
              <Text style={{ color: C.blanco, fontSize: 16 }}>Repetir foto</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
