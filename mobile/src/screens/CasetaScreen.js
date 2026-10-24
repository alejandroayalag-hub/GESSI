import { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, RefreshControl, Alert, Vibration } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { estado, sos, enterado, borrarToken, desvinculado, errorDe, ubicacionActual } from '../api';
import { s, C } from '../ui';

const hora = (v) => new Date(v).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
const CATEGORIAS = { bloqueo: 'BLOQUEO', balacera: 'BALACERA', robo: 'ROBO / ASALTO', manifestacion: 'MANIFESTACIÓN', otro: 'RIESGO' };

// Tarjeta del pizarrón. Peligro = invertida (fondo negro); marca GESSI sin rojo.
function Aviso({ a, onEnterado }) {
  const peligro = a.nivel === 'peligro';
  const color = peligro ? C.blanco : C.negro;
  return (
    <View style={[s.tarjeta, a.tipo === 'sdr' && { borderWidth: 3, borderColor: C.negro }, peligro && { backgroundColor: C.negro }]}>
      <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 1, color: peligro ? C.blanco : C.gris }}>
        {a.tipo === 'sdr' ? `⚠ ${CATEGORIAS[a.categoria]} · ${peligro ? 'PELIGRO' : 'PRECAUCIÓN'}` : 'AVISO'} · {hora(a.created_at)}
      </Text>
      <Text style={{ marginTop: 6, fontSize: 19, fontWeight: '800', color }}>{a.titulo}</Text>
      {!!a.zona && <Text style={{ marginTop: 4, fontSize: 16, fontWeight: '700', color }}>📍 {a.zona}</Text>}
      {!!a.texto && <Text style={{ marginTop: 6, fontSize: 16, color }}>{a.texto}</Text>}
      {a.enterado
        ? <Text style={{ marginTop: 10, fontSize: 14, fontWeight: '700', color: peligro ? C.blanco : C.gris }}>✓ Enterado</Text>
        : <TouchableOpacity onPress={() => onEnterado(a)}
            style={{ marginTop: 12, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: peligro ? C.blanco : C.negro }}>
            <Text style={{ fontSize: 17, fontWeight: '800', letterSpacing: 1, color: peligro ? C.negro : C.blanco }}>ENTERADO</Text>
          </TouchableOpacity>}
    </View>
  );
}
export const nombre = (g) => `${g.nombre} ${g.apellido_paterno}`;

export default function CasetaScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const vistos = useRef(null); // ids de SDR ya avisados con vibración (null = primera carga)

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const d = await estado();
      // SDR nuevo sin acuse → vibración larga (no en la primera carga si ya estaban todos enterados)
      const sdr = (d.avisos || []).filter(a => a.tipo === 'sdr' && !a.enterado).map(a => a.id);
      if (sdr.some(id => !vistos.current?.has(id))) Vibration.vibrate([0, 800, 300, 800, 300, 800]);
      vistos.current = new Set(sdr);
      setDatos(d); setError('');
    }
    catch (e) {
      if (desvinculado(e)) { await borrarToken(); navigation.reset({ index: 0, routes: [{ name: 'Vincular' }] }); return; }
      setError(errorDe(e));
    } finally { setCargando(false); }
  }, [navigation]);

  useFocusEffect(useCallback(() => {
    cargar();
    const t = setInterval(cargar, 60000);
    return () => clearInterval(t);
  }, [cargar]));

  const servicioId = datos?.servicio.id;
  const enTurno = (datos?.guardias || []).filter(g => g.jornada_id && g.jornada_servicio_id === servicioId);

  async function enviarSOS() {
    Vibration.vibrate(400);
    try {
      const ubicacion = await ubicacionActual();
      await sos({
        empleado_id: enTurno.length === 1 ? enTurno[0].id : null,
        lat: ubicacion?.latitude, lng: ubicacion?.longitude, mensaje: 'SOS desde caseta',
      });
      Alert.alert('SOS enviado', 'La oficina ya recibió la alerta con tu ubicación.');
    } catch (e) { Alert.alert('No se pudo enviar', errorDe(e) + '\nLlama a la oficina.'); }
  }

  async function marcarEnterado(a) {
    try { await enterado(a.id, enTurno.length === 1 ? enTurno[0].id : null); cargar(); }
    catch (e) { Alert.alert('No se pudo confirmar', errorDe(e)); }
  }

  const avisos = datos?.avisos || [];

  function confirmarDesvincular() {
    Alert.alert('Desvincular celular', 'Esta caseta necesitará un código nuevo de la oficina.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desvincular', style: 'destructive', onPress: async () => { await borrarToken(); navigation.reset({ index: 0, routes: [{ name: 'Vincular' }] }); } },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo }}>
      <View style={{ backgroundColor: C.negro, paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 20 }}>
        <TouchableOpacity onLongPress={confirmarDesvincular} delayLongPress={3000} activeOpacity={1}>
          <Image source={require('../../assets/logo.png')} style={{ width: 200, height: 62, resizeMode: 'contain' }} />
        </TouchableOpacity>
        <Text style={{ color: C.blanco, fontSize: 22, fontWeight: '800', marginTop: 8 }}>{datos?.servicio.nombre || '…'}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}>
        {!!error && <Text style={s.error}>⚠ {error}</Text>}
        {avisos.filter(a => a.tipo === 'sdr').map(a => <Aviso key={a.id} a={a} onEnterado={marcarEnterado} />)}
        <TouchableOpacity style={s.boton} onPress={() => navigation.navigate('Guardia', { modo: 'entrada', datos })} disabled={!datos}>
          <Text style={s.botonTexto}>INICIAR JORNADA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.botonSec} onPress={() => navigation.navigate('Guardia', { modo: 'salida', datos })} disabled={!enTurno.length}>
          <Text style={[s.botonSecTexto, !enTurno.length && { opacity: 0.3 }]}>TERMINAR JORNADA</Text>
        </TouchableOpacity>
        {datos?.servicio.tiene_rondines && (
          <TouchableOpacity style={s.botonSec} onPress={() => navigation.navigate('Guardia', { modo: 'rondin', datos })} disabled={!enTurno.length}>
            <Text style={[s.botonSecTexto, !enTurno.length && { opacity: 0.3 }]}>HACER RONDÍN</Text>
          </TouchableOpacity>
        )}

        {avisos.filter(a => a.tipo === 'aviso').map(a => <Aviso key={a.id} a={a} onEnterado={marcarEnterado} />)}

        <View style={s.tarjeta}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.gris, letterSpacing: 1 }}>EN TURNO</Text>
          {enTurno.length === 0 && <Text style={{ marginTop: 8, color: C.gris }}>Nadie ha iniciado jornada.</Text>}
          {enTurno.map(g => (
            <Text key={g.id} style={{ marginTop: 8, fontSize: 17, fontWeight: '600' }}>{nombre(g)} · desde {hora(g.entrada_at)}</Text>
          ))}
        </View>

        <TouchableOpacity onLongPress={enviarSOS} delayLongPress={1500}
          style={{ marginTop: 12, borderRadius: 100, borderWidth: 4, borderColor: C.negro, paddingVertical: 22, alignItems: 'center', backgroundColor: C.blanco }}>
          <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: 4 }}>SOS</Text>
          <Text style={{ color: C.gris, marginTop: 2 }}>Mantén presionado 2 segundos</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
