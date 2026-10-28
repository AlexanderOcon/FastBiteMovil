import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function formatearPrecioCordoba(valor) {
  const precio = Math.trunc(Number(valor));
  return `C$${Number.isFinite(precio) ? precio.toLocaleString('es-NI') : '0'}`;
}

export default function ListaProductosAdmin({
  productos,
  totalProductos,
  textoSeguro,
  cargarParaEditar,
  confirmarEliminacion,
  styles,
}) {
  if (productos.length === 0) {
    return (
      <View style={styles.vacio}>
        <View style={styles.iconoVacio}>
          <Ionicons
            name={totalProductos === 0 ? 'fast-food-outline' : 'search-outline'}
            size={30}
            color="#ed0016"
          />
        </View>
        <Text style={styles.tituloVacio}>
          {totalProductos === 0 ? 'Aún no hay productos' : 'No encontramos productos'}
        </Text>
        <Text style={styles.textoVacio}>
          {totalProductos === 0
            ? 'Agrega el primer producto para mostrarlo en el menú.'
            : 'Prueba con otro nombre o categoría.'}
        </Text>
      </View>
    );
  }

  return productos.map((producto) => {
    const nombre = textoSeguro(producto.nombre || '');
    const categoria = textoSeguro(
      producto.categoria?.nombre
      || producto.categoria_id?.nombre
      || producto.categoria_id
      || producto.categoria
      || '',
    );
    const imagen = textoSeguro(producto.imagen || producto.image || '');

    return (
      <View key={producto.id} style={styles.producto}>
        {imagen ? (
          <Image source={{ uri: imagen }} style={styles.imagenProducto} />
        ) : (
          <View style={[styles.imagenProducto, styles.imagenVacia]}>
            <Ionicons name="fast-food-outline" size={23} color="#ed0016" />
          </View>
        )}
        <View style={styles.detalle}>
          <Text style={styles.nombre} numberOfLines={1}>{nombre}</Text>
          {!!categoria && <Text style={styles.secundario} numberOfLines={1}>{categoria}</Text>}
          <Text style={styles.precio}>{formatearPrecioCordoba(producto.precio)}</Text>
        </View>
        <View style={styles.accionesProducto}>
          <Pressable
            style={styles.botonEditar}
            onPress={() => cargarParaEditar(producto)}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${nombre}`}
          >
            <Ionicons name="create-outline" size={17} color="#c90014" />
          </Pressable>
          <Pressable
            style={styles.botonEliminar}
            onPress={() => confirmarEliminacion(producto)}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${nombre}`}
          >
            <Ionicons name="trash-outline" size={17} color="#b42318" />
          </Pressable>
        </View>
      </View>
    );
  });
}
