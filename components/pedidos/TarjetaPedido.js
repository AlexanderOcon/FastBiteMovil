import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const precio = Math.trunc(Number(valor));
  return `C$${Number.isFinite(precio) ? precio.toLocaleString('es-NI') : '0'}`;
}

function ProductoPedido({ producto, styles }) {
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
        {producto.esOferta && Array.isArray(producto.productosIncluidos) && (
          <Text style={styles.textoSecundario} numberOfLines={2}>
            Incluye: {producto.productosIncluidos.map((item) => item.nombre).filter(Boolean).join(', ')}
          </Text>
        )}
        <Text style={styles.textoSecundario}>
          {cantidad} × {formatearPrecio(precio)}
        </Text>
      </View>
      <Text style={styles.subtotalProducto}>{formatearPrecio(precio * cantidad)}</Text>
    </View>
  );
}

export default function TarjetaPedido({ pedido, nombreUsuario, onRecibir, mostrarBotonRecibido, styles }) {
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
                styles={styles}
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
