import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { collection, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

function obtenerEtiquetaEstado(estado) {
  const valor = String(estado || 'pendiente').toLowerCase();
  if (valor === 'cancelado') return 'Pedido Cancelado';
  if (valor === 'en-preparacion' || valor === 'en_preparacion' || valor === 'preparacion') return 'Recibido, En preparación';
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
  const precio = Number(valor);
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

  return (
    <ScrollView contentContainerStyle={styles.contenedor}>
      <View style={styles.encabezado}>
        <View>
          <Text style={styles.titulo}>Pedidos del cliente</Text>
          <Text style={styles.subtitulo}>Revisa todos los pedidos y cambia su estado.</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('AdminProductos')}>
          <Text style={styles.enlace}>Productos</Text>
        </Pressable>
      </View>

      {pedidos.length === 0 ? (
        <Text style={styles.vacio}>Todavía no hay pedidos realizados.</Text>
      ) : (
        pedidos.map((pedido) => {
          const estadoActual = String(pedido.estado || 'pendiente').toLowerCase();
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
                  <Text style={styles.pedidoNumero}>{nombreCliente}</Text>
                  <Text style={styles.pedidoFecha}>{formatearFecha(pedido.fecha)}</Text>
                  <Text style={styles.detalleToggle}>{expandido ? 'Ocultar productos' : 'Toca para ver productos'}</Text>
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
                </View>
              </Pressable>

              {!!pedido.correo && <Text style={styles.pedidoDetalle}>Correo: {pedido.correo}</Text>}
              {!!direccion.direccion && <Text style={styles.pedidoDetalle}>Dirección: {direccion.direccion}</Text>}
              {!!direccion.telefono && <Text style={styles.pedidoDetalle}>Tel.: {direccion.telefono}</Text>}

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

              <Text style={styles.totalPedido}>{formatearPrecio(pedido.total)}</Text>

              {estadoActual === 'pendiente' && (
                <View style={styles.botonesContainer}>
                  <Pressable style={styles.botonEstado} onPress={() => cambiarEstadoPedido(pedido, 'en-preparacion')}>
                    <Text style={styles.botonTexto}>Recibido, En preparación</Text>
                  </Pressable>
                  <Pressable style={[styles.botonEstado, styles.botonCancelar]} onPress={() => cambiarEstadoPedido(pedido, 'cancelado')}>
                    <Text style={[styles.botonTexto, styles.botonCancelarTexto]}>Cancelar Pedido</Text>
                  </Pressable>
                </View>
              )}

              {estadoActual === 'en-preparacion' && (
                <View style={styles.botonesContainer}>
                  <Pressable style={styles.botonEstado} onPress={() => cambiarEstadoPedido(pedido, 'enviado')}>
                    <Text style={styles.botonTexto}>Marcar como enviado</Text>
                  </Pressable>
                  <Pressable style={[styles.botonEstado, styles.botonCancelar]} onPress={() => cambiarEstadoPedido(pedido, 'cancelado')}>
                    <Text style={[styles.botonTexto, styles.botonCancelarTexto]}>Cancelar Pedido</Text>
                  </Pressable>
                </View>
              )}

              {estadoActual === 'enviado' && (
                <Pressable style={[styles.botonEstado, styles.botonCancelar]} onPress={() => cambiarEstadoPedido(pedido, 'cancelado')}>
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
  contenedor: { flexGrow: 1, padding: 20, backgroundColor: '#f7f7f7' },
  encabezado: { marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { color: '#29292e', fontSize: 23, fontWeight: '800' },
  subtitulo: { marginTop: 4, color: '#666' },
  enlace: { paddingVertical: 6, color: '#ed0016', fontWeight: '700' },
  pedidoCard: { marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: '#fff' },
  pedidoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  encabezadoCliente: { flex: 1, marginRight: 8 },
  encabezadoEstado: { alignItems: 'flex-end' },
  pedidoNumero: { color: '#29292e', fontSize: 15, fontWeight: '800' },
  pedidoFecha: { marginTop: 4, color: '#666', fontSize: 12 },
  detalleToggle: { marginTop: 5, color: '#ed0016', fontSize: 12, fontWeight: '700' },
  pedidoDetalle: { marginTop: 4, color: '#555', fontSize: 12 },
  productosPedido: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  productoPedido: { marginVertical: 6, flexDirection: 'row', alignItems: 'center' },
  imagenProducto: { width: 50, height: 50, borderRadius: 8 },
  imagenVacia: { backgroundColor: '#f2f2f2' },
  detalleProducto: { flex: 1, marginHorizontal: 10 },
  nombreProducto: { color: '#29292e', fontSize: 13, fontWeight: '700' },
  textoProducto: { marginTop: 3, color: '#777', fontSize: 11 },
  subtotalProducto: { color: '#29292e', fontSize: 12, fontWeight: '700' },
  totalPedido: { marginTop: 10, color: '#ed0016', fontWeight: '800', fontSize: 16 },
  estadoPedido: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#fff1d6' },
  estadoPedidoEnviado: { backgroundColor: '#e7f5ec' },
  estadoPedidoRecibido: { backgroundColor: '#e9edff' },
  estadoPedidoPreparacion: { backgroundColor: '#fff2d8' },
  estadoPedidoCancelado: { backgroundColor: '#fbe7e7' },
  estadoTexto: { color: '#8c5a00', fontSize: 12, fontWeight: '700' },
  estadoTextoEnviado: { color: '#0b7d43' },
  estadoTextoRecibido: { color: '#2544b4' },
  estadoTextoPreparacion: { color: '#8a5d00' },
  estadoTextoCancelado: { color: '#b42318' },
  botonesContainer: { marginTop: 12, gap: 8 },
  botonEstado: { paddingVertical: 11, alignItems: 'center', borderRadius: 10, backgroundColor: '#ed0016' },
  botonCancelar: { backgroundColor: '#d92d20' },
  botonTexto: { color: '#fff', fontWeight: '700' },
  botonCancelarTexto: { color: '#fff' },
  vacio: { color: '#666' },
});
