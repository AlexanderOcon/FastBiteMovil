import { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { CarritoContext } from "./context/CarritoContext";

import Catalogo from "./screens/Catalogo";
import DetalleProducto from "./screens/DetalleProductos";
import AcercaDe from "./screens/Carrito";
import Favorito from "./screens/Perfil";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// STACK DEL CATÁLOGO
function CatalogoStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Catalogo"
        component={Catalogo}
        options={{ title: "FastBiteMovile" }}
      />
      <Stack.Screen
        name="Detalle"
        component={DetalleProducto}
        options={{ title: "Detalle del producto" }}
      />
    </Stack.Navigator>
  );
}
// NAVEGACIÓN PRINCIPAL
export default function Navegacion() {
  const [productosCarrito, setProductosCarrito] = useState([]);

  const agregarAlCarrito = (producto, cantidad = 1) => {
    const cantidadAgregar = Math.max(1, Number(cantidad) || 1);

    setProductosCarrito((productosActuales) => {
      const identificador = producto.id ?? producto.nombre;
      const productoExistente = productosActuales.find(
        (item) => (item.id ?? item.nombre) === identificador,
      );

      if (productoExistente) {
        return productosActuales.map((item) =>
          (item.id ?? item.nombre) === identificador
            ? { ...item, cantidad: item.cantidad + cantidadAgregar }
            : item,
        );
      }

      return [...productosActuales, { ...producto, cantidad: cantidadAgregar }];
    });
  };

  const quitarDelCarrito = (identificador) => {
    setProductosCarrito((productosActuales) =>
      productosActuales.filter(
        (producto) => (producto.id ?? producto.nombre) !== identificador,
      ),
    );
  };

  const vaciarCarrito = () => setProductosCarrito([]);

  return (
    <CarritoContext.Provider
      value={{ productosCarrito, agregarAlCarrito, quitarDelCarrito, vaciarCarrito }}
    >
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
        {/* TAB CATÁLOGO */}
        <Tab.Screen
          name="CatalogoTab"
          component={CatalogoStack}
          options={{
            title: "Catálogo",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="albums-outline" size={size} color={color} />
            ),
          }}
        />
        {/* TAB ACERCA DE */}
        <Tab.Screen
          name="AcercaDeTab"
          component={AcercaDe}
          options={{
            title: "Carrito",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="cart-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />
        {/* TAB FAVORITOS */}
        <Tab.Screen
          name="FavoritosTab"
          component={Favorito}
          options={{
            title: "Usuario",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" 
              size={size} 
              color={color} 
              />
            ),
          }}
        />
        </Tab.Navigator>
      </NavigationContainer>
    </CarritoContext.Provider>
  );
}