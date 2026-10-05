// Importa React y los hooks para leer el contexto y mantener estado local.
import React, { useContext, useState } from 'react';
// Importa componentes nativos para alertas, imagen, botones, texto, vistas y estilos.
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
// Importa los iconos de más y menos del selector de cantidad.
import { Ionicons } from '@expo/vector-icons';
// Importa el contexto que permite añadir productos al carrito compartido.
import { CarritoContext } from '../context/CarritoContext';

// Muestra la información y las acciones del producto seleccionado.
export default function DetalleProductos({ route }) {
  // Extrae del parámetro de navegación los datos enviados desde el catálogo.
  const { nombre, precio, categoria, imagen, descripcion, rating } = route.params;
  // Obtiene del contexto la función que agrega productos al carrito.
  const { agregarAlCarrito } = useContext(CarritoContext);
  // Guarda la cantidad elegida; cada producto comienza con una unidad.
  const [cantidad, setCantidad] = useState(1);
  // Calcula el subtotal; un precio ausente o inválido se trata como cero.
  const subtotal = (Number(precio) || 0) * cantidad;

  // Agrega al carrito el producto con la cantidad seleccionada.
  const manejarAgregarAlCarrito = () => {
    // Envía el producto completo y la cantidad a la función compartida.
    agregarAlCarrito(route.params, cantidad);
    // Confirma visualmente las unidades que se añadieron.
    Alert.alert(
      'Agregado al carrito',
      `${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'} de ${nombre} se agregaron correctamente.`,
    );
  };

  // Renderiza la pantalla de detalle del producto.
  return (
    // La vista principal contiene la imagen y el contenido del producto.
    <View style={styles.container}>
      {/* Muestra la imagen principal recibida desde el catálogo. */}
      <Image source={{ uri: imagen }} style={styles.imagen} />

      {/* Agrupa los datos del producto y sus acciones. */}
      <View style={styles.contenido}>
        {/* Muestra la categoría del producto. */}
        <Text style={styles.categoria}>{categoria}</Text>
        {/* Muestra el nombre del producto. */}
        <Text style={styles.nombre}>{nombre}</Text>

        {/* Coloca el precio y la calificación en la misma fila. */}
        <View style={styles.fila}>
          <Text style={styles.precio}>C${precio}</Text>
          <Text style={styles.rating}>★ {rating}</Text>
        </View>

        {/* Presenta el encabezado y el texto descriptivo del producto. */}
        <Text style={styles.titulo}>Descripción</Text>
        <Text style={styles.descripcion}>{descripcion}</Text>

        {/* Agrupa la etiqueta y los controles para elegir unidades. */}
        <View style={styles.cantidadFila}>
          <Text style={styles.cantidadTitulo}>Cantidad</Text>
          <View style={styles.selectorCantidad}>
            {/* Reduce la cantidad, manteniendo una unidad como mínimo. */}
            <Pressable
              style={[styles.controlCantidad, cantidad === 1 && styles.controlDeshabilitado]}
              onPress={() => setCantidad((actual) => Math.max(1, actual - 1))}
              disabled={cantidad === 1}
              accessibilityRole="button"
              accessibilityLabel="Reducir cantidad"
            >
              {/* Dibuja el símbolo menos; cambia de color si está deshabilitado. */}
              <Ionicons name="remove" size={20} color={cantidad === 1 ? '#aaa' : '#ed0016'} />
            </Pressable>
            {/* Muestra el número de unidades seleccionado. */}
            <Text style={styles.cantidadValor}>{cantidad}</Text>
            {/* Aumenta la cantidad seleccionada en una unidad. */}
            <Pressable
              style={styles.controlCantidad}
              onPress={() => setCantidad((actual) => actual + 1)}
              accessibilityRole="button"
              accessibilityLabel="Aumentar cantidad"
            >
              {/* Dibuja el símbolo más dentro del control. */}
              <Ionicons name="add" size={20} color="#ed0016" />
            </Pressable>
          </View>
        </View>
        {/* Muestra el precio multiplicado por la cantidad elegida. */}
        <Text style={styles.subtotal}>Subtotal: C${subtotal}</Text>

        {/* Ejecuta la acción de agregar el producto al carrito. */}
        <Pressable
          style={styles.boton}
          onPress={manejarAgregarAlCarrito}
          accessibilityRole="button"
        >
          {/* Texto que identifica la acción del botón. */}
          <Text style={styles.botonTexto}>Agregar al carrito</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Define las reglas visuales de los componentes de esta pantalla.
const styles = StyleSheet.create({
  // Ocupa el espacio disponible y aplica fondo blanco.
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Establece el ancho y alto de la imagen del producto.
  imagen: {
    width: '100%',
    height: 280,
  },
  // Añade espacio interior alrededor de los datos.
  contenido: {
    padding: 24,
  },
  // Estiliza la categoría sobre el nombre.
  categoria: {
    marginBottom: 7,
    color: '#ed0016',
    fontSize: 14,
    fontWeight: '700',
  },
  // Define tamaño, color y grosor del nombre.
  nombre: {
    color: '#29292e',
    fontSize: 29,
    fontWeight: '900',
  },
  // Distribuye precio y calificación horizontalmente.
  fila: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Resalta el precio con el color principal.
  precio: {
    color: '#ed0016',
    fontSize: 25,
    fontWeight: '900',
  },
  // Da forma de etiqueta a la calificación.
  rating: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    color: '#765b00',
    backgroundColor: '#fff1b8',
    fontWeight: '700',
  },
  // Añade separación y jerarquía al título de descripción.
  titulo: {
    marginTop: 30,
    marginBottom: 9,
    color: '#333',
    fontSize: 19,
    fontWeight: '800',
  },
  // Define el aspecto del texto descriptivo.
  descripcion: {
    color: '#777',
    fontSize: 16,
    lineHeight: 24,
  },
  // Alinea la etiqueta y el selector de cantidad en una fila.
  cantidadFila: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Estiliza la palabra que identifica el selector.
  cantidadTitulo: {
    color: '#333',
    fontSize: 16,
    fontWeight: '700',
  },
  // Coloca los controles y el valor de cantidad en horizontal.
  selectorCantidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  // Define el tamaño, centrado y fondo de los botones de cantidad.
  controlCantidad: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#fff1f2',
  },
  // Atenúa el control cuando no se puede reducir más.
  controlDeshabilitado: {
    backgroundColor: '#f1f1f1',
  },
  // Centra y dimensiona el número elegido.
  cantidadValor: {
    minWidth: 20,
    color: '#29292e',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Resalta el subtotal calculado.
  subtotal: {
    marginTop: 12,
    color: '#ed0016',
    fontSize: 16,
    fontWeight: '700',
  },
  // Da forma y color al botón de agregar al carrito.
  boton: {
    marginTop: 24,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: '#ed0016',
  },
  // Define la apariencia del texto del botón principal.
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});