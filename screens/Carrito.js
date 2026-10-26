import { useContext, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { CarritoContext } from '../context/CarritoContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';

function formatearPrecio(valor) {
  const precio = Number(valor);
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
          <ScrollView style={styles.lista}>
            {productosCarrito.map((producto) => (
              <View key={producto.id || producto.nombre} style={styles.producto}>
                {producto.imagen ? (
                  <Image source={{ uri: producto.imagen }} style={styles.imagen} />
                ) : (
                  <View style={[styles.imagen, styles.imagenVacia]}>
                    <Ionicons name="fast-food-outline" size={26} color="#ed0016" />
                  </View>
                )}
                <View style={styles.detalle}>
                  <Text style={styles.nombre} numberOfLines={2}>{producto.nombre}</Text>
                  {!!producto.categoria && (
                    <Text style={styles.categoriaProducto}>{producto.categoria}</Text>
                  )}
                  <View style={styles.filaCantidad}>
                    <View style={styles.controlCantidad}>
                      <Pressable
                        style={[styles.botonCantidad, Number(producto.cantidad) <= 1 && styles.botonCantidadDeshabilitado]}
                        onPress={() => actualizarCantidadCarrito(
                          producto.id || producto.nombre,
                          Number(producto.cantidad) - 1,
                        )}
                        disabled={Number(producto.cantidad) <= 1}
                        accessibilityRole="button"
                        accessibilityLabel={`Disminuir cantidad de ${producto.nombre}`}
                      >
                        <Ionicons name="remove" size={16} color={Number(producto.cantidad) <= 1 ? '#bfc1c8' : '#c90014'} />
                      </Pressable>
                      <Text style={styles.cantidad}>{producto.cantidad}</Text>
                      <Pressable
                        style={styles.botonCantidad}
                        onPress={() => actualizarCantidadCarrito(
                          producto.id || producto.nombre,
                          Number(producto.cantidad) + 1,
                        )}
                        accessibilityRole="button"
                        accessibilityLabel={`Aumentar cantidad de ${producto.nombre}`}
                      >
                        <Ionicons name="add" size={16} color="#c90014" />
                      </Pressable>
                    </View>
                    <Text style={styles.precioUnitario}>
                      {formatearPrecio(producto.precio)} c/u
                    </Text>
                  </View>
                  <Text style={styles.precio}>
                    {formatearPrecio(Number(producto.precio) * producto.cantidad)}
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

          {!user ? (
            <Pressable style={styles.aviso} onPress={() => navigation.navigate('PerfilTab')}>
              <Text style={styles.avisoTexto}>Inicia sesión desde Cuenta para pedir.</Text>
            </Pressable>
          ) : direcciones.length === 0 ? (
            <Pressable style={styles.aviso} onPress={() => navigation.navigate('PerfilTab')}>
              <Text style={styles.avisoTexto}>Agrega una dirección de entrega desde Cuenta.</Text>
            </Pressable>
          ) : (
            <View style={styles.seccionDirecciones} accessibilityRole="radiogroup">
              <Text style={styles.tituloDirecciones}>Dirección de entrega</Text>
              <Text style={styles.subtituloDirecciones}>Selecciona dónde recibir tu pedido</Text>
              <Pressable
                style={styles.selectorDireccion}
                onPress={() => setSelectorDireccionesAbierto((abierto) => !abierto)}
                accessibilityRole="button"
                accessibilityLabel="Elegir dirección de entrega"
                accessibilityState={{ expanded: selectorDireccionesAbierto }}
              >
                <View style={styles.iconoDireccion}>
                  <Ionicons name="location" size={19} color="#ed0016" />
                </View>
                <View style={styles.direccionDetalle}>
                  <Text style={styles.direccionTitulo}>
                    {direccionElegida?.etiqueta || 'Selecciona una dirección'}
                  </Text>
                  {!!direccionElegida && <Text style={styles.texto}>{direccionElegida.direccion}</Text>}
                  {!!direccionElegida?.referencia && (
                    <Text style={styles.textoSecundario}>{direccionElegida.referencia}</Text>
                  )}
                  {!!direccionElegida?.telefono && (
                    <Text style={styles.textoSecundario}>{direccionElegida.telefono}</Text>
                  )}
                </View>
                <Ionicons
                  name={selectorDireccionesAbierto ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#c90014"
                />
              </Pressable>
              {selectorDireccionesAbierto && (
                <View style={styles.opcionesDirecciones}>
                  {direcciones.map((item) => {
                    const estaSeleccionada = direccionSeleccionada === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.opcionDireccion,
                          estaSeleccionada && styles.opcionDireccionActiva,
                        ]}
                        onPress={() => {
                          setDireccionSeleccionada(item.id);
                          setSelectorDireccionesAbierto(false);
                        }}
                        accessibilityRole="radio"
                        accessibilityLabel={`${item.etiqueta}, ${item.direccion}`}
                        accessibilityState={{ selected: estaSeleccionada }}
                      >
                        <View style={styles.detalleOpcionDireccion}>
                          <Text style={styles.direccionTitulo}>{item.etiqueta}</Text>
                          <Text style={styles.texto}>{item.direccion}</Text>
                          {!!item.referencia && (
                            <Text style={styles.textoSecundario}>{item.referencia}</Text>
                          )}
                          {!!item.telefono && (
                            <Text style={styles.textoSecundario}>{item.telefono}</Text>
                          )}
                        </View>
                        {estaSeleccionada && (
                          <Ionicons name="checkmark-circle" size={21} color="#ed0016" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <View style={styles.resumenTotal}>
            <View>
              <Text style={styles.etiquetaTotal}>Total del pedido</Text>
              <Text style={styles.notaTotal}>Impuestos incluidos</Text>
            </View>
            <Text style={styles.total}>{formatearPrecio(total)}</Text>
          </View>
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
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 56, paddingBottom: 10, backgroundColor: '#f5f6f8' },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  titulo: { color: '#242630', fontSize: 25, fontWeight: '800' },
  subtitulo: { marginTop: 3, color: '#858995', fontSize: 13 },
  iconoCarrito: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#ffe7e9' },
  estadoVacio: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 70 },
  iconoVacio: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: '#ffe7e9' },
  tituloVacio: { marginTop: 20, color: '#242630', fontSize: 19, fontWeight: '800' },
  textoVacio: { marginTop: 8, color: '#777b86', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  botonCatalogo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 13, backgroundColor: '#ed0016' },
  textoBotonCatalogo: { color: '#fff', fontSize: 14, fontWeight: '800' },
  texto: { color: '#626570', fontSize: 13, lineHeight: 19 },
  lista: { flex: 1, marginHorizontal: -2, paddingHorizontal: 2 },
  producto: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 13, borderWidth: 1, borderColor: '#eceef2', borderRadius: 18, backgroundColor: '#fff', elevation: 2, shadowColor: '#222', shadowOpacity: 0.04, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
  imagen: { width: 72, height: 76, borderRadius: 13 },
  imagenVacia: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff0f1' },
  detalle: { flex: 1, marginLeft: 13 },
  quitarBoton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: 5, borderRadius: 13, backgroundColor: '#fff0f1' },
  nombre: { marginBottom: 3, color: '#242630', fontSize: 15, fontWeight: '800' },
  categoriaProducto: { marginBottom: 3, color: '#858995', fontSize: 11 },
  filaCantidad: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 3 },
  controlCantidad: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botonCantidad: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1c5ca', borderRadius: 9, backgroundColor: '#fff7f8' },
  botonCantidadDeshabilitado: { borderColor: '#e8e9ed', backgroundColor: '#f5f6f8' },
  cantidad: { minWidth: 15, color: '#50535e', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  precioUnitario: { color: '#858995', fontSize: 11 },
  precio: { marginTop: 5, color: '#c90014', fontSize: 14, fontWeight: '800' },
  aviso: { marginTop: 8, padding: 14, borderWidth: 1, borderColor: '#ffd5d9', borderRadius: 14, backgroundColor: '#fff0f1' },
  avisoTexto: { color: '#a00010', fontSize: 13, fontWeight: '700' },
  seccionDirecciones: { marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e9ebef' },
  tituloDirecciones: { color: '#242630', fontSize: 16, fontWeight: '800' },
  subtituloDirecciones: { marginTop: 3, marginBottom: 10, color: '#858995', fontSize: 12 },
  selectorDireccion: { minHeight: 56, padding: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#c90014', borderRadius: 13, backgroundColor: '#fff' },
  opcionesDirecciones: { marginTop: 7, padding: 5, borderWidth: 1, borderColor: '#e5e7ec', borderRadius: 15, backgroundColor: '#fff' },
  opcionDireccion: { minHeight: 62, padding: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 11 },
  opcionDireccionActiva: { backgroundColor: '#fff0f1' },
  detalleOpcionDireccion: { flex: 1 },
  iconoDireccion: { width: 30, height: 30, marginRight: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#fff0f1' },
  radio: { width: 23, height: 23, marginLeft: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#c9cbd2', borderRadius: 12 },
  radioSeleccionado: { borderColor: '#ed0016', backgroundColor: '#ed0016' },
  direccionDetalle: { flex: 1 },
  direccionTitulo: { marginBottom: 1, color: '#242630', fontSize: 11, fontWeight: '800' },
  textoSecundario: { marginTop: 1, color: '#858995', fontSize: 10 },
  resumenTotal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, paddingVertical: 13 },
  etiquetaTotal: { color: '#242630', fontSize: 15, fontWeight: '800' },
  notaTotal: { marginTop: 2, color: '#858995', fontSize: 11 },
  total: { color: '#c90014', fontSize: 21, fontWeight: '900' },
  realizarBoton: { minHeight: 52, marginBottom: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#ed0016', elevation: 2, shadowColor: '#c90014', shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  deshabilitado: { opacity: 0.55 },
  realizarTexto: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
