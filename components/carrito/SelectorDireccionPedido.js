import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SelectorDireccionPedido({
  user,
  navigation,
  direcciones,
  direccionElegida,
  direccionSeleccionada,
  setDireccionSeleccionada,
  abierto,
  setAbierto,
}) {
  if (!user || direcciones.length === 0) {
    return (
      <Pressable
        style={styles.aviso}
        onPress={() => navigation.navigate('PerfilTab')}
        accessibilityRole="button"
      >
        <Text style={styles.avisoTexto}>
          {!user
            ? 'Inicia sesión desde Cuenta para pedir.'
            : 'Agrega una dirección de entrega desde Cuenta.'}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.seccion} accessibilityRole="radiogroup">
      <Text style={styles.titulo}>Dirección de entrega</Text>
      <Text style={styles.subtitulo}>Selecciona dónde recibir tu pedido</Text>
      <Pressable
        style={styles.selector}
        onPress={() => setAbierto((actual) => !actual)}
        accessibilityRole="button"
        accessibilityLabel="Elegir dirección de entrega"
        accessibilityState={{ expanded: abierto }}
      >
        <View style={styles.icono}>
          <Ionicons name="location" size={19} color="#ed0016" />
        </View>
        <View style={styles.detalle}>
          <Text style={styles.direccionTitulo}>
            {direccionElegida?.etiqueta || 'Selecciona una dirección'}
          </Text>
          {!!direccionElegida && <Text style={styles.texto}>{direccionElegida.direccion}</Text>}
          {!!direccionElegida?.referencia && (
            <Text style={styles.textoSecundario}>{direccionElegida.referencia}</Text>
          )}
          {!!direccionElegida?.telefono && (
            <Text style={styles.textoSecundario}>{direccionElegida.telefono}</Text>
          )}
        </View>
        <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={20} color="#c90014" />
      </Pressable>
      {abierto && (
        <View style={styles.opciones}>
          {direcciones.map((item) => {
            const seleccionada = direccionSeleccionada === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.opcion, seleccionada && styles.opcionActiva]}
                onPress={() => {
                  setDireccionSeleccionada(item.id);
                  setAbierto(false);
                }}
                accessibilityRole="radio"
                accessibilityLabel={`${item.etiqueta}, ${item.direccion}`}
                accessibilityState={{ selected: seleccionada }}
              >
                <View style={styles.detalleOpcion}>
                  <Text style={styles.direccionTitulo}>{item.etiqueta}</Text>
                  <Text style={styles.texto}>{item.direccion}</Text>
                  {!!item.referencia && <Text style={styles.textoSecundario}>{item.referencia}</Text>}
                  {!!item.telefono && <Text style={styles.textoSecundario}>{item.telefono}</Text>}
                </View>
                {seleccionada && <Ionicons name="checkmark-circle" size={21} color="#ed0016" />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: { marginTop: 8, padding: 14, borderWidth: 1, borderColor: '#ffd5d9', borderRadius: 14, backgroundColor: '#fff0f1' },
  avisoTexto: { color: '#a00010', fontSize: 13, fontWeight: '700' },
  seccion: { marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#e9ebef' },
  titulo: { color: '#242630', fontSize: 16, fontWeight: '800' },
  subtitulo: { marginTop: 3, marginBottom: 10, color: '#858995', fontSize: 12 },
  selector: { minHeight: 56, padding: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#c90014', borderRadius: 13, backgroundColor: '#fff' },
  icono: { width: 30, height: 30, marginRight: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#fff0f1' },
  detalle: { flex: 1 },
  direccionTitulo: { marginBottom: 1, color: '#242630', fontSize: 11, fontWeight: '800' },
  texto: { color: '#626570', fontSize: 13, lineHeight: 19 },
  textoSecundario: { marginTop: 1, color: '#858995', fontSize: 10 },
  opciones: { marginTop: 7, padding: 5, borderWidth: 1, borderColor: '#e5e7ec', borderRadius: 15, backgroundColor: '#fff' },
  opcion: { minHeight: 62, padding: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 11 },
  opcionActiva: { backgroundColor: '#fff0f1' },
  detalleOpcion: { flex: 1 },
});
