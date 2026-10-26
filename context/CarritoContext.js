import { createContext } from 'react';

export const CarritoContext = createContext({
  productosCarrito: [],
  agregarAlCarrito: () => {},
  quitarDelCarrito: () => {},
  actualizarCantidadCarrito: () => {},
  vaciarCarrito: () => {},
  cerrarSesion: async () => {},
});