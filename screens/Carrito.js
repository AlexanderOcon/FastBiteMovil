// Importa hooks para leer el carrito compartido y mantener el estado del envío.
import { useContext, useState } from 'react';
// Importa componentes nativos para alertas, imágenes, botones, listas y estilos.
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// Importa el icono de papelera para quitar artículos.
import { Ionicons } from '@expo/vector-icons';
// Importa métodos de Firestore para crear el pedido y registrar su fecha.
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
// Importa el estado y las acciones compartidas del carrito.
import { CarritoContext } from '../context/CarritoContext';
// Importa la instancia de Firestore configurada en el proyecto.
import { db } from '../firebase/config';

// Muestra los artículos agregados y permite confirmar una compra.
export default function Carrito() {
  // Obtiene los productos y las acciones del carrito desde el contexto.
  const { productosCarrito, quitarDelCarrito, vaciarCarrito } = useContext(CarritoContext);
  // Indica si el pedido se está enviando para evitar envíos duplicados.
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  // Suma el precio de cada producto multiplicado por sus unidades.
  const total = productosCarrito.reduce(
    (suma, producto) => suma + (Number(producto.precio) || 0) * producto.cantidad,
    0,
  );

  // Crea un documento de pedido en Firestore usando el contenido del carrito.
  const guardarPedido = async () => {
    // Activa el indicador de proceso antes de iniciar la solicitud.
    setEnviandoPedido(true);

    // Maneja el resultado de la escritura y los posibles errores.
    try {
      // Agrega un documento nuevo a la colección "pedido".
      await addDoc(collection(db, 'pedido'), {
        // Guarda una copia resumida de cada producto comprado.
        productos: productosCarrito.map((producto) => ({
          // Identifica el documento del producto; usa el nombre si falta el id.
          productoId: producto.id || producto.nombre,
          // Guarda el nombre para mostrarlo después en el pedido.
          nombre: producto.nombre,
          // Guarda la categoría o un texto vacío si no existe.
          categoria: producto.categoria || '',
          // Guarda la imagen o un texto vacío si no tiene URL.
          imagen: producto.imagen || '',
          // Convierte el precio a número para almacenarlo de forma consistente.
          precio: Number(producto.precio) || 0,
          // Guarda la cantidad seleccionada.
          cantidad: producto.cantidad,
        })),
        // Guarda el total calculado para la compra.
        total,
        // Marca el nuevo pedido como pendiente.
        estado: 'pendiente',
        // Solicita a Firestore que escriba la fecha actual del servidor.
        fecha: serverTimestamp(),
      });

      // Vacía el carrito únicamente después de guardar el pedido con éxito.
      vaciarCarrito();
      // Avisa que el pedido quedó registrado.
      Alert.alert('Pedido realizado', 'Tu pedido se guardó correctamente.');
    } catch (error) {
      // Registra el error técnico para poder diagnosticarlo.
      console.error('Error guardando el pedido:', error);
      // Informa al usuario que puede revisar la conexión e intentar otra vez.
      Alert.alert('No se pudo realizar el pedido', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      // Desactiva el estado de carga tanto si tuvo éxito como si falló.
      setEnviandoPedido(false);
    }
  };

  // Pide autorización antes de guardar el pedido.
  const confirmarPedido = () => {
    // Muestra el total y ofrece cancelar o continuar.
    Alert.alert('Confirmar pedido', `El total es C$${total}. ¿Deseas continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Realizar pedido', onPress: guardarPedido },
    ]);
  };

  // Renderiza el carrito y sus acciones.
  return (
    // Contenedor general de la pantalla.
    <View style={styles.container}>
      {/* Título principal de la vista. */}
      <Text style={styles.titulo}>Carrito</Text>
      {/* Muestra un aviso vacío o la lista, según haya productos agregados. */}
      {productosCarrito.length === 0 ? (
        <Text style={styles.texto}>Tu carrito está vacío.</Text>
      ) : (
        <>
          {/* Permite recorrer la lista si ocupa más espacio que la pantalla. */}
          <ScrollView style={styles.lista}>
            {/* Dibuja una fila por cada producto almacenado en el carrito. */}
            {productosCarrito.map((producto) => (
              <View key={producto.id || producto.nombre} style={styles.producto}>
                {/* Carga la miniatura solo cuando existe una URL de imagen. */}
                {producto.imagen ? (
                  <Image source={{ uri: producto.imagen }} style={styles.imagen} />
                ) : null}
                {/* Agrupa el nombre, cantidad y subtotal de esta línea. */}
                <View style={styles.detalle}>
                  <Text style={styles.nombre}>{producto.nombre}</Text>
                  <Text style={styles.texto}>Cantidad: {producto.cantidad}</Text>
                  <Text style={styles.precio}>
                    C${Number(producto.precio) * producto.cantidad}
                  </Text>
                </View>
                {/* Elimina completamente esta línea del carrito al pulsarlo. */}
                <Pressable
                  style={styles.quitarBoton}
                  onPress={() => quitarDelCarrito(producto.id || producto.nombre)}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${producto.nombre} del carrito`}
                >
                  {/* Dibuja el símbolo de papelera. */}
                  <Ionicons name="trash-outline" size={21} color="#ed0016" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          {/* Muestra el valor total de todos los artículos. */}
          <Text style={styles.total}>Total: C${total}</Text>
          {/* Inicia la confirmación; se desactiva mientras procesa el pedido. */}
          <Pressable
            style={[styles.realizarBoton, enviandoPedido && styles.botonDeshabilitado]}
            onPress={confirmarPedido}
            disabled={enviandoPedido}
            accessibilityRole="button"
          >
            {/* Cambia el texto mientras se espera respuesta de Firestore. */}
            <Text style={styles.realizarTexto}>
              {enviandoPedido ? 'Procesando pedido...' : 'Realizar pedido'}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

// Define la presentación de la pantalla y de cada línea del carrito.
const styles = StyleSheet.create({
  // Ocupa la pantalla, deja margen interior y define el fondo.
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f7f7',
  },
  // Estiliza el encabezado del carrito.
  titulo: {
    marginBottom: 16,
    color: '#29292e',
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Estiliza textos secundarios como la cantidad o el carrito vacío.
  texto: {
    color: '#777',
    fontSize: 15,
  },
  // Hace que la lista use el espacio vertical disponible.
  lista: {
    flex: 1,
  },
  // Acomoda los datos de un producto en una fila blanca.
  producto: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  // Define el tamaño de la imagen miniatura.
  imagen: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  // Permite que los datos ocupen el espacio sobrante de la fila.
  detalle: {
    flex: 1,
    marginLeft: 12,
  },
  // Define el área táctil del icono para quitar el producto.
  quitarBoton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Resalta el nombre del producto.
  nombre: {
    marginBottom: 4,
    color: '#29292e',
    fontSize: 15,
    fontWeight: '700',
  },
  // Estiliza el subtotal de la línea.
  precio: {
    marginTop: 4,
    color: '#ed0016',
    fontWeight: '700',
  },
  // Separa y resalta el total de la compra.
  total: {
    paddingVertical: 16,
    color: '#29292e',
    fontSize: 18,
    fontWeight: '800',
  },
  // Da tamaño, color y forma al botón de realizar pedido.
  realizarBoton: {
    marginBottom: 8,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#ed0016',
  },
  // Atenúa visualmente el botón durante el envío.
  botonDeshabilitado: {
    opacity: 0.6,
  },
  // Define la tipografía y color del texto del botón.
  realizarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
