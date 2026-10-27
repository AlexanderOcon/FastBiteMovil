import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const filtrosEstado = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'en-preparacion', etiqueta: 'Preparación' },
  { valor: 'enviado', etiqueta: 'Enviados' },
  { valor: 'recibido', etiqueta: 'Recibidos' },
  { valor: 'cancelado', etiqueta: 'Cancelados' },
];

function normalizarEstadoPedido(estado) {
  const valor = String(estado || 'pendiente').toLowerCase().replace(/_/g, '-');
  return valor === 'preparacion' ? 'en-preparacion' : valor;
}

function obtenerEtiquetaEstado(estado) {
  const valor = normalizarEstadoPedido(estado);
  if (valor === 'cancelado') return 'Pedido Cancelado';
  if (valor === 'en-preparacion') return 'Recibido, En preparación';
  if (valor === 'enviado') return 'Enviado';
  if (valor === 'recibido') return 'Recibido';
  return 'Pendiente';
}

function formatearFecha(fecha) {
  if (!fecha) return 'Fecha no disponible';
  if (fecha?.toDate) return fecha.toDate().toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' });
  if (fecha instanceof Date) return fecha.toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' });
  if (typeof fecha === 'string') return new Date(fecha).toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' });
  return 'Fecha no disponible';
}

function formatearPrecio(valor) {
  const precio = Math.trunc(Number(valor));
  return `C$${Number.isFinite(precio) ? precio.toLocaleString('es-NI') : '0'}`;
}

function obtenerTiempo(fecha) {
  if (fecha?.toDate) return fecha.toDate().getTime();
  if (fecha instanceof Date) return fecha.getTime();
  if (typeof fecha === 'string') return Date.parse(fecha) || 0;
  return 0;
}

export default function AdminPedidos({ navigation }) {
  const [pedidos, setPedidos] = useState([]);
  const [nombresUsuarios, setNombresUsuarios] = useState({});
  const [pedidoExpandido, setPedidoExpandido] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const usuariosConsultados = useRef(new Set());

  useEffect(() => {
    let activo = true;
    const unsubscribe = onSnapshot(
      collection(db, 'pedido'),
      (snapshot) => {
        const resultados = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
        resultados.sort((primero, segundo) => obtenerTiempo(segundo.fecha) - obtenerTiempo(primero.fecha));
        setPedidos(resultados);

        const usuariosPorConsultar = [...new Set(
          resultados
            .filter((pedido) => !pedido.usuarioNombre && pedido.usuarioId && !usuariosConsultados.current.has(pedido.usuarioId))
            .map((pedido) => pedido.usuarioId),
        )];
        usuariosPorConsultar.forEach((usuarioId) => usuariosConsultados.current.add(usuarioId));

        Promise.all(usuariosPorConsultar.map(async (usuarioId) => {
          try {
            const perfil = await getDoc(doc(db, 'usuarios', usuarioId));
            return [usuarioId, perfil.exists() ? perfil.data().username : ''];
          } catch (error) {
            console.error(`Error cargando el nombre del usuario ${usuarioId}:`, error);
            return null;
          }
        })).then((perfiles) => {
          if (!activo) return;
          const nombres = perfiles.filter((perfil) => perfil?.[1]);
          if (nombres.length > 0) {
            setNombresUsuarios((actuales) => ({
              ...actuales,
              ...Object.fromEntries(nombres),
            }));
          }
          if (perfiles.some((perfil) => perfil === null)) {
            Alert.alert('No se pudieron cargar algunos nombres', 'Verifica los permisos de lectura de perfiles en Firestore.');
          }
        });
      },
      (error) => {
        console.error('Error cargando pedidos para administración:', error);
        Alert.alert('No se pudieron cargar los pedidos', 'Verifica los permisos de Firestore.');
      },
    );

    return () => {
      activo = false;
      unsubscribe();
    };
  }, []);

  const cambiarEstadoPedido = async (pedido, siguienteEstado) => {
    try {
      await updateDoc(doc(db, 'pedido', pedido.id), {
        estado: siguienteEstado,
      });

      if (siguienteEstado === 'cancelado') {
        Alert.alert('Pedido cancelado', 'El cliente verá este pedido como Pedido Cancelado.');
        return;
      }

      Alert.alert('Pedido actualizado', `El pedido quedó como ${obtenerEtiquetaEstado(siguienteEstado)}.`);
    } catch (error) {
      console.error('Error actualizando el estado del pedido:', error);
      Alert.alert('No se pudo actualizar el pedido', 'Verifica tu conexión y permisos de Firestore.');
    }
  };

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const estado = normalizarEstadoPedido(pedido.estado);
    const nombreCliente = pedido.usuarioNombre
      || nombresUsuarios[pedido.usuarioId]
      || pedido.correo
      || 'Cliente sin nombre';
    const textoPedido = [
      nombreCliente,
      pedido.correo,
      pedido.direccionEntrega?.direccion,
      pedido.direccionEntrega?.telefono,
    ].filter(Boolean).join(' ').toLowerCase();

    return (filtroEstado === 'todos' || estado === filtroEstado)
      && textoPedido.includes(busqueda.trim().toLowerCase());
  });

  return (
    <ScrollView contentContainerStyle={styles.contenedor}>
      <View style={styles.encabezado}>
        <View style={styles.encabezadoTexto}>
          <Text style={styles.etiquetaEncabezado}>FASTBITE · ADMINISTRACIÓN</Text>
          <Text style={styles.titulo}>Pedidos</Text>
          <Text style={styles.subtitulo}>Revisa y gestiona los pedidos de tus clientes.</Text>
        </View>
        <Pressable
          style={styles.botonProductos}
          onPress={() => navigation.navigate('AdminProductos')}
          accessibilityRole="button"
        >
          <Ionicons name="fast-food-outline" size={16} color="#ed0016" />
          <Text style={styles.enlace}>Productos</Text>
        </Pressable>
      </View>

      <View style={styles.resumen}>
        <View style={styles.iconoResumen}>
          <Ionicons name="receipt-outline" size={22} color="#ed0016" />
        </View>
        <View style={styles.textoResumen}>
          <Text style={styles.totalResumen}>{pedidos.length}</Text>
          <Text style={styles.detalleResumen}>pedidos registrados</Text>
        </View>
        <View style={styles.resumenPendientes}>
          <Text style={styles.numeroPendientes}>
            {pedidos.filter((pedido) => normalizarEstadoPedido(pedido.estado) === 'pendiente').length}
          </Text>
          <Text style={styles.etiquetaPendientes}>por atender</Text>
        </View>
      </View>

      <View style={styles.buscador}>
        <Ionicons name="search-outline" size={18} color="#858995" />
        <TextInput
          style={styles.inputBusqueda}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar cliente, correo o dirección"
          placeholderTextColor="#999"
          accessibilityLabel="Buscar pedidos por cliente, correo o dirección"
          returnKeyType="search"
        />
        {busqueda.length > 0 && (
          <Pressable
            onPress={() => setBusqueda('')}
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
          >
            <Ionicons name="close-circle" size={18} color="#858995" />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.carruselFiltros}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtros}
      >
        {filtrosEstado.map((filtro) => {
          const seleccionado = filtroEstado === filtro.valor;
          const cantidad = filtro.valor === 'todos'
            ? pedidos.length
            : pedidos.filter((pedido) => normalizarEstadoPedido(pedido.estado) === filtro.valor).length;
          return (
            <Pressable
              key={filtro.valor}
              style={[styles.filtro, seleccionado && styles.filtroActivo]}
              onPress={() => setFiltroEstado(filtro.valor)}
              accessibilityRole="button"
              accessibilityState={{ selected: seleccionado }}
            >
              <Text
                numberOfLines={1}
                style={[styles.textoFiltro, seleccionado && styles.textoFiltroActivo]}
              >
                {filtro.etiqueta}
              </Text>
              <Text style={[styles.contadorFiltro, seleccionado && styles.contadorFiltroActivo]}>
                {cantidad}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.tituloLista}>
        {filtroEstado === 'todos' ? 'Pedidos recientes' : filtrosEstado.find((filtro) => filtro.valor === filtroEstado)?.etiqueta}
        <Text style={styles.cantidadLista}> · {pedidosFiltrados.length}</Text>
      </Text>

      {pedidos.length === 0 || pedidosFiltrados.length === 0 ? (
        <View style={styles.vacio}>
          <View style={styles.iconoVacio}>
            <Ionicons
              name={pedidos.length === 0 ? 'receipt-outline' : 'search-outline'}
              size={30}
              color="#ed0016"
            />
          </View>
          <Text style={styles.tituloVacio}>
            {pedidos.length === 0 ? 'Todavía no hay pedidos' : 'No encontramos pedidos'}
          </Text>
          <Text style={styles.textoVacio}>
            {pedidos.length === 0
              ? 'Cuando un cliente realice una compra, aparecerá aquí.'
              : 'Prueba con otro cliente o selecciona un estado distinto.'}
          </Text>
        </View>
      ) : (
        pedidosFiltrados.map((pedido) => {
          const estadoActual = normalizarEstadoPedido(pedido.estado);
          const direccion = pedido.direccionEntrega || {};
          const productosPedido = Array.isArray(pedido.productos) ? pedido.productos : [];
          const expandido = pedidoExpandido === pedido.id;
          const nombreCliente = pedido.usuarioNombre
            || nombresUsuarios[pedido.usuarioId]
            || pedido.correo
            || 'Cliente sin nombre';

          return (
            <View key={pedido.id} style={styles.pedidoCard}>
              <Pressable
                style={styles.pedidoHeader}
                onPress={() => setPedidoExpandido(expandido ? null : pedido.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: expandido }}
                accessibilityLabel={`${nombreCliente}, ${expandido ? 'ocultar' : 'ver'} productos del pedido`}
              >
                <View style={styles.encabezadoCliente}>
                  <View style={styles.filaCliente}>
                    <View style={styles.iconoCliente}>
                      <Ionicons name="person-outline" size={16} color="#ed0016" />
                    </View>
                    <Text style={styles.pedidoNumero} numberOfLines={1}>{nombreCliente}</Text>
                  </View>
                  <View style={styles.filaFecha}>
                    <Ionicons name="time-outline" size={13} color="#858995" />
                    <Text style={styles.pedidoFecha}>{formatearFecha(pedido.fecha)}</Text>
                  </View>
                </View>
                <View style={styles.encabezadoEstado}>
                  <View style={[
                    styles.estadoPedido,
                    estadoActual === 'enviado' && styles.estadoPedidoEnviado,
                    estadoActual === 'recibido' && styles.estadoPedidoRecibido,
                    estadoActual === 'en-preparacion' && styles.estadoPedidoPreparacion,
                    estadoActual === 'cancelado' && styles.estadoPedidoCancelado,
                  ]}>
                    <Text style={[
                      styles.estadoTexto,
                      estadoActual === 'enviado' && styles.estadoTextoEnviado,
                      estadoActual === 'recibido' && styles.estadoTextoRecibido,
                      estadoActual === 'en-preparacion' && styles.estadoTextoPreparacion,
                      estadoActual === 'cancelado' && styles.estadoTextoCancelado,
                    ]}>
                      {obtenerEtiquetaEstado(estadoActual)}
                    </Text>
                  </View>
                  <Ionicons
                    name={expandido ? 'chevron-up' : 'chevron-down'}
                    size={17}
                    color="#858995"
                    style={styles.flechaPedido}
                  />
                </View>
              </Pressable>

              {!!pedido.correo && (
                <View style={styles.filaDetalle}>
                  <Ionicons name="mail-outline" size={14} color="#858995" />
                  <Text style={styles.pedidoDetalle}>{pedido.correo}</Text>
                </View>
              )}
              {!!direccion.direccion && (
                <View style={styles.filaDetalle}>
                  <Ionicons name="location-outline" size={14} color="#858995" />
                  <Text style={styles.pedidoDetalle}>{direccion.direccion}</Text>
                </View>
              )}
              {!!direccion.telefono && (
                <View style={styles.filaDetalle}>
                  <Ionicons name="call-outline" size={14} color="#858995" />
                  <Text style={styles.pedidoDetalle}>{direccion.telefono}</Text>
                </View>
              )}

              {expandido && productosPedido.length > 0 && (
                <View style={styles.productosPedido}>
                  {productosPedido.map((producto, indice) => {
                    const cantidad = Math.max(0, Number(producto.cantidad) || 0);
                    const precio = Number(producto.precio) || 0;
                    return (
                      <View key={`${pedido.id}-${indice}`} style={styles.productoPedido}>
                        {producto.imagen ? (
                          <Image source={{ uri: producto.imagen }} style={styles.imagenProducto} />
                        ) : (
                          <View style={[styles.imagenProducto, styles.imagenVacia]} />
                        )}
                        <View style={styles.detalleProducto}>
                          <Text style={styles.nombreProducto}>{producto.nombre || 'Producto'}</Text>
                          {!!producto.categoria && <Text style={styles.textoProducto}>{producto.categoria}</Text>}
                          <Text style={styles.textoProducto}>
                            {cantidad} × {formatearPrecio(precio)}
                          </Text>
                        </View>
                        <Text style={styles.subtotalProducto}>{formatearPrecio(precio * cantidad)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
              {expandido && productosPedido.length === 0 && (
                <Text style={styles.pedidoDetalle}>Este pedido no tiene productos guardados.</Text>
              )}

              <View style={styles.filaTotal}>
                <Text style={styles.etiquetaTotal}>Total del pedido</Text>
                <Text style={styles.totalPedido}>{formatearPrecio(pedido.total)}</Text>
              </View>

              {estadoActual === 'pendiente' && (
                <View style={styles.botonesContainer}>
                  <Pressable
                    style={styles.botonEstado}
                    onPress={() => cambiarEstadoPedido(pedido, 'en-preparacion')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.botonTexto}>Aceptar pedido</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.botonEstado, styles.botonCancelar]}
                    onPress={() => cambiarEstadoPedido(pedido, 'cancelado')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#ed0016" />
                    <Text style={[styles.botonTexto, styles.botonCancelarTexto]}>Cancelar Pedido</Text>
                  </Pressable>
                </View>
              )}

              {estadoActual === 'en-preparacion' && (
                <View style={styles.botonesContainer}>
                  <Pressable
                    style={styles.botonEstado}
                    onPress={() => cambiarEstadoPedido(pedido, 'enviado')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="bicycle-outline" size={18} color="#fff" />
                    <Text style={styles.botonTexto}>Marcar como enviado</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.botonEstado, styles.botonCancelar]}
                    onPress={() => cambiarEstadoPedido(pedido, 'cancelado')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#ed0016" />
                    <Text style={[styles.botonTexto, styles.botonCancelarTexto]}>Cancelar Pedido</Text>
                  </Pressable>
                </View>
              )}

              {estadoActual === 'enviado' && (
                <Pressable
                  style={[styles.botonEstado, styles.botonCancelar]}
                  onPress={() => cambiarEstadoPedido(pedido, 'cancelado')}
                  accessibilityRole="button"
                >
                  <Ionicons name="close-circle-outline" size={18} color="#ed0016" />
                  <Text style={[styles.botonTexto, styles.botonCancelarTexto]}>Cancelar Pedido</Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 48, paddingBottom: 24, backgroundColor: '#f5f6f8' },
  encabezado: { marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  encabezadoTexto: { flex: 1 },
  etiquetaEncabezado: { marginBottom: 4, color: '#c90014', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  titulo: { color: '#242630', fontSize: 25, fontWeight: '800' },
  subtitulo: { marginTop: 6, color: '#777b86', fontSize: 13, lineHeight: 18 },
  botonProductos: { minHeight: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#ffe0e3', borderRadius: 13, backgroundColor: '#fff' },
  enlace: { color: '#ed0016', fontSize: 12, fontWeight: '800' },
  resumen: { minHeight: 76, marginBottom: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eceef2', borderRadius: 18, backgroundColor: '#fff', elevation: 2, shadowColor: '#222', shadowOpacity: 0.04, shadowRadius: 7, shadowOffset: { width: 0, height: 2 } },
  iconoResumen: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#ffe7e9' },
  textoResumen: { flex: 1, marginLeft: 11 },
  totalResumen: { color: '#242630', fontSize: 19, fontWeight: '900' },
  detalleResumen: { marginTop: 2, color: '#777b86', fontSize: 11 },
  resumenPendientes: { alignItems: 'flex-end' },
  numeroPendientes: { color: '#c90014', fontSize: 17, fontWeight: '900' },
  etiquetaPendientes: { marginTop: 2, color: '#777b86', fontSize: 10 },
  buscador: { height: 46, marginBottom: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#eceef2', borderRadius: 13, backgroundColor: '#fff' },
  inputBusqueda: { flex: 1, color: '#242630', fontSize: 13 },
  carruselFiltros: { height: 48, flexGrow: 0, flexShrink: 0, marginBottom: 12 },
  filtros: { alignItems: 'center', gap: 8, paddingRight: 18 },
  filtro: { height: 36, flexShrink: 0, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#eceef2', borderRadius: 12, backgroundColor: '#fff' },
  filtroActivo: { borderColor: '#ed0016', backgroundColor: '#ed0016' },
  textoFiltro: { color: '#666b75', fontSize: 11, fontWeight: '700' },
  textoFiltroActivo: { color: '#fff' },
  contadorFiltro: { minWidth: 18, paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden', borderRadius: 8, backgroundColor: '#f1f1f3', color: '#666b75', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  contadorFiltroActivo: { backgroundColor: '#fff', color: '#c90014' },
  tituloLista: { marginBottom: 11, color: '#242630', fontSize: 15, fontWeight: '800' },
  cantidadLista: { color: '#858995', fontSize: 13, fontWeight: '600' },
  pedidoCard: { marginBottom: 13, padding: 15, borderWidth: 1, borderColor: '#eceef2', borderRadius: 18, backgroundColor: '#fff', elevation: 2, shadowColor: '#222', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  pedidoHeader: { minHeight: 53, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  encabezadoCliente: { flex: 1, marginRight: 8 },
  filaCliente: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconoCliente: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#fff0f1' },
  encabezadoEstado: { alignItems: 'flex-end', gap: 6 },
  flechaPedido: { marginRight: 4 },
  pedidoNumero: { flex: 1, color: '#242630', fontSize: 14, fontWeight: '800' },
  filaFecha: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  pedidoFecha: { color: '#858995', fontSize: 10 },
  filaDetalle: { marginTop: 5, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  pedidoDetalle: { flex: 1, color: '#666b75', fontSize: 11, lineHeight: 16 },
  productosPedido: { marginTop: 11, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eceef2' },
  productoPedido: { marginVertical: 6, flexDirection: 'row', alignItems: 'center' },
  imagenProducto: { width: 52, height: 52, borderRadius: 13 },
  imagenVacia: { backgroundColor: '#f2f2f2' },
  detalleProducto: { flex: 1, marginHorizontal: 10 },
  nombreProducto: { color: '#242630', fontSize: 13, fontWeight: '700' },
  textoProducto: { marginTop: 3, color: '#858995', fontSize: 11 },
  subtotalProducto: { color: '#242630', fontSize: 12, fontWeight: '700' },
  filaTotal: { marginTop: 13, paddingTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eceef2' },
  etiquetaTotal: { color: '#242630', fontSize: 13, fontWeight: '800' },
  totalPedido: { color: '#c90014', fontWeight: '900', fontSize: 18 },
  estadoPedido: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: '#fff1d6' },
  estadoPedidoEnviado: { backgroundColor: '#e6f5ec' },
  estadoPedidoRecibido: { backgroundColor: '#e9edff' },
  estadoPedidoPreparacion: { backgroundColor: '#fff2d8' },
  estadoPedidoCancelado: { backgroundColor: '#fbe7e7' },
  estadoTexto: { color: '#8c5a00', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  estadoTextoEnviado: { color: '#0b7d43' },
  estadoTextoRecibido: { color: '#2544b4' },
  estadoTextoPreparacion: { color: '#8a5d00' },
  estadoTextoCancelado: { color: '#b42318' },
  botonesContainer: { marginTop: 12, gap: 8 },
  botonEstado: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, backgroundColor: '#ed0016' },
  botonCancelar: { borderWidth: 1, borderColor: '#f3c4c7', backgroundColor: '#fff5f5' },
  botonTexto: { color: '#fff', fontSize: 12, fontWeight: '800' },
  botonCancelarTexto: { color: '#c90014' },
  vacio: { minHeight: 230, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, borderWidth: 1, borderColor: '#eceef2', borderRadius: 18, backgroundColor: '#fff' },
  iconoVacio: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: '#ffe7e9' },
  tituloVacio: { marginTop: 15, color: '#242630', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  textoVacio: { marginTop: 6, color: '#777b86', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
