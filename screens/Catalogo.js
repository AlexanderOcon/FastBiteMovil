import React, { useEffect, useState } from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View,} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from "../firebase/config";
import Produtos from '../components/producto/Produtos';

export default function Catalogo({ navigation }) {
  
  const [productos, setProductos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const categorias = [
    'Todos',
    ...new Set(productos.map((producto) => producto.categoria).filter(Boolean)),
  ];
  const iconosCategoria = {
    Alitas: '🍗',
    Hamburgesas: '🍔',
    Papas: '🍟',
    Bebidas: '🥤',
  };
  const obtenerProductos = async () => {
    try {
      const consulta = await getDocs(collection(db, 'productos'));
      const datos = [];

      consulta.forEach((documento) => {
        const producto = documento.data();
        const nombreCategoria =
          producto.categoria_id?.nombre || producto.categoria_id || producto.categoria || '';

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

      setProductos(datos);
    } catch (error) {
      console.error('Error obteniendo productos:', error);
    }
  };

  useEffect(() => {
    obtenerProductos();
  }, []);

  const productosFiltrados = productos.filter((producto) => {
    const coincideCategoria =
      categoriaActiva === 'Todos' || producto.categoria === categoriaActiva;
    const textoProducto = `${producto.nombre || ''} ${producto.categoria || ''} ${producto.descripcion || ''}`;
    const coincideBusqueda = textoProducto
      .toLowerCase()
      .includes(busqueda.trim().toLowerCase());

    return coincideCategoria && coincideBusqueda;
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#ed0016" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.oferta}>
          <View>
            <Text style={styles.ofertaLabel}>OFERTA DEL DÍA</Text>
            <Text style={styles.ofertaTitulo}>2x1 en{'\n'}Hamburgesas</Text>

            <Pressable style={styles.ofertaBoton}>
              <Text style={styles.ofertaBotonTexto}>Válido hoy</Text>
            </Pressable>
          </View>

          {productos[2]?.imagen ? (
            <Image source={{ uri: productos[2].imagen }} style={styles.ofertaImagen} />
          ) : null}
        </View>

        <View style={styles.contenido}>
          <View style={styles.buscador}>
            <Ionicons name="search-outline" size={18} color="#85858d" />
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  buscador: {
    height: 46,
    marginBottom: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f1f1f3',
  },
  input: { 
    flex: 1, 
    marginLeft: 8, 
    color: '#29292e', 
    fontSize: 14 
  },
  categorias: { 
    gap: 8, 
    paddingBottom: 15, 
    paddingRight: 12 
  },
  container: { 
    flex: 1, 
    backgroundColor: '#f7f7f7' },
  oferta: {
    margin: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: '#ff2639',
  },
  ofertaLabel: { 
    color: '#ffd9d9', 
    fontSize: 9 },
  ofertaTitulo: {
    marginVertical: 4,
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
  ofertaBoton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#ffd000',
  },
  ofertaBotonTexto: { 
    color: '#715000', 
    fontSize: 10, 
    fontWeight: '700' },
  ofertaImagen: { 
    width: 78, 
    height: 78, 
    borderRadius: 10 
  },
  contenido: { 
    paddingHorizontal: 16 
  },
  categorias: { 
    gap: 8, 
    paddingBottom: 15 
  },
  categoria: {
    height: 36,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 18,
    backgroundColor: '#eeeef2',
  },
  categoriaActiva: { 
    backgroundColor: '#ffc400' 
  },
  textoCategoria: { 
    color: '#85858d', 
    fontSize: 12 },
  tituloSeccion: {
    marginBottom: 10,
    color: '#45454d',
    fontSize: 14,
    fontWeight: '600',
  },
  productos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sinResultados: {
    paddingVertical: 20,
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
  },
});