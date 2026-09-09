import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Produtos from '../components/producto/Produtos';

const productos = [
  {
    nombre: 'Alitas BBQ',
    categoria: 'Alitas',
    precio: '99',
    rating: '4.9',
    descripcion: 'Alitas crujientes bañadas en salsa BBQ.',
    imagen: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=800',
  },
  {
    nombre: 'Alitas Picantes',
    categoria: 'Alitas',
    precio: '105',
    rating: '4.8',
    descripcion: 'Alitas doradas con salsa picante especial.',
    imagen: 'https://images.unsplash.com/photo-1608039755401-742486ec6384?w=800',
  },
  {
    nombre: 'Classic Smash',
    categoria: 'Hamburgesas',
    precio: '89',
    rating: '4.8',
    descripcion: 'Carne aplastada, queso cheddar y cebolla.',
    imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  },
  {
    nombre: 'BBQ Doble',
    categoria: 'Hamburgesas',
    precio: '115',
    rating: '4.7',
    descripcion: 'Doble carne, tocino crujiente y salsa BBQ.',
    imagen: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800',
  },
  {
    nombre: 'Papas Clásicas',
    categoria: 'Papas',
    precio: '45',
    rating: '4.6',
    descripcion: 'Papas fritas crujientes con sal.',
    imagen: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800',
  },
  {
    nombre: 'Papas con Queso',
    categoria: 'Papas',
    precio: '65',
    rating: '4.7',
    descripcion: 'Papas crujientes con queso cheddar.',
    imagen: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800',
  },
  {
    nombre: 'Refresco',
    categoria: 'Bebidas',
    precio: '35',
    rating: '4.5',
    descripcion: 'Refresco frío de tu sabor favorito.',
    imagen: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800',
  },
  {
    nombre: 'Limonada',
    categoria: 'Bebidas',
    precio: '40',
    rating: '4.8',
    descripcion: 'Limonada natural y refrescante.',
    imagen: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=800',
  },
];

export default function Catalogo({ navigation }) {
  const [categoriaActiva, setCategoriaActiva] = useState('Alitas');

  const producto1 = productos.find(
    (producto) => producto.categoria === categoriaActiva,
  );

  const producto2 = productos.find(
    (producto, indice) =>
      producto.categoria === categoriaActiva &&
      indice > productos.indexOf(producto1),
  );

  const renderProducto = (producto) => {
    if (!producto) return null;

    return (
      <Produtos
        nombre={producto.nombre}
        categoria={producto.categoria}
        precio={producto.precio}
        rating={producto.rating}
        descripcion={producto.descripcion}
        imagen={producto.imagen}
        onPress={() => navigation.navigate('Detalle', producto)}
      />
    );
  };

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

          <Image source={{ uri: productos[2].imagen }} style={styles.ofertaImagen} />
        </View>

        <View style={styles.contenido}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categorias}
          >
            <Pressable
              style={[styles.categoria, categoriaActiva === 'Alitas' && styles.categoriaActiva]}
              onPress={() => setCategoriaActiva('Alitas')}
            >
              <Text>🍗</Text>
              <Text style={styles.textoCategoria}>Alitas</Text>
            </Pressable>

            <Pressable
              style={[styles.categoria, categoriaActiva === 'Hamburgesas' && styles.categoriaActiva]}
              onPress={() => setCategoriaActiva('Hamburgesas')}
            >
              <Text>🍔</Text>
              <Text style={styles.textoCategoria}>Hamburgesas</Text>
            </Pressable>

            <Pressable
              style={[styles.categoria, categoriaActiva === 'Papas' && styles.categoriaActiva]}
              onPress={() => setCategoriaActiva('Papas')}
            >
              <Text>🍟</Text>
              <Text style={styles.textoCategoria}>Papas</Text>
            </Pressable>

            <Pressable
              style={[styles.categoria, categoriaActiva === 'Bebidas' && styles.categoriaActiva]}
              onPress={() => setCategoriaActiva('Bebidas')}
            >
              <Text>🥤</Text>
              <Text style={styles.textoCategoria}>Bebidas</Text>
            </Pressable>
          </ScrollView>

          <Text style={styles.tituloSeccion}>
            Productos de {categoriaActiva}
          </Text>

          <View style={styles.productos}>
            {renderProducto(producto1)}
            {renderProducto(producto2)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  oferta: {
    margin: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: '#ff2639',
  },
  ofertaLabel: { color: '#ffd9d9', fontSize: 9 },
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
  ofertaBotonTexto: { color: '#715000', fontSize: 10, fontWeight: '700' },
  ofertaImagen: { width: 78, height: 78, borderRadius: 10 },
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
  productos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});