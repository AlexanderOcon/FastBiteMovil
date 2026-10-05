import React, { useContext, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CarritoContext } from '../context/CarritoContext';

export default function DetalleProductos({ route }) {
  const { nombre, precio, categoria, imagen, descripcion, rating } = route.params;
  const { agregarAlCarrito } = useContext(CarritoContext);
  const [cantidad, setCantidad] = useState(1);
  const subtotal = (Number(precio) || 0) * cantidad;

  const manejarAgregarAlCarrito = () => {
    agregarAlCarrito(route.params, cantidad);
    Alert.alert(
      'Agregado al carrito',
      `${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'} de ${nombre} se agregaron correctamente.`,
    );
  };

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

        <View style={styles.cantidadFila}>
          <Text style={styles.cantidadTitulo}>Cantidad</Text>
          <View style={styles.selectorCantidad}>
            <Pressable
              style={[styles.controlCantidad, cantidad === 1 && styles.controlDeshabilitado]}
              onPress={() => setCantidad((actual) => Math.max(1, actual - 1))}
              disabled={cantidad === 1}
              accessibilityRole="button"
              accessibilityLabel="Reducir cantidad"
            >
              <Ionicons name="remove" size={20} color={cantidad === 1 ? '#aaa' : '#ed0016'} />
            </Pressable>
            <Text style={styles.cantidadValor}>{cantidad}</Text>
            <Pressable
              style={styles.controlCantidad}
              onPress={() => setCantidad((actual) => actual + 1)}
              accessibilityRole="button"
              accessibilityLabel="Aumentar cantidad"
            >
              <Ionicons name="add" size={20} color="#ed0016" />
            </Pressable>
          </View>
        </View>
        <Text style={styles.subtotal}>Subtotal: C${subtotal}</Text>

        <Pressable
          style={styles.boton}
          onPress={manejarAgregarAlCarrito}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>Agregar al carrito</Text>
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
  cantidadFila: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cantidadTitulo: {
    color: '#333',
    fontSize: 16,
    fontWeight: '700',
  },
  selectorCantidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlCantidad: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#fff1f2',
  },
  controlDeshabilitado: {
    backgroundColor: '#f1f1f1',
  },
  cantidadValor: {
    minWidth: 20,
    color: '#29292e',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtotal: {
    marginTop: 12,
    color: '#ed0016',
    fontSize: 16,
    fontWeight: '700',
  },
  boton: {
    marginTop: 24,
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