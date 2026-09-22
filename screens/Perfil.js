import { View, Text, StyleSheet } from "react-native";

export default function Perfil() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Perfil</Text>
      <Text style={styles.texto}>
        Aquí aparecerán tus datos y preferencias.
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 10 
  },
  texto: { 
    fontSize: 16, 
    textAlign: "center", 
    color: "#555" 
  },
});
