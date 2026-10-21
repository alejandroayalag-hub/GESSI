import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { leerToken } from './src/api';
import { C } from './src/ui';
import VincularScreen from './src/screens/VincularScreen';
import CasetaScreen from './src/screens/CasetaScreen';
import GuardiaScreen from './src/screens/GuardiaScreen';
import SelfieScreen from './src/screens/SelfieScreen';
import RondinScreen from './src/screens/RondinScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useKeepAwake(); // celular fijo de caseta: pantalla siempre encendida
  const [inicio, setInicio] = useState(null);
  useEffect(() => { leerToken().then(t => setInicio(t ? 'Caseta' : 'Vincular')); }, []);

  if (!inicio) return <View style={{ flex: 1, backgroundColor: C.negro, justifyContent: 'center' }}><ActivityIndicator color={C.blanco} /></View>;

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator initialRouteName={inicio} screenOptions={{
        headerStyle: { backgroundColor: C.negro }, headerTintColor: C.blanco, headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: C.fondo },
      }}>
        <Stack.Screen name="Vincular" component={VincularScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Caseta" component={CasetaScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Guardia" component={GuardiaScreen} options={{ title: '¿Quién eres?' }} />
        <Stack.Screen name="Selfie" component={SelfieScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Rondin" component={RondinScreen} options={{ title: 'Rondín' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
