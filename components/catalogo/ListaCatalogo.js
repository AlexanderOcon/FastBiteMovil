import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Produtos from '../Produtos';

const iconosCategoria = {
  Alitas: '🍗',
  Hamburgesas: '🍔',
  Papas: '🍟',
  Bebidas: '🥤',
};

export default function ListaCatalogo({
  categorias,
  categoriaActiva,
  setCategoriaActiva,
  productosFiltrados,
  navigation,
}) {
  return (
    <View style={styles.contenido}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categorias}
      >
        {categorias.map((categoria) => (
          <Pressable
            key={categoria}
            style={[
              styles.categoria,
              categoriaActiva === categoria && styles.categoriaActiva,
            ]}
            onPress={() => setCategoriaActiva(categoria)}
            accessibilityRole="button"
            accessibilityState={{ selected: categoriaActiva === categoria }}
          >
            <Text>{iconosCategoria[categoria] || '🍽️'}</Text>
            <Text style={styles.textoCategoria}>{categoria}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.tituloSeccion}>
        {categoriaActiva === 'Todos' ? 'Todos los productos' : `Productos de ${categoriaActiva}`}
      </Text>

      <View style={styles.productos}>
        {productosFiltrados.map((producto) => (
          <Produtos
            key={producto.id}
            nombre={producto.nombre}
            categoria={producto.categoria}
            precio={producto.precio}
            rating={producto.rating}
            descripcion={producto.descripcion}
            imagen={producto.imagen}
            onPress={() => navigation.navigate('Detalle', producto)}
          />
        ))}
      </View>
      {productosFiltrados.length === 0 && (
        <Text style={styles.sinResultados}>No se encontraron productos.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingHorizontal: 16 },
  categorias: { gap: 8, paddingBottom: 15 },
  categoria: {
    height: 36,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 18,
    backgroundColor: '#eeeef2',
  },
  categoriaActiva: { backgroundColor: '#ffc400' },
  textoCategoria: { color: '#85858d', fontSize: 12 },
  tituloSeccion: {
    marginBottom: 10,
    color: '#45454d',
    fontSize: 14,
    fontWeight: '600',
  },
  productos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  sinResultados: {
    paddingVertical: 20,
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
  },
});
