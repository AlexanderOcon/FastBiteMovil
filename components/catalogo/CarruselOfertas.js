import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { normalizarTexto } from './catalogoUtils';

function formatearPrecio(valor) {
  return `C$${Math.trunc(Number(valor) || 0).toLocaleString('es-NI')}`;
}

export default function CarruselOfertas({
  ofertas,
  productos,
  anchoOferta,
  indiceOferta,
  setIndiceOferta,
  scrollOfertasRef,
  navigation,
}) {
  if (ofertas.length === 0) return null;

  return (
    <View style={styles.carrusel}>
      <ScrollView
        ref={scrollOfertasRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ofertas}
        snapToInterval={anchoOferta + 12}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={({ nativeEvent }) => {
          setIndiceOferta(
            Math.round(nativeEvent.contentOffset.x / (anchoOferta + 12)),
          );
        }}
      >
        {ofertas.map((oferta) => {
          const producto = productos.find((item) => item.id === oferta.productoId);
          const productosIncluidos = Array.isArray(oferta.productos) && oferta.productos.length > 0
            ? oferta.productos
            : [{
              id: producto?.id || oferta.productoId,
              nombre: producto?.nombre || oferta.nombreProducto,
              categoria: producto?.categoria || '',
              imagen: producto?.imagen || oferta.imagen || '',
            }];
          const imagen = oferta.imagen || productosIncluidos[0]?.imagen || producto?.imagen || '';
          const nombresIncluidos = productosIncluidos
            .map((item) => normalizarTexto(item.nombre))
            .filter(Boolean)
            .join(', ');
          const productoParaDetalle = {
            id: `oferta-${oferta.id}`,
            nombre: oferta.titulo || oferta.nombreProducto || 'Oferta especial',
            categoria: 'Oferta',
            imagen,
            precio: oferta.precioOferta,
            precioOriginal: oferta.precioOriginal,
            descripcion: [
              normalizarTexto(oferta.descripcion),
              nombresIncluidos ? `Incluye: ${nombresIncluidos}.` : '',
            ].filter(Boolean).join('\n'),
            rating: '5.0',
            esOferta: true,
            ofertaId: oferta.id,
            productosIncluidos,
          };

          return (
            <Pressable
              key={oferta.id}
              style={[styles.oferta, { width: anchoOferta }]}
              onPress={() => navigation.navigate('Detalle', productoParaDetalle)}
              accessibilityRole="button"
              accessibilityLabel={`Ver oferta: ${oferta.titulo}`}
            >
              <View style={styles.ofertaInfo}>
                <Text style={styles.ofertaLabel}>OFERTA ESPECIAL</Text>
                <Text style={styles.ofertaTitulo} numberOfLines={2}>{oferta.titulo}</Text>
                <Text style={styles.ofertaBotonTexto}>{formatearPrecio(oferta.precioOferta)}</Text>
                <Text style={styles.ofertaPrecioOriginal}>
                  {`Antes ${formatearPrecio(oferta.precioOriginal)}`}
                </Text>
              </View>
              {imagen ? <Image source={{ uri: imagen }} style={styles.ofertaImagen} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {ofertas.length > 1 && (
        <View style={styles.indicadores}>
          {ofertas.map((oferta, indice) => (
            <View
              key={oferta.id}
              style={[
                styles.indicador,
                indice === Math.min(indiceOferta, ofertas.length - 1) && styles.indicadorActivo,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  carrusel: { marginBottom: 14, marginTop: 10 },
  ofertas: { gap: 12, paddingHorizontal: 10 },
  oferta: {
    minHeight: 160,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: '#ff2639',
  },
  ofertaInfo: { flex: 1, minWidth: 0, marginRight: 10 },
  ofertaLabel: { color: '#ffd9d9', fontSize: 10 },
  ofertaTitulo: { marginVertical: 4, color: '#fff', fontSize: 19, fontWeight: '900' },
  ofertaBotonTexto: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#ffd000',
    color: '#715000',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  ofertaPrecioOriginal: {
    marginTop: 4,
    color: '#fff',
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  ofertaImagen: { width: 106, height: 106, borderRadius: 10 },
  indicadores: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8 },
  indicador: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d5d5d8' },
  indicadorActivo: { width: 16, backgroundColor: '#ed0016' },
});
