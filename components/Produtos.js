// Importa React para declarar el componente reutilizable.
import React from 'react';
// Importa elementos nativos para mostrar imagen, textos, tarjeta y estilos.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

// Representa un producto; las props contienen sus datos y su acción al pulsarlo.
export default function Produtos({imagen,nombre,descripcion,precio,rating,onPress,}) {
  // Devuelve toda la tarjeta como un área táctil.
  return (
    // Ejecuta la función recibida cuando el usuario pulsa la tarjeta.
    <Pressable style={styles.card} onPress={onPress}>
      {/* Agrupa la imagen y la etiqueta de calificación. */}
      <View>
        {/* Carga la imagen remota usando la URL recibida por props. */}
        <Image source={{ uri: imagen }} style={styles.imagen} />

        {/* Coloca la calificación superpuesta en una esquina de la imagen. */}
        <View style={styles.rating}>
          {/* Muestra el símbolo de estrella. */}
          <Text style={styles.star}>★</Text>
          {/* Muestra el valor numérico de calificación. */}
          <Text style={styles.ratingText}>{rating}</Text>
        </View>
      </View>

      {/* Agrupa los datos de texto que aparecen debajo de la imagen. */}
      <View style={styles.contenido}>
        {/* Limita el nombre a una línea para mantener uniforme la tarjeta. */}
        <Text style={styles.nombre} numberOfLines={1}>
          {nombre}
        </Text>

  {/* Limita la descripción a dos líneas para evitar tarjetas desiguales. */}
        <Text style={styles.descripcion} numberOfLines={2}>
          {descripcion}
        </Text>

        {/* Agrupa el precio en la parte inferior de la tarjeta. */}
        <View style={styles.footer}>
          {/* Muestra el precio en córdobas. */}
          <Text style={styles.precio}>C${precio}</Text>

        </View>
      </View>
    </Pressable>
  );
}

// Define tamaños, colores, espaciado y sombras para la tarjeta del producto.
const styles = StyleSheet.create({
  // Define el ancho de tarjeta, el margen y la apariencia de superficie.
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
  // Hace que la imagen ocupe el ancho de la tarjeta con altura fija.
  imagen: {
    width: '100%',
    height: 125,
  },
  // Posiciona y da fondo a la etiqueta de calificación.
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
  // Estiliza la estrella que acompaña a la calificación.
  star: {
    color: '#ffc400',
    fontSize: 11,
  },
  // Ajusta el tamaño y color del valor de calificación.
  ratingText: {
    marginLeft: 2,
    color: '#555',
    fontSize: 10,
  },
  // Añade espacio interno alrededor de la información del producto.
  contenido: {
    padding: 10,
  },
  // Estiliza el nombre del producto.
  nombre: {
    color: '#3e3e45',
    fontSize: 13,
    fontWeight: '800',
  },
  // Controla altura, color y separación de la descripción.
  descripcion: {
    height: 30,
    marginTop: 4,
    color: '#999',
    fontSize: 10,
    lineHeight: 14,
  },
  // Organiza en fila los elementos del pie de la tarjeta.
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  // Resalta el precio con el color principal de la aplicación.
  precio: {
    color: '#ed0016',
    fontSize: 14,
    fontWeight: '800',
  },
  // Define el aspecto del botón circular opcional de la tarjeta.
  boton: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#ed0016',
  },
  // Define el color y tamaño del símbolo más del botón opcional.
  mas: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 21,
  },
});