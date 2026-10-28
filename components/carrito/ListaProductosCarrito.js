import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function formatearPrecio(valor) {
  const precio = Math.trunc(Number(valor));
  return `C$${Number.isFinite(precio) ? precio.toLocaleString('es-NI') : '0'}`;
}

export default function ListaProductosCarrito({
  productos,
  actualizarCantidadCarrito,
  quitarDelCarrito,
}) {
  return (
    <ScrollView style={styles.lista}>
      {productos.map((producto) => {
        const id = producto.id || producto.nombre;
        const cantidad = Number(producto.cantidad);
        return (
          <View key={id} style={styles.producto}>
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
              {producto.esOferta && Array.isArray(producto.productosIncluidos) && (
                <Text style={styles.productosIncluidos} numberOfLines={2}>
                  Incluye: {producto.productosIncluidos.map((item) => item.nombre).filter(Boolean).join(', ')}
                </Text>
              )}
              <View style={styles.filaCantidad}>
                <View style={styles.controlCantidad}>
                  <Pressable
                    style={[styles.botonCantidad, cantidad <= 1 && styles.botonCantidadDeshabilitado]}
                    onPress={() => actualizarCantidadCarrito(id, cantidad - 1)}
                    disabled={cantidad <= 1}
                    accessibilityRole="button"
                    accessibilityLabel={`Disminuir cantidad de ${producto.nombre}`}
                  >
                    <Ionicons name="remove" size={16} color={cantidad <= 1 ? '#bfc1c8' : '#c90014'} />
                  </Pressable>
                  <Text style={styles.cantidad}>{producto.cantidad}</Text>
                  <Pressable
                    style={styles.botonCantidad}
                    onPress={() => actualizarCantidadCarrito(id, cantidad + 1)}
                    accessibilityRole="button"
                    accessibilityLabel={`Aumentar cantidad de ${producto.nombre}`}
                  >
                    <Ionicons name="add" size={16} color="#c90014" />
                  </Pressable>
                </View>
                <Text style={styles.precioUnitario}>{formatearPrecio(producto.precio)} c/u</Text>
              </View>
              <Text style={styles.precio}>{formatearPrecio(Number(producto.precio) * cantidad)}</Text>
            </View>
            <Pressable
              style={styles.quitarBoton}
              onPress={() => quitarDelCarrito(id)}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${producto.nombre} del carrito`}
            >
              <Ionicons name="trash-outline" size={21} color="#ed0016" />
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  lista: { flex: 1, marginHorizontal: -2, paddingHorizontal: 2 },
  producto: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 18,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#222',
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  imagen: { width: 72, height: 76, borderRadius: 13 },
  imagenVacia: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff0f1' },
  detalle: { flex: 1, marginLeft: 13 },
  quitarBoton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
    borderRadius: 13,
    backgroundColor: '#fff0f1',
  },
  nombre: { marginBottom: 3, color: '#242630', fontSize: 15, fontWeight: '800' },
  categoriaProducto: { marginBottom: 3, color: '#858995', fontSize: 11 },
  productosIncluidos: { marginBottom: 5, color: '#555965', fontSize: 10, lineHeight: 14 },
  filaCantidad: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 3 },
  controlCantidad: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botonCantidad: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1c5ca',
    borderRadius: 9,
    backgroundColor: '#fff7f8',
  },
  botonCantidadDeshabilitado: { borderColor: '#e8e9ed', backgroundColor: '#f5f6f8' },
  cantidad: { minWidth: 15, color: '#50535e', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  precioUnitario: { color: '#858995', fontSize: 11 },
  precio: { marginTop: 5, color: '#c90014', fontSize: 14, fontWeight: '800' },
});
