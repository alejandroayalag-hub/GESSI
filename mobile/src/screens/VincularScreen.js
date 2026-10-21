import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { vincular, errorDe } from '../api';
import { s, C } from '../ui';

export default function VincularScreen({ navigation }) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar() {
    setError(''); setCargando(true);
    try {
      await vincular(codigo);
      navigation.reset({ index: 0, routes: [{ name: 'Caseta' }] });
    } catch (e) { setError(errorDe(e)); } finally { setCargando(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.negro, justifyContent: 'center', padding: 24 }}>
      <Image source={require('../../assets/logo.png')} style={{ width: '100%', height: 110, resizeMode: 'contain', marginBottom: 32 }} />
      <View style={[s.tarjeta, { padding: 24 }]}>
        <Text style={s.titulo}>Vincular celular</Text>
        <Text style={s.sub}>Escribe el código de 6 dígitos que te dio la oficina para esta caseta.</Text>
        <TextInput value={codigo} onChangeText={t => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor={C.linea}
          style={{ fontSize: 40, fontWeight: '800', letterSpacing: 12, textAlign: 'center', borderBottomWidth: 3, borderColor: C.negro, marginVertical: 24, paddingVertical: 8 }} />
        <TouchableOpacity style={[s.boton, codigo.length !== 6 && { opacity: 0.4 }]} disabled={codigo.length !== 6 || cargando} onPress={enviar}>
          {cargando ? <ActivityIndicator color={C.blanco} /> : <Text style={s.botonTexto}>VINCULAR</Text>}
        </TouchableOpacity>
        {!!error && <Text style={s.error}>⚠ {error}</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}
