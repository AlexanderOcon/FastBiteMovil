import { useContext, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { CarritoContext } from '../context/CarritoContext';
import { db } from '../firebase/config';

export default function Carrito() {
  const { productosCarrito, quitarDelCarrito, vaciarCarrito } = useContext(CarritoContext);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const total = productosCarrito.reduce(
    (suma, producto) => suma + (Number(producto.precio) || 0) * producto.cantidad,
    0,
  );

  const guardarPedido = async () => {
    setEnviandoPedido(true);

    try {
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
        estado: 'pendiente',
        fecha: serverTimestamp(),
      });

      vaciarCarrito();
      Alert.alert('Pedido realizado', 'Tu pedido se guardó correctamente.');
    } catch (error) {
      console.error('Error guardando el pedido:', error);
      Alert.alert('No se pudo realizar el pedido', 'Revisa tu conexión e inténtalo de nuevo.');
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
                {producto.imagen ? (
                  <Image source={{ uri: producto.imagen }} style={styles.imagen} />
                ) : null}
                <View style={styles.detalle}>
                  <Text style={styles.nombre}>{producto.nombre}</Text>
                  <Text style={styles.texto}>Cantidad: {producto.cantidad}</Text>
                  <Text style={styles.precio}>
                    C${Number(producto.precio) * producto.cantidad}
                  </Text>
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
          <Text style={styles.total}>Total: C${total}</Text>
          <Pressable
            style={[styles.realizarBoton, enviandoPedido && styles.botonDeshabilitado]}
            onPress={confirmarPedido}
            disabled={enviandoPedido}
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
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f7f7',
  },
  titulo: {
    marginBottom: 16,
    color: '#29292e',
    fontSize: 24,
    fontWeight: 'bold',
  },
  texto: {
    color: '#777',
    fontSize: 15,
  },
  lista: {
    flex: 1,
  },
  producto: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  imagen: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  detalle: {
    flex: 1,
    marginLeft: 12,
  },
  quitarBoton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: {
    marginBottom: 4,
    color: '#29292e',
    fontSize: 15,
    fontWeight: '700',
  },
  precio: {
    marginTop: 4,
    color: '#ed0016',
    fontWeight: '700',
  },
  total: {
    paddingVertical: 16,
    color: '#29292e',
    fontSize: 18,
    fontWeight: '800',
  },
  realizarBoton: {
    marginBottom: 8,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#ed0016',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  realizarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
