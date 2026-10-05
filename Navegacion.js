// Importa useState para guardar y actualizar productos en el carrito.
import { useState } from "react";
// Proporciona el contenedor requerido por React Navigation.
import { NavigationContainer } from "@react-navigation/native";
// Crea la navegación inferior por pestañas.
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
// Crea la navegación apilada para abrir el detalle desde el catálogo.
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// Proporciona los iconos que se muestran en las pestañas.
import { Ionicons } from "@expo/vector-icons";
// Comparte el contenido y las funciones del carrito con todas las pantallas.
import { CarritoContext } from "./context/CarritoContext";

// Importa la pantalla que lista productos.
import Catalogo from "./screens/Catalogo";
// Importa la pantalla de información de un producto.
import DetalleProducto from "./screens/DetalleProductos";
// Importa la pantalla donde se revisa y confirma el carrito.
import AcercaDe from "./screens/Carrito";
// Importa la pantalla de perfil del usuario.
import Favorito from "./screens/Perfil";

// Crea el objeto de configuración de las pestañas inferiores.
const Tab = createBottomTabNavigator();
// Crea el objeto de configuración para la pila catálogo-detalle.
const Stack = createNativeStackNavigator();

// Define las pantallas que pertenecen al flujo del catálogo.
function CatalogoStack() {
  // Devuelve una pila navegable con el catálogo y el detalle.
  return (
    // Declara el navegador apilado que permite avanzar y volver entre pantallas.
    <Stack.Navigator>
      {/* Registra la pantalla principal del catálogo y su título de encabezado. */}
      <Stack.Screen
        name="Catalogo"
        component={Catalogo}
        options={{ title: "FastBiteMovile" }}
      />
      {/* Registra el detalle, que recibe por route.params el producto seleccionado. */}
      <Stack.Screen
        name="Detalle"
        component={DetalleProducto}
        options={{ title: "Detalle del producto" }}
      />
    </Stack.Navigator>
  );
}

// Define la navegación principal y el estado compartido de la aplicación.
export default function Navegacion() {
  // Guarda una lista de productos agregados al carrito; inicia vacía.
  const [productosCarrito, setProductosCarrito] = useState([]);

  // Agrega un producto al carrito o aumenta su cantidad si ya existe.
  const agregarAlCarrito = (producto, cantidad = 1) => {
    // Convierte la cantidad recibida en número y evita cantidades menores que uno.
    const cantidadAgregar = Math.max(1, Number(cantidad) || 1);

    // Actualiza el estado usando su valor más reciente.
    setProductosCarrito((productosActuales) => {
      // Usa el id del documento; si no existe, usa el nombre como identificador.
      const identificador = producto.id ?? producto.nombre;
      // Busca si ese producto ya aparece en la lista actual.
      const productoExistente = productosActuales.find(
        // Compara el identificador de cada producto con el que se quiere agregar.
        (item) => (item.id ?? item.nombre) === identificador,
      );

      // Si el producto ya estaba en el carrito, actualiza su cantidad.
      if (productoExistente) {
        // Devuelve una nueva lista para que React detecte el cambio de estado.
        return productosActuales.map((item) =>
          // Suma la nueva cantidad solo al producto seleccionado.
          (item.id ?? item.nombre) === identificador
            ? { ...item, cantidad: item.cantidad + cantidadAgregar }
            // Conserva sin cambios los demás productos.
            : item,
        );
      }

      // Si aún no existe, crea una nueva lista con el producto y su cantidad.
      return [...productosActuales, { ...producto, cantidad: cantidadAgregar }];
    });
  };

  // Elimina del carrito la línea cuyo id o nombre coincide con el recibido.
  const quitarDelCarrito = (identificador) => {
    // Conserva solo los productos distintos al que se desea quitar.
    setProductosCarrito((productosActuales) =>
      productosActuales.filter(
        // Compara el id y usa el nombre como alternativa si no hay id.
        (producto) => (producto.id ?? producto.nombre) !== identificador,
      ),
    );
  };

  // Vacía el carrito asignándole una lista sin productos.
  const vaciarCarrito = () => setProductosCarrito([]);

  // Renderiza la aplicación y pone las funciones del carrito a disposición de sus pantallas.
  return (
    // Provider comparte productos y acciones sin pasarlas manualmente por cada componente.
    <CarritoContext.Provider
      value={{ productosCarrito, agregarAlCarrito, quitarDelCarrito, vaciarCarrito }}
    >
      {/* Contenedor que habilita el sistema completo de navegación. */}
      <NavigationContainer>
        {/* Define las pestañas principales y oculta encabezados duplicados. */}
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* Pestaña del catálogo; contiene su propia pila de catálogo y detalle. */}
          <Tab.Screen
            name="CatalogoTab"
            component={CatalogoStack}
            options={{
              title: "Catálogo",
              tabBarIcon: ({ color, size }) => (
                // Dibuja el icono del catálogo con el color y tamaño dados por la pestaña.
                <Ionicons name="albums-outline" size={size} color={color} />
              ),
            }}
          />
          {/* Pestaña que muestra los productos agregados y permite realizar el pedido. */}
          <Tab.Screen
            name="AcercaDeTab"
            component={AcercaDe}
            options={{
              title: "Carrito",
              tabBarIcon: ({ color, size }) => (
                // Dibuja el icono del carrito con el color y tamaño dados por la pestaña.
                <Ionicons name="cart-outline" size={size} color={color} />
              ),
            }}
          />
          {/* Pestaña que abre la pantalla de perfil del usuario. */}
          <Tab.Screen
            name="FavoritosTab"
            component={Favorito}
            options={{
              title: "Usuario",
              tabBarIcon: ({ color, size }) => (
                // Dibuja el icono del usuario con el color y tamaño dados por la pestaña.
                <Ionicons name="person-outline" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </CarritoContext.Provider>
  );
}