import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { API_URL } from '../api';
import { s, C } from '../ui';
import { nombre } from './CasetaScreen';

const SERVIDOR = API_URL.replace(/\/api$/, '');
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

function Fila({ g, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.tarjeta, { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }]}>
      {g.foto
        ? <Image source={{ uri: SERVIDOR + g.foto }} style={{ width: 52, height: 52, borderRadius: 26 }} />
        : <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.negro, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: C.blanco, fontWeight: '800', fontSize: 18 }}>{g.nombre[0]}{g.apellido_paterno[0]}</Text>
          </View>}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{nombre(g)}</Text>
        {!g.tiene_pin && <Text style={{ color: C.gris }}>Sin PIN — avisa a la oficina</Text>}
      </View>
    </TouchableOpacity>
  );
}

export default function GuardiaScreen({ route, navigation }) {
  const { modo, datos } = route.params;
  const [elegido, setElegido] = useState(null);
  const [pin, setPin] = useState('');
  const servicioId = datos.servicio.id;

  const enTurnoAqui = datos.guardias.filter(g => g.jornada_id && g.jornada_servicio_id === servicioId);
  const libres = datos.guardias.filter(g => !g.jornada_id);
  const asignados = libres.filter(g => g.asignado);
  const otros = libres.filter(g => !g.asignado);

  function elegir(g) {
    // El rondín no pide PIN: el guardia ya se identificó con PIN + selfie al iniciar jornada
    if (modo === 'rondin') return navigation.replace('Rondin', { guardia: g, puntos: datos.puntos });
    setElegido(g); setPin('');
  }

  function tecla(t) {
    if (t === '⌫') return setPin(p => p.slice(0, -1));
    if (!t || pin.length >= 4) return;
    const nuevo = pin + t;
    setPin(nuevo);
    if (nuevo.length === 4) navigation.replace('Selfie', { modo, guardia: elegido, pin: nuevo });
  }

  if (elegido) {
    return (
      <View style={[s.pantalla, { alignItems: 'center' }]}>
        <Text style={s.titulo}>{nombre(elegido)}</Text>
        <Text style={s.sub}>Escribe tu PIN</Text>
        <View style={{ flexDirection: 'row', gap: 18, marginVertical: 28 }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.negro, backgroundColor: i < pin.length ? C.negro : 'transparent' }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 300, gap: 12 }}>
          {TECLAS.map((t, i) => (
            <TouchableOpacity key={i} onPress={() => tecla(t)} disabled={!t}
              style={{ width: 92, height: 76, borderRadius: 16, backgroundColor: t ? C.blanco : 'transparent', borderWidth: t ? 1 : 0, borderColor: C.linea, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 30, fontWeight: '700' }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setElegido(null)} style={{ marginTop: 24 }}><Text style={{ color: C.gris, fontSize: 16 }}>← Elegir otro guardia</Text></TouchableOpacity>
      </View>
    );
  }

  const lista = modo === 'entrada' ? asignados : enTurnoAqui;
  return (
    <ScrollView style={s.pantalla} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={[s.sub, { marginBottom: 14 }]}>
        {modo === 'entrada' ? 'Toca tu nombre para iniciar jornada.' : modo === 'salida' ? 'Toca tu nombre para terminar jornada.' : '¿Quién hace el rondín?'}
      </Text>
      {lista.map(g => <Fila key={g.id} g={g} onPress={() => elegir(g)} />)}
      {!lista.length && <Text style={s.sub}>No hay guardias para mostrar.</Text>}
      {modo === 'entrada' && otros.length > 0 && <>
        <Text style={{ marginTop: 20, marginBottom: 10, fontWeight: '700', color: C.gris, letterSpacing: 1 }}>OTROS GUARDIAS (CUBREN TURNO)</Text>
        {otros.map(g => <Fila key={g.id} g={g} onPress={() => elegir(g)} />)}
      </>}
    </ScrollView>
  );
}
