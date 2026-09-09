import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function DetalleProductos({ route }) {
  const { nombre, precio, categoria, imagen, descripcion, rating } = route.params;

  return (
    <View style={styles.container}>
      <Image source={{ uri: imagen }} style={styles.imagen} />

      <View style={styles.contenido}>
        <Text style={styles.categoria}>{categoria}</Text>
        <Text style={styles.nombre}>{nombre}</Text>

        <View style={styles.fila}>
          <Text style={styles.precio}>C${precio}</Text>
          <Text style={styles.rating}>★ {rating}</Text>
        </View>

        <Text style={styles.titulo}>Descripción</Text>
        <Text style={styles.descripcion}>{descripcion}</Text>

        <Pressable style={styles.boton}>
          <Text style={styles.botonTexto}>Agregar al pedido</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imagen: {
    width: '100%',
    height: 280,
  },
  contenido: {
    padding: 24,
  },
  categoria: {
    marginBottom: 7,
    color: '#ed0016',
    fontSize: 14,
    fontWeight: '700',
  },
  nombre: {
    color: '#29292e',
    fontSize: 29,
    fontWeight: '900',
  },
  fila: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  precio: {
    color: '#ed0016',
    fontSize: 25,
    fontWeight: '900',
  },
  rating: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    color: '#765b00',
    backgroundColor: '#fff1b8',
    fontWeight: '700',
  },
  titulo: {
    marginTop: 30,
    marginBottom: 9,
    color: '#333',
    fontSize: 19,
    fontWeight: '800',
  },
  descripcion: {
    color: '#777',
    fontSize: 16,
    lineHeight: 24,
  },
  boton: {
    marginTop: 35,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: '#ed0016',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});