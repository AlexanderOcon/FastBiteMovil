import { createContext } from 'react';

export const CarritoContext = createContext({
  productosCarrito: [],
  agregarAlCarrito: () => {},
  quitarDelCarrito: () => {},
  vaciarCarrito: () => {},
});