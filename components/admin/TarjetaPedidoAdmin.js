import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TarjetaPedidoAdmin({
  pedido,
  nombresUsuarios,
  pedidoExpandido,
  setPedidoExpandido,
  cambiarEstadoPedido,
  normalizarEstadoPedido,
  obtenerEtiquetaEstado,
  formatearFecha,
  formatearPrecio,
  styles,
}) {
  const estadoActual = normalizarEstadoPedido(pedido.estado);
  const direccion = pedido.direccionEntrega || {};
  const productos = Array.isArray(pedido.productos) ? pedido.productos : [];
  const expandido = pedidoExpandido === pedido.id;
  const nombreCliente = pedido.usuarioNombre
    || nombresUsuarios[pedido.usuarioId]
    || pedido.correo
    || 'Cliente sin nombre';

  return (
    <View style={styles.pedidoCard}>
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

      {expandido && productos.length > 0 && (
        <View style={styles.productosPedido}>
          {productos.map((producto, indice) => {
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
                  {producto.esOferta && Array.isArray(producto.productosIncluidos) && (
                    <Text style={styles.textoProducto} numberOfLines={2}>
                      Incluye: {producto.productosIncluidos.map((item) => item.nombre).filter(Boolean).join(', ')}
                    </Text>
                  )}
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
      {expandido && productos.length === 0 && (
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
}
