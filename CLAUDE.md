@AGENTS.md

## Cambios realizados

- Aplicación móvil desarrollada con Expo SDK 57 y React Native.
- Navegación configurada con React Navigation Native Stack.
- Catálogo organizado en:
  - Alitas
  - Hamburguesas
  - Papas
  - Bebidas
- Categorías funcionales mediante botones y estado local.
- Se evitó el uso de `.map()` en la interfaz.
- Las tarjetas de productos navegan a la pantalla de detalle.
- La pantalla de detalle muestra imagen, nombre, categoría, descripción, calificación y características.
- Los precios se muestran en córdobas nicaragüenses con el formato `C$`.
- Componentes principales:
  - `App.js`
  - `Navegacion.js`
  - `screens/Catalogo.js`
  - `screens/DetalleProductos.js`
  - `components/producto/Produtos.js`
