// Importa React y hooks para cargar datos y conservar valores de la pantalla.
import React, { useEffect, useState } from 'react';
// Importa los componentes nativos usados para construir el catálogo.
import {Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View,} from 'react-native';
// Permite cambiar el aspecto de la barra de estado del dispositivo.
import { StatusBar } from 'expo-status-bar';
// Proporciona el icono de lupa para el buscador.
import { Ionicons } from '@expo/vector-icons';
// Importa las funciones necesarias para leer documentos de Firestore.
import { collection, getDocs } from 'firebase/firestore';
// Importa la instancia configurada de la base de datos.
import { db } from "../firebase/config";
// Importa el componente reutilizable que representa un producto.
import Produtos from '../components/Produtos';

// Muestra productos y permite filtrarlos; navigation abre su pantalla de detalle.
export default function Catalogo({ navigation }) {
  // Guarda los documentos de productos descargados desde Firestore.
  const [productos, setProductos] = useState([]);
  // Guarda la categoría seleccionada; inicia mostrando todos los productos.
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  // Guarda lo que la persona escribe en el campo de búsqueda.
  const [busqueda, setBusqueda] = useState('');
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
  // Descarga los productos y adapta sus campos al formato que usa la interfaz.
  const obtenerProductos = async () => {
    // Captura errores para que un problema de Firebase no cierre la pantalla.
    try {
      // Lee todos los documentos de la colección "productos".
      const consulta = await getDocs(collection(db, 'productos'));
      // Crea la lista que se llenará con cada documento.
      const datos = [];

      // Recorre todos los documentos devueltos por Firestore.
      consulta.forEach((documento) => {
        // Extrae los campos almacenados en el documento actual.
        const producto = documento.data();
        // Lee el nombre de categoría embebido o usa otros formatos disponibles.
        const nombreCategoria =
          producto.categoria_id?.nombre || producto.categoria_id || producto.categoria || '';

  // Añade el id y normaliza los campos que utiliza el catálogo.
        datos.push({
          id: documento.id,
          ...producto,
          categoria: String(nombreCategoria).trim(),
          imagen: producto.image || producto.imagen || '',
          descripcion:
            producto.descripcion || producto.categoria_id?.descripcion || '',
          rating: producto.rating || producto.calificacion || '5.0',
        });
      });

      // Guarda la lista completa para actualizar la interfaz.
      setProductos(datos);
    } catch (error) {
      // Imprime el error para facilitar su diagnóstico.
      console.error('Error obteniendo productos:', error);
    }
  };

  // Solicita los productos una vez cuando se monta esta pantalla.
  useEffect(() => {
    obtenerProductos();
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
        {/* Contiene el mensaje y la imagen de la promoción. */}
        <View style={styles.oferta}>
          <View>
            {/* Etiqueta que identifica la promoción. */}
            <Text style={styles.ofertaLabel}>OFERTA DEL DÍA</Text>
            {/* Texto principal de la oferta, con un salto de línea visual. */}
            <Text style={styles.ofertaTitulo}>2x1 en{'\n'}Hamburgesas</Text>

            {/* Botón visual que muestra cuándo es válida la promoción. */}
            <Pressable style={styles.ofertaBoton}>
              <Text style={styles.ofertaBotonTexto}>Válido hoy</Text>
            </Pressable>
          </View>

          {/* Presenta la tercera imagen disponible, cuando ya fue cargada. */}
          {productos[2]?.imagen ? (
            <Image source={{ uri: productos[2].imagen }} style={styles.ofertaImagen} />
          ) : null}
        </View>

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
  // Estiliza el banner promocional y alinea texto e imagen.
  oferta: {
    margin: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: '#ff2639',
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
  // Estiliza y posiciona el botón de la promoción.
  ofertaBoton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#ffd000',
  },
  // Define el color y el tamaño del texto del botón promocional.
  ofertaBotonTexto: { 
    color: '#715000', 
    fontSize: 10, 
    fontWeight: '700' },
  // Ajusta el tamaño y redondeado de la imagen promocional.
  ofertaImagen: { 
    width: 78, 
    height: 78, 
    borderRadius: 10 
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