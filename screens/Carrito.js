import { useContext, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { CarritoContext } from '../context/CarritoContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';

export default function Carrito({ navigation }) {
  const { productosCarrito, quitarDelCarrito, vaciarCarrito } = useContext(CarritoContext);
  const { user } = useAuth();
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [direcciones, setDirecciones] = useState([]);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState(null);
  const total = productosCarrito.reduce(
    (suma, producto) => suma + (Number(producto.precio) || 0) * producto.cantidad,
    0,
  );

  useEffect(() => {
    if (!user) {
      setDirecciones([]);
      setDireccionSeleccionada(null);
      return undefined;
    }

    return onSnapshot(
      collection(db, 'usuarios', user.uid, 'direcciones'),
      (snapshot) => {
        const guardadas = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setDirecciones(guardadas);
        setDireccionSeleccionada((actual) =>
          guardadas.some((item) => item.id === actual) ? actual : guardadas[0]?.id ?? null,
        );
      },
      (error) => {
        console.error('Error cargando las direcciones del pedido:', error);
        Alert.alert('No se pudieron cargar las direcciones', 'Abre tu cuenta para revisar tus direcciones.');
      },
    );
  }, [user?.uid]);

  const guardarPedido = async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Inicia sesión para realizar un pedido y guardar tus direcciones.');
      navigation.navigate('PerfilTab');
      return;
    }
    const direccionEntrega = direcciones.find((item) => item.id === direccionSeleccionada);
    if (!direccionEntrega) {
      Alert.alert('Agrega una dirección', 'Agrega una dirección desde Cuenta antes de realizar el pedido.');
      navigation.navigate('PerfilTab');
      return;
    }

    setEnviandoPedido(true);
    try {
      const perfilUsuario = await getDoc(doc(db, 'usuarios', user.uid));
      await addDoc(collection(db, 'pedido'), {
        productos: productosCarrito.map((producto) => ({
          productoId: producto.id || producto.nombre,
          nombre: producto.nombre,
          categoria: producto.categoria || '',
          imagen: producto.imagen || '',
          precio: Number(producto.precio) || 0,
          cantidad: producto.cantidad,
        })),
        total,
        usuarioId: user.uid,
        correo: perfilUsuario.exists() ? perfilUsuario.data().email || '' : '',
        direccionEntrega: {
          etiqueta: direccionEntrega.etiqueta,
          direccion: direccionEntrega.direccion,
          referencia: direccionEntrega.referencia || '',
          telefono: direccionEntrega.telefono,
        },
        estado: 'pendiente',
        fecha: serverTimestamp(),
      });
      vaciarCarrito();
      Alert.alert('Pedido realizado', 'Tu pedido se guardó correctamente.');
    } catch (error) {
      console.error('Error guardando el pedido:', error);
      Alert.alert('No se pudo realizar el pedido', 'Revisa tu conexión y los permisos de Firestore.');
    } finally {
      setEnviandoPedido(false);
    }
  };

  const confirmarPedido = () => {
    Alert.alert('Confirmar pedido', `El total es C$${total}. ¿Deseas continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Realizar pedido', onPress: guardarPedido },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Carrito</Text>
      {productosCarrito.length === 0 ? (
        <Text style={styles.texto}>Tu carrito está vacío.</Text>
      ) : (
        <>
          <ScrollView style={styles.lista}>
            {productosCarrito.map((producto) => (
              <View key={producto.id || producto.nombre} style={styles.producto}>
                {producto.imagen ? <Image source={{ uri: producto.imagen }} style={styles.imagen} /> : null}
                <View style={styles.detalle}>
                  <Text style={styles.nombre}>{producto.nombre}</Text>
                  <Text style={styles.texto}>Cantidad: {producto.cantidad}</Text>
                  <Text style={styles.precio}>C${Number(producto.precio) * producto.cantidad}</Text>
                </View>
                <Pressable
                  style={styles.quitarBoton}
                  onPress={() => quitarDelCarrito(producto.id || producto.nombre)}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${producto.nombre} del carrito`}
                >
                  <Ionicons name="trash-outline" size={21} color="#ed0016" />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {!user ? (
            <Pressable style={styles.aviso} onPress={() => navigation.navigate('PerfilTab')}>
              <Text style={styles.avisoTexto}>Inicia sesión desde Cuenta para pedir.</Text>
            </Pressable>
          ) : direcciones.length === 0 ? (
            <Pressable style={styles.aviso} onPress={() => navigation.navigate('PerfilTab')}>
              <Text style={styles.avisoTexto}>Agrega una dirección de entrega desde Cuenta.</Text>
            </Pressable>
          ) : (
            <View style={styles.seccionDirecciones}>
              <Text style={styles.tituloDirecciones}>Dirección de entrega</Text>
              {direcciones.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.direccion, direccionSeleccionada === item.id && styles.direccionSeleccionada]}
                  onPress={() => setDireccionSeleccionada(item.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: direccionSeleccionada === item.id }}
                >
                  <View style={styles.radio}>
                    {direccionSeleccionada === item.id && <View style={styles.radioActivo} />}
                  </View>
                  <View style={styles.direccionDetalle}>
                    <Text style={styles.direccionTitulo}>{item.etiqueta}</Text>
                    <Text style={styles.texto}>{item.direccion}</Text>
                    <Text style={styles.texto}>{item.telefono}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.total}>Total: C${total}</Text>
          <Pressable
            style={[styles.realizarBoton, (enviandoPedido || !user || !direccionSeleccionada) && styles.deshabilitado]}
            onPress={confirmarPedido}
            disabled={enviandoPedido || !user || !direccionSeleccionada}
            accessibilityRole="button"
          >
            <Text style={styles.realizarTexto}>
              {enviandoPedido ? 'Procesando pedido...' : 'Realizar pedido'}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f7f7f7' },
  titulo: { marginBottom: 16, color: '#29292e', fontSize: 24, fontWeight: 'bold' },
  texto: { color: '#777', fontSize: 14 },
  lista: { flex: 1 },
  producto: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: '#fff' },
  imagen: { width: 72, height: 72, borderRadius: 8 },
  detalle: { flex: 1, marginLeft: 12 },
  quitarBoton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  nombre: { marginBottom: 4, color: '#29292e', fontSize: 15, fontWeight: '700' },
  precio: { marginTop: 4, color: '#ed0016', fontWeight: '700' },
  aviso: { marginTop: 8, padding: 12, borderRadius: 9, backgroundColor: '#fff1f1' },
  avisoTexto: { color: '#a00010', fontWeight: '600' },
  seccionDirecciones: { marginTop: 8 },
  tituloDirecciones: { marginBottom: 8, color: '#29292e', fontSize: 16, fontWeight: '700' },
  direccion: { marginBottom: 8, padding: 11, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 9, backgroundColor: '#fff' },
  direccionSeleccionada: { borderColor: '#ed0016' },
  radio: { width: 18, height: 18, marginRight: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ed0016', borderRadius: 9 },
  radioActivo: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ed0016' },
  direccionDetalle: { flex: 1 },
  direccionTitulo: { marginBottom: 3, color: '#29292e', fontWeight: '700' },
  total: { paddingVertical: 16, color: '#29292e', fontSize: 18, fontWeight: '800' },
  realizarBoton: { marginBottom: 8, paddingVertical: 15, alignItems: 'center', borderRadius: 12, backgroundColor: '#ed0016' },
  deshabilitado: { opacity: 0.6 },
  realizarTexto: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
