import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';

function obtenerEtiquetaEstado(estado) {
  const valor = String(estado || 'pendiente').toLowerCase();
  if (valor === 'cancelado') return 'Pedido Cancelado';
  if (valor === 'en-preparacion' || valor === 'en_preparacion' || valor === 'preparacion') return 'Recibido, En preparación';
  if (valor === 'enviado') return 'Enviado';
  if (valor === 'recibido') return 'Recibido';
  return 'Pendiente';
}

function obtenerTiempo(fecha) {
  if (fecha?.toDate) return fecha.toDate().getTime();
  if (fecha instanceof Date) return fecha.getTime();
  if (typeof fecha === 'string') return Date.parse(fecha) || 0;
  return 0;
}

function formatearFecha(fecha) {
  const tiempo = obtenerTiempo(fecha);
  if (!tiempo) return 'Fecha no disponible';

  return new Date(tiempo).toLocaleString('es-NI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatearPrecio(valor) {
  const precio = Number(valor);
  return `C$${Number.isFinite(precio) ? precio.toLocaleString('es-NI') : '0'}`;
}

function ProductoPedido({ producto }) {
  const cantidad = Math.max(0, Number(producto.cantidad) || 0);
  const precio = Number(producto.precio) || 0;

  return (
    <View style={styles.producto}>
      {producto.imagen ? (
        <Image source={{ uri: producto.imagen }} style={styles.imagenProducto} />
      ) : (
        <View style={[styles.imagenProducto, styles.imagenVacia]}>
          <Ionicons name="fast-food-outline" size={23} color="#ed0016" />
        </View>
      )}
      <View style={styles.detalleProducto}>
        <Text style={styles.nombreProducto}>{producto.nombre || 'Producto'}</Text>
        {!!producto.categoria && <Text style={styles.textoSecundario}>{producto.categoria}</Text>}
        <Text style={styles.textoSecundario}>
          {cantidad} × {formatearPrecio(precio)}
        </Text>
      </View>
      <Text style={styles.subtotalProducto}>{formatearPrecio(precio * cantidad)}</Text>
    </View>
  );
}

function TarjetaPedido({ pedido, nombreUsuario, onRecibir, mostrarBotonRecibido }) {
  const [productosAbiertos, setProductosAbiertos] = useState(false);
  const direccion = pedido.direccionEntrega || {};
  const productos = Array.isArray(pedido.productos) ? pedido.productos : [];
  const estado = String(pedido.estado || 'pendiente');
  const estadoTexto = obtenerEtiquetaEstado(estado);

  return (
    <View style={styles.tarjetaPedido}>
      <View style={styles.encabezadoPedido}>
        <View style={styles.resumenEncabezado}>
          <View style={styles.filaNumeroPedido}>
            <View style={styles.iconoPedido}>
              <Ionicons name="receipt-outline" size={17} color="#ed0016" />
            </View>
            <Text style={styles.numeroPedido} numberOfLines={1}>Pedido de {nombreUsuario}</Text>
          </View>
          <View style={styles.filaFecha}>
            <Ionicons name="time-outline" size={13} color="#858995" />
            <Text style={styles.fecha}>{formatearFecha(pedido.fecha)}</Text>
          </View>
        </View>
        <View style={[
          styles.estado,
          estado === 'enviado' && styles.estadoEnviado,
          estado === 'recibido' && styles.estadoRecibido,
          estado === 'en-preparacion' && styles.estadoPreparacion,
          estado === 'cancelado' && styles.estadoCancelado,
        ]}>
          <Text style={[
            styles.textoEstado,
            estado === 'enviado' && styles.textoEstadoEnviado,
            estado === 'recibido' && styles.textoEstadoRecibido,
            estado === 'en-preparacion' && styles.textoEstadoPreparacion,
            estado === 'cancelado' && styles.textoEstadoCancelado,
          ]}>{estadoTexto}</Text>
        </View>
      </View>

      <Pressable
        style={styles.encabezadoProductos}
        onPress={() => setProductosAbiertos((abiertos) => !abiertos)}
        accessibilityRole="button"
        accessibilityLabel={`${productosAbiertos ? 'Contraer' : 'Desplegar'} productos del pedido de ${nombreUsuario}`}
        accessibilityState={{ expanded: productosAbiertos }}
      >
        <View style={styles.filaTituloProductos}>
          <Ionicons name="fast-food-outline" size={16} color="#ed0016" />
          <Text style={styles.tituloProductos}>Productos ({productos.length})</Text>
        </View>
        <View style={styles.resumenProductos}>
          <Ionicons
            name={productosAbiertos ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#858995"
          />
        </View>
      </Pressable>
      {productosAbiertos && (
        <View style={styles.listaProductos}>
          {productos.length > 0 ? (
            productos.map((producto, indice) => (
              <ProductoPedido
                key={`${producto.productoId || producto.nombre || 'producto'}-${indice}`}
                producto={producto}
              />
            ))
          ) : (
            <View style={styles.avisoProductos}>
              <Ionicons name="information-circle-outline" size={17} color="#858995" />
              <Text style={styles.textoSecundario}>Este pedido no tiene productos guardados.</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.separador} />
      <View style={styles.encabezadoDireccion}>
        <View style={styles.iconoDireccion}>
          <Ionicons name="location-outline" size={17} color="#ed0016" />
        </View>
        <Text style={styles.tituloDireccion}>Entrega</Text>
      </View>
      {!!direccion.etiqueta && <Text style={styles.etiquetaDireccion}>{direccion.etiqueta}</Text>}
      <Text style={styles.textoDireccion}>{direccion.direccion || 'Dirección no disponible'}</Text>
      {!!direccion.referencia && <Text style={styles.textoSecundario}>{direccion.referencia}</Text>}
      {!!direccion.telefono && (
        <View style={styles.filaContacto}>
          <Ionicons name="call-outline" size={13} color="#858995" />
          <Text style={styles.textoSecundario}>{direccion.telefono}</Text>
        </View>
      )}
      {!!pedido.correo && (
        <View style={styles.filaContacto}>
          <Ionicons name="mail-outline" size={13} color="#858995" />
          <Text style={styles.textoSecundario}>{pedido.correo}</Text>
        </View>
      )}
      <View style={styles.totalFila}>
        <Text style={styles.textoTotal}>Total del pedido</Text>
        <Text style={styles.total}>{formatearPrecio(pedido.total)}</Text>
      </View>

      {mostrarBotonRecibido && estado === 'enviado' && (
        <Pressable
          style={styles.botonRecibido}
          onPress={() => onRecibir?.(pedido)}
          accessibilityRole="button"
          accessibilityLabel={`Confirmar recepción del pedido de ${nombreUsuario}`}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={styles.botonRecibidoTexto}>Marcar como recibido</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function Pedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState(user?.displayName || 'Cliente');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [alertasMostradas, setAlertasMostradas] = useState({});

  useEffect(() => {
    if (!user?.uid) {
      setNombreUsuario('Cliente');
      return undefined;
    }

    return onSnapshot(
      doc(db, 'usuarios', user.uid),
      (snapshot) => {
        const username = snapshot.exists() ? snapshot.data().username : null;
        setNombreUsuario(
          typeof username === 'string' && username.trim()
            ? username.trim()
            : user.displayName || 'Cliente',
        );
      },
      (error) => {
        console.error('Error cargando el nombre del usuario para pedidos:', error);
        setNombreUsuario(user.displayName || 'Cliente');
      },
    );
  }, [user?.uid, user?.displayName]);

  useEffect(() => {
    if (!user?.uid) {
      setPedidos([]);
      setCargando(false);
      return undefined;
    }

    setPedidos([]);
    setCargando(true);
    setErrorCarga(false);

    return onSnapshot(
      query(collection(db, 'pedido'), where('usuarioId', '==', user.uid)),
      (snapshot) => {
        const resultados = snapshot.docs.map((documento) => ({
          ...documento.data(),
          id: documento.id,
        }));
        resultados.sort((primero, segundo) => obtenerTiempo(segundo.fecha) - obtenerTiempo(primero.fecha));
        setPedidos(resultados);
        setCargando(false);
      },
      (error) => {
        console.error('Error cargando el historial de pedidos:', error);
        setErrorCarga(true);
        setCargando(false);
      },
    );
  }, [user?.uid]);

  useEffect(() => {
    pedidos.forEach((pedido) => {
      if (String(pedido.estado || '').toLowerCase() !== 'enviado') return;
      if (alertasMostradas[pedido.id]) return;

      Alert.alert(
        'Pedido enviado',
        `Tu pedido #${String(pedido.id).slice(0, 7)} ya salió para entrega. Cuando lo recibas, márcalo como recibido.`,
      );
      setAlertasMostradas((actual) => ({ ...actual, [pedido.id]: true }));
    });
  }, [alertasMostradas, pedidos]);

  const actualizarEstadoRecibido = async (pedido) => {
    try {
      await updateDoc(doc(db, 'pedido', pedido.id), {
        estado: 'recibido',
        recibidoEn: serverTimestamp(),
      });
      Alert.alert('Pedido recibido', 'Gracias por confirmar la recepción del pedido.');
    } catch (error) {
      console.error('Error actualizando el estado del pedido:', error);
      Alert.alert('No se pudo actualizar', 'Inténtalo de nuevo en unos segundos.');
    }
  };

  const pedidosOrdenados = useMemo(
    () => [...pedidos].sort((primero, segundo) => obtenerTiempo(segundo.fecha) - obtenerTiempo(primero.fecha)),
    [pedidos],
  );

  return (
    <View style={styles.contenedor}>
      <FlatList
        data={pedidosOrdenados}
        keyExtractor={(pedido) => pedido.id}
        renderItem={({ item }) => (
          <TarjetaPedido
            pedido={item}
            nombreUsuario={nombreUsuario}
            mostrarBotonRecibido={true}
            onRecibir={actualizarEstadoRecibido}
          />
        )}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={(
          <View style={styles.encabezado}>
            <View style={styles.filaEncabezado}>
              <View style={styles.encabezadoTexto}>
                <Text style={styles.etiquetaEncabezado}>FASTBITE · TU ACTIVIDAD</Text>
                <Text style={styles.titulo}>Mis pedidos</Text>
              </View>
              <View style={styles.iconoEncabezado}>
                <Ionicons name="receipt-outline" size={23} color="#ed0016" />
              </View>
            </View>
            <Text style={styles.descripcion}>Consulta el estado y los detalles de tus compras.</Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.mensajeVacio}>
            {cargando ? (
              <ActivityIndicator size="large" color="#ed0016" />
            ) : (
              <>
                <View style={styles.iconoEstadoVacio}>
                  <Ionicons
                    name={errorCarga ? 'cloud-offline-outline' : 'receipt-outline'}
                    size={34}
                    color="#ed0016"
                  />
                </View>
                <Text style={styles.tituloEstadoVacio}>
                  {errorCarga ? 'No se cargaron tus pedidos' : 'Aún no tienes pedidos'}
                </Text>
                <Text style={styles.textoVacio}>
                  {errorCarga
                    ? 'Verifica tu conexión e inténtalo de nuevo.'
                    : 'Cuando realices una compra, podrás seguir su estado aquí.'}
                </Text>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f5f6f8' },
  lista: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 36, paddingBottom: 24 },
  encabezado: { marginBottom: 20 },
  filaEncabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  encabezadoTexto: { flex: 1 },
  etiquetaEncabezado: { marginBottom: 4, color: '#c90014', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  titulo: { color: '#242630', fontSize: 25, fontWeight: '800' },
  iconoEncabezado: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#ffe7e9' },
  descripcion: { marginTop: 7, color: '#777b86', fontSize: 13, lineHeight: 18 },
  tarjetaPedido: { marginBottom: 14, padding: 16, borderWidth: 1, borderColor: '#eceef2', borderRadius: 19, backgroundColor: '#fff', elevation: 2, shadowColor: '#222', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  encabezadoPedido: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resumenEncabezado: { flex: 1, marginRight: 8 },
  filaNumeroPedido: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconoPedido: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#fff0f1' },
  numeroPedido: { flex: 1, color: '#242630', fontSize: 14, fontWeight: '800' },
  filaFecha: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  fecha: { color: '#858995', fontSize: 11 },
  estado: { maxWidth: 145, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: '#fff1d6' },
  estadoEnviado: { backgroundColor: '#e6f5ec' },
  estadoRecibido: { backgroundColor: '#e9edff' },
  estadoPreparacion: { backgroundColor: '#fff2d8' },
  estadoCancelado: { backgroundColor: '#fbe7e7' },
  textoEstado: { color: '#8c5a00', fontSize: 11, fontWeight: '700', textTransform: 'capitalize', textAlign: 'center' },
  textoEstadoEnviado: { color: '#0b7d43' },
  textoEstadoRecibido: { color: '#2544b4' },
  textoEstadoPreparacion: { color: '#8a5d00' },
  textoEstadoCancelado: { color: '#b42318' },
  encabezadoProductos: { minHeight: 42, marginTop: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, backgroundColor: '#fff7f8' },
  filaTituloProductos: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tituloProductos: { color: '#50535e', fontSize: 12, fontWeight: '700' },
  resumenProductos: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  listaProductos: { paddingTop: 7 },
  producto: { marginVertical: 5, flexDirection: 'row', alignItems: 'center' },
  imagenProducto: { width: 52, height: 52, borderRadius: 13 },
  imagenVacia: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff0f1' },
  detalleProducto: { flex: 1, marginHorizontal: 10 },
  nombreProducto: { color: '#242630', fontSize: 13, fontWeight: '700' },
  textoSecundario: { marginTop: 3, color: '#858995', fontSize: 11 },
  subtotalProducto: { color: '#c90014', fontSize: 12, fontWeight: '800' },
  avisoProductos: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  separador: { height: 1, marginVertical: 13, backgroundColor: '#eceef2' },
  encabezadoDireccion: { marginBottom: 7, flexDirection: 'row', alignItems: 'center', gap: 7 },
  iconoDireccion: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#fff0f1' },
  tituloDireccion: { color: '#242630', fontSize: 13, fontWeight: '800' },
  etiquetaDireccion: { color: '#50535e', fontSize: 12, fontWeight: '700' },
  textoDireccion: { marginTop: 3, color: '#50535e', fontSize: 12, lineHeight: 18 },
  filaContacto: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  totalFila: { marginTop: 14, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eceef2' },
  textoTotal: { color: '#242630', fontSize: 14, fontWeight: '800' },
  total: { color: '#c90014', fontSize: 19, fontWeight: '900' },
  botonRecibido: { minHeight: 46, marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, backgroundColor: '#ed0016' },
  botonRecibidoTexto: { color: '#fff', fontSize: 13, fontWeight: '800' },
  mensajeVacio: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  iconoEstadoVacio: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: '#ffe7e9' },
  tituloEstadoVacio: { marginTop: 17, color: '#242630', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  textoVacio: { marginTop: 7, color: '#777b86', fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
