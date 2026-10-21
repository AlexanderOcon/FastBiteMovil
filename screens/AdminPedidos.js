import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
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

export default function AdminPedidos({ navigation }) {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => onSnapshot(
    collection(db, 'pedido'),
    (snapshot) => {
      const resultados = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      resultados.sort((primero, segundo) => {
        const tiempoUno = primero.fecha?.toDate ? primero.fecha.toDate().getTime() : Date.parse(primero.fecha || 0) || 0;
        const tiempoDos = segundo.fecha?.toDate ? segundo.fecha.toDate().getTime() : Date.parse(segundo.fecha || 0) || 0;
        return tiempoDos - tiempoUno;
      });
      setPedidos(resultados);
    },
    (error) => {
      console.error('Error cargando pedidos para administración:', error);
      Alert.alert('No se pudieron cargar los pedidos', 'Verifica los permisos de Firestore.');
    },
  ), []);

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

          return (
            <View key={pedido.id} style={styles.pedidoCard}>
              <View style={styles.pedidoHeader}>
                <View>
                  <Text style={styles.pedidoNumero}>Pedido #{String(pedido.id).slice(0, 7)}</Text>
                  <Text style={styles.pedidoFecha}>{formatearFecha(pedido.fecha)}</Text>
                </View>
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

              {!!pedido.correo && <Text style={styles.pedidoDetalle}>Cliente: {pedido.correo}</Text>}
              {!!pedido.usuarioId && <Text style={styles.pedidoDetalle}>UID: {pedido.usuarioId}</Text>}
              {!!direccion.direccion && <Text style={styles.pedidoDetalle}>Dirección: {direccion.direccion}</Text>}
              {!!direccion.telefono && <Text style={styles.pedidoDetalle}>Tel.: {direccion.telefono}</Text>}

              {productosPedido.length > 0 && (
                <View style={styles.productosPedido}>
                  {productosPedido.map((producto, indice) => (
                    <Text key={`${pedido.id}-${indice}`} style={styles.productoPedidoTexto}>
                      {producto.cantidad || 1} × {producto.nombre || 'Producto'}
                    </Text>
                  ))}
                </View>
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
  pedidoNumero: { color: '#29292e', fontSize: 15, fontWeight: '800' },
  pedidoFecha: { marginTop: 4, color: '#666', fontSize: 12 },
  pedidoDetalle: { marginTop: 4, color: '#555', fontSize: 12 },
  productosPedido: { marginTop: 8 },
  productoPedidoTexto: { color: '#29292e', fontSize: 12, marginBottom: 4 },
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
