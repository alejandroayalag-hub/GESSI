import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notaBitacora, reportarIncidente, ubicacionActual, errorDe } from '../api';
import { s, C } from '../ui';
import { nombre } from './CasetaScreen';

const CATEGORIAS = [['robo', 'Robo / asalto'], ['dano', 'Daño'], ['sospechoso', 'Sospechoso'], ['accidente', 'Accidente'], ['otro', 'Otro']];
const MAX_FOTOS = 3;

const Chip = ({ activo, texto, onPress }) => (
  <TouchableOpacity onPress={onPress}
    style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2, borderColor: C.negro, backgroundColor: activo ? C.negro : C.blanco }}>
    <Text style={{ fontSize: 16, fontWeight: '700', color: activo ? C.blanco : C.negro }}>{texto}</Text>
  </TouchableOpacity>
);

// tipo 'bitacora' = nota del turno; tipo 'incidente' = va a Alertas de la oficina, con fotos si se puede
export default function NovedadScreen({ route, navigation }) {
  const { tipo, enTurno } = route.params;
  const incidente = tipo === 'incidente';
  const insets = useSafeAreaInsets();
  const [guardia, setGuardia] = useState(enTurno.length === 1 ? enTurno[0].id : null);
  const [categoria, setCategoria] = useState(null);
  const [texto, setTexto] = useState('');
  const [fotos, setFotos] = useState([]);
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [enviando, setEnviando] = useState(false);
  const camara = useRef(null);

  async function abrirCamara() {
    if (!permiso?.granted && !(await pedirPermiso()).granted) return;
    setCamaraAbierta(true);
  }

  async function tomarFoto() {
    const f = await camara.current?.takePictureAsync({ quality: 0.4, skipProcessing: true });
    if (f) setFotos(v => [...v, f.uri]);
    setCamaraAbierta(false);
  }

  async function enviar() {
    if (enTurno.length > 1 && !guardia) return Alert.alert('Falta', '¿Quién reporta?');
    if (incidente && !categoria) return Alert.alert('Falta', 'Elige el tipo de incidente');
    if (!texto.trim()) return Alert.alert('Falta', incidente ? 'Describe qué pasó' : 'Escribe la nota');
    setEnviando(true);
    try {
      if (incidente) {
        const ubicacion = await ubicacionActual();
        await reportarIncidente({ empleado_id: guardia, categoria, descripcion: texto.trim(), fotos, ubicacion });
      } else {
        await notaBitacora({ empleado_id: guardia, texto: texto.trim() });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(incidente ? 'Incidente reportado' : 'Nota guardada', incidente ? 'La oficina ya lo recibió.' : 'Quedó en la bitácora.');
      navigation.goBack();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('No se pudo enviar', errorDe(e));
    } finally { setEnviando(false); }
  }

  return (
    <ScrollView style={s.pantalla} contentContainerStyle={{ gap: 16, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
      {enTurno.length > 1 && <>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.gris, letterSpacing: 1 }}>¿QUIÉN REPORTA?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {enTurno.map(g => <Chip key={g.id} activo={guardia === g.id} texto={nombre(g)} onPress={() => setGuardia(g.id)} />)}
        </View>
      </>}

      {incidente && <>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.gris, letterSpacing: 1 }}>TIPO DE INCIDENTE</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIAS.map(([k, t]) => <Chip key={k} activo={categoria === k} texto={t} onPress={() => setCategoria(k)} />)}
        </View>
      </>}

      <Text style={{ fontSize: 13, fontWeight: '700', color: C.gris, letterSpacing: 1 }}>{incidente ? '¿QUÉ PASÓ?' : 'NOTA DEL TURNO'}</Text>
      <TextInput value={texto} onChangeText={setTexto} multiline maxLength={2000}
        placeholder={incidente ? 'Qué pasó, dónde, a qué hora, quiénes' : 'Ej. 10:30 entró proveedor de agua, placas ABC-123'}
        style={[s.tarjeta, { minHeight: 140, fontSize: 17, textAlignVertical: 'top' }]} />

      {incidente && <>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.gris, letterSpacing: 1 }}>FOTOS (SI SE PUEDE) · {fotos.length}/{MAX_FOTOS}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {fotos.map((uri, i) => (
            <TouchableOpacity key={uri} onLongPress={() => setFotos(v => v.filter((_, j) => j !== i))}>
              <Image source={{ uri }} style={{ width: 90, height: 90, borderRadius: 10 }} />
            </TouchableOpacity>
          ))}
          {fotos.length < MAX_FOTOS && (
            <TouchableOpacity onPress={abrirCamara}
              style={{ width: 90, height: 90, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: C.gris, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 34, color: C.gris }}>+</Text>
            </TouchableOpacity>
          )}
        </View>
        {fotos.length > 0 && <Text style={{ color: C.gris }}>Mantén presionada una foto para quitarla.</Text>}
      </>}

      <TouchableOpacity style={s.boton} onPress={enviar} disabled={enviando}>
        {enviando ? <ActivityIndicator color={C.blanco} /> : <Text style={s.botonTexto}>{incidente ? 'REPORTAR INCIDENTE' : 'GUARDAR NOTA'}</Text>}
      </TouchableOpacity>

      <Modal visible={camaraAbierta} animationType="slide" onRequestClose={() => setCamaraAbierta(false)}>
        <View style={{ flex: 1, backgroundColor: C.negro }}>
          <CameraView ref={camara} style={{ flex: 1 }} facing="back" />
          <View style={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 10 }}>
            <TouchableOpacity onPress={tomarFoto} style={[s.boton, { backgroundColor: C.blanco }]}><Text style={[s.botonTexto, { color: C.negro }]}>TOMAR FOTO</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setCamaraAbierta(false)} style={{ alignItems: 'center', padding: 8 }}><Text style={{ color: C.blanco, fontSize: 16 }}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
