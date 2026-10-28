import { useContext, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { CarritoContext } from '../context/CarritoContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import ListaProductosCarrito from '../components/carrito/ListaProductosCarrito';
import SelectorDireccionPedido from '../components/carrito/SelectorDireccionPedido';
import ResumenPedidoCarrito from '../components/carrito/ResumenPedidoCarrito';

function formatearPrecio(valor) {
  const precio = Math.trunc(Number(valor));
  return `C$${Number.isFinite(precio) ? precio.toLocaleString('es-NI') : '0'}`;
}

export default function Carrito({ navigation }) {
  const {
    productosCarrito,
    quitarDelCarrito,
    actualizarCantidadCarrito,
    vaciarCarrito,
  } = useContext(CarritoContext);
  const { user } = useAuth();
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [direcciones, setDirecciones] = useState([]);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState(null);
  const [selectorDireccionesAbierto, setSelectorDireccionesAbierto] = useState(false);
  const total = productosCarrito.reduce(
    (suma, producto) => suma + (Number(producto.precio) || 0) * producto.cantidad,
    0,
  );
  const direccionElegida = direcciones.find((item) => item.id === direccionSeleccionada);

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
          esOferta: Boolean(producto.esOferta),
          productosIncluidos: Array.isArray(producto.productosIncluidos)
            ? producto.productosIncluidos
            : [],
        })),
        total,
        usuarioId: user.uid,
        usuarioNombre: perfilUsuario.exists()
          ? perfilUsuario.data().username || user.displayName || ''
          : user.displayName || '',
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
      <View style={styles.encabezado}>
        <View>
          <Text style={styles.titulo}>Mi carrito</Text>
          <Text style={styles.subtitulo}>
            {productosCarrito.length
              ? `${productosCarrito.length} ${productosCarrito.length === 1 ? 'producto' : 'productos'} en tu pedido`
              : 'Prepara algo delicioso'}
          </Text>
        </View>
        <View style={styles.iconoCarrito}>
          <Ionicons name="cart-outline" size={23} color="#ed0016" />
        </View>
      </View>
      {productosCarrito.length === 0 ? (
        <View style={styles.estadoVacio}>
          <View style={styles.iconoVacio}>
            <Ionicons name="basket-outline" size={38} color="#ed0016" />
          </View>
          <Text style={styles.tituloVacio}>Tu carrito está vacío</Text>
          <Text style={styles.textoVacio}>Explora el menú y agrega tus favoritos para empezar.</Text>
          <Pressable
            style={styles.botonCatalogo}
            onPress={() => navigation.navigate('CatalogoTab')}
            accessibilityRole="button"
          >
            <Text style={styles.textoBotonCatalogo}>Ver catálogo</Text>
            <Ionicons name="arrow-forward" size={17} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <>
          <ListaProductosCarrito
            productos={productosCarrito}
            actualizarCantidadCarrito={actualizarCantidadCarrito}
            quitarDelCarrito={quitarDelCarrito}
          />
          <SelectorDireccionPedido
            user={user}
            navigation={navigation}
            direcciones={direcciones}
            direccionElegida={direccionElegida}
            direccionSeleccionada={direccionSeleccionada}
            setDireccionSeleccionada={setDireccionSeleccionada}
            abierto={selectorDireccionesAbierto}
            setAbierto={setSelectorDireccionesAbierto}
          />
          <ResumenPedidoCarrito
            total={total}
            enviandoPedido={enviandoPedido}
            puedeRealizar={Boolean(user && direccionSeleccionada && !enviandoPedido)}
            confirmarPedido={confirmarPedido}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 10,
    backgroundColor: '#f5f6f8',
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  titulo: {
    color: '#242630',
    fontSize: 25,
    fontWeight: '800',
  },
  subtitulo: {
    marginTop: 3,
    color: '#858995',
    fontSize: 13,
  },
  iconoCarrito: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#ffe7e9',
  },
  estadoVacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 70,
  },
  iconoVacio: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#ffe7e9',
  },
  tituloVacio: {
    marginTop: 20,
    color: '#242630',
    fontSize: 19,
    fontWeight: '800',
  },
  textoVacio: {
    marginTop: 8,
    color: '#777b86',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  botonCatalogo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: '#ed0016',
  },
  textoBotonCatalogo: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  botonCantidadDeshabilitado: {
    opacity: 0.55,
  },
});
