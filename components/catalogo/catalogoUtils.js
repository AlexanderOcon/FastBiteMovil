export function normalizarTexto(valor) {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (Array.isArray(valor)) return valor.join(', ');
  if (valor && typeof valor === 'object') {
    return normalizarTexto(valor.nombre || valor.descripcion || valor.titulo || valor.label || '');
  }
  return '';
}

export function adaptarProductos(consulta) {
  return consulta.docs.map((documento) => {
    const producto = documento.data();
    const nombreCategoria = normalizarTexto(
      producto.categoria_id?.nombre || producto.categoria_id || producto.categoria || '',
    );
    const imagenNormalizada = normalizarTexto(producto.imagen || producto.image || '');

    return {
      id: documento.id,
      ...producto,
      categoria: nombreCategoria.trim(),
      imagen: imagenNormalizada,
      image: imagenNormalizada,
      descripcion: normalizarTexto(producto.descripcion || producto.categoria_id?.descripcion || ''),
      rating: normalizarTexto(producto.rating || producto.calificacion || '5.0'),
    };
  });
}
