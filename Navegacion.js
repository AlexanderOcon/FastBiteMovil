import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Catalogo from './screens/Catalogo';
import DetalleProductos from './screens/DetalleProductos';

const Stack = createNativeStackNavigator();

export default function Navegacion() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#ed0016' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '800' },
        }}
      >
        <Stack.Screen
          name="Catalogo"
          component={Catalogo}
          options={{ title: 'FastBite' }}
        />
        <Stack.Screen
          name="Detalle"
          component={DetalleProductos}
          options={{ title: 'Detalle del producto' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}