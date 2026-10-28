import { Pressable, StyleSheet, Text, View } from 'react-native';

function formatearPrecio(valor) {
  const precio = Math.trunc(Number(valor));
  return `C$${Number.isFinite(precio) ? precio.toLocaleString('es-NI') : '0'}`;
}

export default function ResumenPedidoCarrito({ total, enviandoPedido, puedeRealizar, confirmarPedido }) {
  return (
    <>
      <View style={styles.resumen}>
        <View>
          <Text style={styles.etiqueta}>Total del pedido</Text>
          <Text style={styles.nota}>Impuestos incluidos</Text>
        </View>
        <Text style={styles.total}>{formatearPrecio(total)}</Text>
      </View>
      <Pressable
        style={[styles.boton, !puedeRealizar && styles.deshabilitado]}
        onPress={confirmarPedido}
        disabled={!puedeRealizar}
        accessibilityRole="button"
      >
        <Text style={styles.textoBoton}>{enviandoPedido ? 'Procesando pedido...' : 'Realizar pedido'}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  resumen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, paddingVertical: 13 },
  etiqueta: { color: '#242630', fontSize: 15, fontWeight: '800' },
  nota: { marginTop: 2, color: '#858995', fontSize: 11 },
  total: { color: '#c90014', fontSize: 21, fontWeight: '900' },
  boton: { minHeight: 52, marginBottom: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#ed0016', elevation: 2, shadowColor: '#c90014', shadowOpacity: 0.18, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  deshabilitado: { opacity: 0.55 },
  textoBoton: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
