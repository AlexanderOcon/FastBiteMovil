// Importa React y hooks para cargar datos y conservar valores de la pantalla.
import React, { useEffect, useRef, useState } from 'react';
// Importa los componentes nativos usados para construir el catálogo.
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
// Permite cambiar el aspecto de la barra de estado del dispositivo.
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from "../firebase/config";
import Produtos from '../components/Produtos';

// Muestra productos y permite filtrarlos; navigation abre su pantalla de detalle.
// Convierte cualquier valor recibido desde Firestore en texto seguro para renderizarlo en el catálogo.
function normalizarTexto(valor) {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (Array.isArray(valor)) return valor.join(', ');
  if (valor && typeof valor === 'object') {
    return normalizarTexto(valor.nombre || valor.descripcion || valor.titulo || valor.label || '');
  }
  return '';
}

export default function Catalogo({ navigation }) {
  const { width: anchoVentana } = useWindowDimensions();
  const catalogoEnfocado = useIsFocused();
  const scrollOfertasRef = useRef(null);
  // Guarda los documentos de productos descargados desde Firestore.
  const [productos, setProductos] = useState([]);
  const [indiceOferta, setIndiceOferta] = useState(0);
  // Guarda la categoría seleccionada; inicia mostrando todos los productos.
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  // Guarda lo que la persona escribe en el campo de búsqueda.
  const [busqueda, setBusqueda] = useState('');
  const anchoOferta = anchoVentana - 32;

  useEffect(() => {
    if (!catalogoEnfocado || productos.length < 2) return undefined;

    const siguienteIndice =
      indiceOferta >= productos.length - 1 ? 0 : indiceOferta + 1;
    const temporizador = setTimeout(() => {
      scrollOfertasRef.current?.scrollTo({
        x: siguienteIndice * (anchoOferta + 12),
        animated: true,
      });
      setIndiceOferta(siguienteIndice);
    }, 4000);

    return () => clearTimeout(temporizador);
  }, [anchoOferta, catalogoEnfocado, indiceOferta, productos.length]);
  // Obtiene las categorías únicas de los productos y agrega la opción "Todos".
  const categorias = [
    'Todos',
    ...new Set(productos.map((producto) => producto.categoria).filter(Boolean)),
  ];
  // Asigna un emoji a las categorías conocidas.
  const iconosCategoria = {
    Alitas: '🍗',
    Hamburgesas: '🍔',
    Papas: '🍟',
    Bebidas: '🥤',
  };
  // Adapta los documentos de Firestore al formato que usa la interfaz.
  const adaptarProductos = (consulta) => {
    // Ajusta cada producto para que tenga siempre valores de texto en los campos que se van a mostrar.
    const datos = consulta.docs.map((documento) => {
      const producto = documento.data();
      const nombreCategoria =
        normalizarTexto(producto.categoria_id?.nombre || producto.categoria_id || producto.categoria || '');

      return {
        id: documento.id,
        ...producto,
        categoria: nombreCategoria.trim(),
        imagen: normalizarTexto(producto.image || producto.imagen || ''),
        descripcion: normalizarTexto(producto.descripcion || producto.categoria_id?.descripcion || ''),
        rating: normalizarTexto(producto.rating || producto.calificacion || '5.0'),
      };
    });
    setProductos(datos);
  };

  // Mantiene el catálogo actualizado cuando se agregan o cambian productos.
  useEffect(() => {
    return onSnapshot(
      collection(db, 'productos'),
      adaptarProductos,
      (error) => console.error('Error obteniendo productos:', error),
    );
  }, []);

  // Calcula qué productos coinciden con la categoría y con la búsqueda.
  const productosFiltrados = productos.filter((producto) => {
    // Comprueba la categoría, excepto cuando se eligió "Todos".
    const coincideCategoria =
      categoriaActiva === 'Todos' || producto.categoria === categoriaActiva;
    // Reúne en un texto los campos en los que se permite buscar.
    const textoProducto = `${producto.nombre || ''} ${producto.categoria || ''} ${producto.descripcion || ''}`;
    // Ignora mayúsculas y espacios exteriores al comparar el texto buscado.
    const coincideBusqueda = textoProducto
      .toLowerCase()
      .includes(busqueda.trim().toLowerCase());

    // Devuelve true solo si coinciden categoría y búsqueda.
    return coincideCategoria && coincideBusqueda;
  });

  // Renderiza el catálogo y sus controles.
  return (
    <View style={styles.container}>
      {/* Define el estilo de la barra superior del sistema. */}
      <StatusBar style="light" backgroundColor="#ed0016" />

      {/* Permite recorrer verticalmente todo el contenido del catálogo. */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Permite recorrer productos destacados como tarjetas de oferta. */}
        {productos.length > 0 && (
          <View style={styles.carruselOfertas}>
            <ScrollView
              ref={scrollOfertasRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ofertas}
              snapToInterval={anchoOferta + 12}
              snapToAlignment="start"
              decelerationRate="fast"
              onMomentumScrollEnd={({ nativeEvent }) => {
                setIndiceOferta(
                  Math.round(nativeEvent.contentOffset.x / (anchoOferta + 12)),
                );
              }}
            >
              {productos.map((producto) => (
                <Pressable
                  key={producto.id}
                  style={[styles.oferta, { width: anchoOferta }]}
                  onPress={() => navigation.navigate('Detalle', producto)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${producto.nombre}`}
                >
                  <View style={styles.ofertaInfo}>
                    <Text style={styles.ofertaLabel}>DESTACADO DEL MENÚ</Text>
                    <Text style={styles.ofertaTitulo} numberOfLines={2}>
                      {producto.nombre}
                    </Text>
                    <Text style={styles.ofertaBotonTexto}>
                      {producto.precio !== undefined &&
                      producto.precio !== null &&
                      producto.precio !== ''
                        ? `C$${producto.precio}`
                        : 'Ver producto'}
                    </Text>
                  </View>
                  {producto.imagen ? (
                    <Image
                      source={{ uri: producto.imagen }}
                      style={styles.ofertaImagen}
                    />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
            {productos.length > 1 && (
              <View style={styles.indicadoresOfertas}>
                {productos.map((producto, indice) => (
                  <View
                    key={producto.id}
                    style={[
                      styles.indicadorOferta,
                      indice === Math.min(indiceOferta, productos.length - 1) &&
                        styles.indicadorOfertaActivo,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Agrupa la búsqueda, los filtros y los resultados. */}
        <View style={styles.contenido}>
          {/* Combina el icono de búsqueda y la caja de texto. */}
          <View style={styles.buscador}>
            <Ionicons name="search-outline" size={18} color="#85858d" />
            {/* Actualiza el texto de búsqueda conforme escribe el usuario. */}
            <TextInput
              style={styles.input}
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar producto"
              placeholderTextColor="#999"
              accessibilityLabel="Buscar productos"
              returnKeyType="search"
            />
          </View>

          {/* Hace que las categorías se desplacen horizontalmente. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categorias}
          >
            {/* Dibuja un botón por cada categoría obtenida de los productos. */}
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
                {/* Muestra el emoji asociado o uno genérico si no hay coincidencia. */}
                <Text>{iconosCategoria[categoria] || '🍽️'}</Text>
                {/* Muestra el nombre visible de la categoría. */}
                <Text style={styles.textoCategoria}>{categoria}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Indica la categoría actual o que se muestran todos los productos. */}
          <Text style={styles.tituloSeccion}>
            {categoriaActiva === 'Todos' ? 'Todos los productos' : `Productos de ${categoriaActiva}`}
          </Text>

          {/* Acomoda las tarjetas del resultado en filas. */}
          <View style={styles.productos}>
            {/* Crea una tarjeta por cada producto que pasó los filtros. */}
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
          {/* Avisa cuando ningún producto coincide con los filtros. */}
          {productosFiltrados.length === 0 && (
            <Text style={styles.sinResultados}>No se encontraron productos.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Define las reglas visuales de las secciones y controles del catálogo.
const styles = StyleSheet.create({
  // Da forma al área que contiene la lupa y el texto de búsqueda.
  buscador: {
    height: 46,
    marginBottom: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f1f1f3',
  },
  // Hace que el campo de texto ocupe el espacio horizontal restante.
  input: { 
    flex: 1, 
    marginLeft: 8, 
    color: '#29292e', 
    fontSize: 14 
  },
  // Acomoda los botones de categoría en fila y deja espacio al final.
  categorias: { 
    gap: 8, 
    paddingBottom: 15, 
    paddingRight: 12 
  },
  // Ocupa el espacio disponible y aplica el fondo general de pantalla.
  container: { 
    flex: 1, 
    backgroundColor: '#f7f7f7' },
  // Alinea las tarjetas del carrusel y deja espacio entre ellas.
  carruselOfertas: {
    marginBottom: 14,
    marginTop:10,
  },
  ofertas: {
    gap: 12,
    paddingHorizontal: 16,
  },
  // Estiliza una tarjeta destacada y alinea texto e imagen.
  oferta: {
    minHeight: 112,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: '#ff2639',
  },
  ofertaInfo: {
    flex: 1,
    marginRight: 10,
  },
  // Define el aspecto del rótulo de la promoción.
  ofertaLabel: { 
    color: '#ffd9d9', 
    fontSize: 9 },
  // Destaca el texto principal de la promoción.
  ofertaTitulo: {
    marginVertical: 4,
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
  // Muestra el precio destacado como una etiqueta.
  ofertaBotonTexto: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#ffd000',
    color: '#715000', 
    fontSize: 10, 
    fontWeight: '700',
    overflow: 'hidden',
  },
  // Ajusta el tamaño y redondeado de la imagen promocional.
  ofertaImagen: { 
    width: 78, 
    height: 78, 
    borderRadius: 10 
  },
  indicadoresOfertas: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
  },
  indicadorOferta: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d5d5d8',
  },
  indicadorOfertaActivo: {
    width: 16,
    backgroundColor: '#ed0016',
  },
  // Añade espacio horizontal a la sección de contenido.
  contenido: { 
    paddingHorizontal: 16 
  },
  categorias: { 
    gap: 8, 
    paddingBottom: 15 
  },
  // Define tamaño, distribución y fondo de cada botón de categoría.
  categoria: {
    height: 36,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 18,
    backgroundColor: '#eeeef2',
  },
  // Resalta el botón de la categoría seleccionada.
  categoriaActiva: { 
    backgroundColor: '#ffc400' 
  },
  // Estiliza el texto dentro del botón de categoría.
  textoCategoria: { 
    color: '#85858d', 
    fontSize: 12 },
  // Separa y destaca el encabezado de resultados.
  tituloSeccion: {
    marginBottom: 10,
    color: '#45454d',
    fontSize: 14,
    fontWeight: '600',
  },
  // Distribuye las tarjetas en varias filas con espacio entre columnas.
  productos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  // Centra y estiliza el mensaje que aparece cuando no hay resultados.
  sinResultados: {
    paddingVertical: 20,
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
  },
});