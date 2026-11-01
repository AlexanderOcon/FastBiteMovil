# FastBite Móvil

Aplicación móvil para explorar el catálogo de FastBite, administrar una cuenta y realizar pedidos. Incluye una interfaz de administración para gestionar productos, ofertas, usuarios y pedidos.

## Funcionalidades

- Catálogo de productos organizado por categorías, con búsqueda y ofertas.
- Pantalla de detalle con información e imagen del producto.
- Carrito de compras y selección de direcciones para los pedidos.
- Registro e inicio de sesión con nombre de usuario.
- Perfil de usuario con edición de datos y administración de direcciones.
- Historial de pedidos para clientes.
- Sección de administración para productos, ofertas, usuarios y pedidos.
- Precios presentados en córdobas nicaragüenses (`C$`).

## Tecnologías

- React Native y Expo.
- React Navigation para navegación por pestañas y pantallas.
- Firebase Authentication y Cloud Firestore para cuentas y datos de la aplicación.
- Supabase Storage para las imágenes de productos administradas desde la aplicación.
- AsyncStorage para persistencia de la sesión de Firebase en el dispositivo.


## Requisitos

- Node.js y npm.
- Para ejecutar en un dispositivo o emulador: Expo Go o las herramientas de desarrollo nativo correspondientes.
- Credenciales de Firebase configuradas para el proyecto.
- Configuración de Supabase Storage para cargar imágenes desde la administración.

## Configuración

1. Instala las dependencias:

   ```sh
   npm install
   ```

2. Crea un archivo `.env` en la raíz y configura las variables requeridas:

   ```dotenv
   EXPO_PUBLIC_FIREBASE_API_KEY=
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   EXPO_PUBLIC_FIREBASE_APP_ID=

   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_ANON_KEY=
   EXPO_PUBLIC_SUPABASE_BUCKET=
   ```

   Firebase requiere al menos `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID` y `EXPO_PUBLIC_FIREBASE_APP_ID` para inicializarse. Las variables de Supabase se usan para la carga de imágenes de productos. No publiques credenciales privadas ni agregues el archivo `.env` al repositorio.

3. En Firebase, habilita el método de autenticación por correo y contraseña y configura Firestore para el proyecto. Las reglas de acceso de Firestore están en `firestore.rules`.



## Estructura principal

| Ruta | Descripción |
| --- | --- |
| `App.js` | Punto de entrada de la aplicación. |
| `navigation/` | Navegación y proveedores globales de la aplicación. |
| `screens/` | Pantallas de catálogo, perfil, carrito, pedidos y administración. |
| `components/` | Componentes reutilizables de la interfaz. |
| `context/` | Estado compartido de autenticación y carrito. |
| `hooks/` | Lógica reutilizable de autenticación y perfil. |
| `firebase/` | Inicialización de Firebase. |
| `services/` | Integraciones como la carga de imágenes en Supabase Storage. |
| `functions/` | Código de Cloud Functions de Firebase. |
| `assets/` | Imágenes, iconos y otros recursos gráficos. |
