import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BuscadorCatalogo({ busqueda, setBusqueda }) {
  return (
    <View style={styles.seccion}>
      <View style={styles.buscador}>
        <Ionicons name="search-outline" size={18} color="#85858d" />
        <TextInput
          style={styles.input}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar producto"
          placeholderTextColor="#999"
          accessibilityLabel="Buscar productos"
          returnKeyType="search"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { paddingHorizontal: 10, paddingTop: 10 },
  buscador: {
    height: 46,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f1f1f3',
  },
  input: { flex: 1, marginLeft: 8, color: '#29292e', fontSize: 14 },
});
