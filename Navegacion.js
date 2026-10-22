import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { CarritoContext } from './context/CarritoContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { auth, db } from './firebase/config';
import Catalogo from './screens/Catalogo';
import DetalleProducto from './screens/DetalleProductos';
import Carrito from './screens/Carrito';
import Perfil from './screens/Perfil';
import AdminProductos from './screens/AdminProductos';
import AdminPedidos from './screens/AdminPedidos';
import Pedidos from './screens/Pedidos';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const GUEST_CART_KEY = 'fastbite:cart:guest';
const userCartKey = (uid) => `fastbite:cart:user:${uid}`;

function readItems(value) {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.items) ? value.items : [];
}

function mergeCarts(first, second, keepHighestQuantity = false) {
  const merged = new Map();
  first.forEach((item) => merged.set(item.id ?? item.nombre, { ...item }));
  second.forEach((item) => {
    const key = item.id ?? item.nombre;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...item });
      return;
    }
    merged.set(key, {
      ...existing,
      ...item,
      cantidad: keepHighestQuantity
        ? Math.max(Number(existing.cantidad) || 1, Number(item.cantidad) || 1)
        : (Number(existing.cantidad) || 1) + (Number(item.cantidad) || 1),
    });
  });
  return [...merged.values()];
}

function MainNavigation() {
  const { user, role, authReady, roleReady } = useAuth();
  const [productosCarrito, setProductosCarrito] = useState([]);
  const [carritoListo, setCarritoListo] = useState(false);
  const ownerCarritoInvitado = useRef(null);

  useEffect(() => {
    if (!authReady) return undefined;
    let cancelled = false;
    setCarritoListo(false);

    const cargarCarrito = async () => {
      try {
        const guestRaw = await AsyncStorage.getItem(GUEST_CART_KEY);
        const guest = guestRaw ? JSON.parse(guestRaw) : null;
        if (!user) {
          ownerCarritoInvitado.current = guest?.ownerUid ?? null;
          if (!cancelled) setProductosCarrito(readItems(guest));
          return;
        }

        const localRaw = await AsyncStorage.getItem(userCartKey(user.uid));
        const local = localRaw ? JSON.parse(localRaw) : null;
        let remoteItems = null;
        try {
          const remote = await getDoc(doc(db, 'usuarios', user.uid, 'carrito', 'actual'));
          if (remote.exists()) remoteItems = readItems(remote.data());
        } catch (error) {
          console.error('No se pudo sincronizar el carrito con Firestore:', error);
          Alert.alert(
            'Carrito sin sincronizar',
            'Se conservaron los productos guardados en este dispositivo. Verifica los permisos de Firestore.',
          );
        }

        const accountItems = remoteItems ?? readItems(local);
        const guestItems = readItems(guest);
        const guestBelongsToAccount = !guest?.ownerUid || guest.ownerUid === user.uid;
        const merged = guestBelongsToAccount
          ? mergeCarts(accountItems, guestItems, guest?.ownerUid === user.uid)
          : accountItems;

        ownerCarritoInvitado.current = user.uid;
        if (!cancelled) setProductosCarrito(merged);
        if (guestBelongsToAccount && guestItems.length > 0) {
          await AsyncStorage.removeItem(GUEST_CART_KEY);
        }
      } catch (error) {
        console.error('No se pudo cargar el carrito guardado:', error);
        Alert.alert('No se pudo cargar el carrito', 'Cierra y vuelve a abrir la aplicación para intentarlo de nuevo.');
        if (!cancelled) setProductosCarrito([]);
      } finally {
        if (!cancelled) setCarritoListo(true);
      }
    };

    cargarCarrito();
    return () => { cancelled = true; };
  }, [authReady, user?.uid]);

  useEffect(() => {
    if (!carritoListo) return;
    const guardarCarrito = async () => {
      if (user) {
        const local = AsyncStorage.setItem(userCartKey(user.uid), JSON.stringify({ items: productosCarrito }));
        const remote = setDoc(
          doc(db, 'usuarios', user.uid, 'carrito', 'actual'),
          { items: productosCarrito, updatedAt: serverTimestamp() },
          { merge: true },
        );
        const results = await Promise.allSettled([local, remote]);
        const remoteResult = results[1];
        if (remoteResult.status === 'rejected') {
          console.error('No se pudo sincronizar el carrito con Firestore:', remoteResult.reason);
          Alert.alert(
            'Carrito guardado solo en este dispositivo',
            'No se pudo sincronizar con tu cuenta. Verifica las reglas de Firestore.',
          );
        }
        if (results[0].status === 'rejected') {
          console.error('No se pudo guardar el carrito en el dispositivo:', results[0].reason);
          Alert.alert('No se pudo guardar el carrito', 'Revisa el almacenamiento disponible en tu dispositivo.');
        }
      } else {
        await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify({
          ownerUid: ownerCarritoInvitado.current,
          items: productosCarrito,
        }));
      }
    };

    guardarCarrito().catch((error) => console.error('Error guardando el carrito local:', error));
  }, [carritoListo, productosCarrito, user?.uid]);

  const agregarAlCarrito = (producto, cantidad = 1) => {
    const cantidadAgregar = Math.max(1, Number(cantidad) || 1);
    setProductosCarrito((actuales) => {
      const id = producto.id ?? producto.nombre;
      const existente = actuales.find((item) => (item.id ?? item.nombre) === id);
      return existente
        ? actuales.map((item) => (item.id ?? item.nombre) === id
          ? { ...item, cantidad: (Number(item.cantidad) || 1) + cantidadAgregar }
          : item)
        : [...actuales, { ...producto, cantidad: cantidadAgregar }];
    });
  };

  const quitarDelCarrito = (id) => {
    setProductosCarrito((actuales) => actuales.filter((item) => (item.id ?? item.nombre) !== id));
  };

  const cerrarSesion = async () => {
    try {
      if (user) {
        await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify({
          ownerUid: user.uid,
          items: productosCarrito,
        }));
      }
      await signOut(auth);
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      Alert.alert('No se pudo cerrar sesión', 'Inténtalo de nuevo.');
    }
  };

  if (!authReady || !roleReady || !carritoListo) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#ed0016" />
      </View>
    );
  }

  return (
    <CarritoContext.Provider value={{
      productosCarrito,
      agregarAlCarrito,
      quitarDelCarrito,
      vaciarCarrito: () => setProductosCarrito([]),
      cerrarSesion,
    }}>
      {!user ? (
        <Perfil />
      ) : (
        <NavigationContainer>
          {role === 'admin' ? (
            <Tab.Navigator
              initialRouteName="AdminPedidosTab"
              screenOptions={{ headerShown: false }}
            >
              <Tab.Screen
                name="AdminPedidosTab"
                component={AdminPedidos}
                options={{
                  title: 'Pedidos',
                  tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
                }}
              />
              <Tab.Screen
                name="AdminProductosTab"
                component={AdminProductos}
                options={{
                  title: 'Productos',
                  tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
                }}
              />
            </Tab.Navigator>
          ) : (
            <Tab.Navigator screenOptions={{ headerShown: false }}>
              <Tab.Screen
                name="CatalogoTab"
                component={CatalogoStack}
                options={{
                  title: 'Catálogo',
                  tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" size={size} color={color} />,
                }}
              />
              <Tab.Screen
                name="CarritoTab"
                component={Carrito}
                options={{
                  title: 'Carrito',
                  tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
                }}
              />
              <Tab.Screen
                name="PedidosTab"
                component={Pedidos}
                options={{
                  title: 'Pedidos',
                  tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
                }}
              />
              <Tab.Screen
                name="PerfilTab"
                component={Perfil}
                options={{
                  title: 'Cuenta',
                  tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
                }}
              />
            </Tab.Navigator>
          )}
        </NavigationContainer>
      )}
    </CarritoContext.Provider>
  );
}

function CatalogoStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Catalogo" component={Catalogo} options={{ title: 'FastBite' }} />
      <Stack.Screen name="Detalle" component={DetalleProducto} options={{ title: 'Detalle del producto' }} />
    </Stack.Navigator>
  );
}

export default function Navegacion() {
  return (
    <AuthProvider>
      <MainNavigation />
    </AuthProvider>
  );
}
