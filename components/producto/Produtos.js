import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function Produtos({
  imagen,
  nombre,
  descripcion,
  precio,
  rating,
  onPress,
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View>
        <Image source={{ uri: imagen }} style={styles.imagen} />

        <View style={styles.rating}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.ratingText}>{rating}</Text>
        </View>
      </View>

      <View style={styles.contenido}>
        <Text style={styles.nombre} numberOfLines={1}>
          {nombre}
        </Text>

        <Text style={styles.descripcion} numberOfLines={2}>
          {descripcion}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.precio}>C${precio}</Text>

        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  imagen: {
    width: '100%',
    height: 125,
  },
  rating: {
    position: 'absolute',
    top: 8,
    right: 7,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  star: {
    color: '#ffc400',
    fontSize: 11,
  },
  ratingText: {
    marginLeft: 2,
    color: '#555',
    fontSize: 10,
  },
  contenido: {
    padding: 10,
  },
  nombre: {
    color: '#3e3e45',
    fontSize: 13,
    fontWeight: '800',
  },
  descripcion: {
    height: 30,
    marginTop: 4,
    color: '#999',
    fontSize: 10,
    lineHeight: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  precio: {
    color: '#ed0016',
    fontSize: 14,
    fontWeight: '800',
  },
  boton: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#ed0016',
  },
  mas: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 21,
  },
});