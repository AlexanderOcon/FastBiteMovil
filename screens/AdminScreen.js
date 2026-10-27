import React from "react";
import { View, Button, StyleSheet, Platform, Alert } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

const MiPantallaFastBite = () => {
  const descargarExcelFastBite = async (userToken = null) => {
    try {
      const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `Reporte_FastBite_${dateStr}.xlsx`;
      const carpetaDescargas = new Directory(Paths.cache, "reportes");
      carpetaDescargas.create({ intermediates: true, idempotent: true });
      const archivoDestino = new File(carpetaDescargas, filename);

      const urlExcel =
        "https://backend-gupal-alastapas-7s0v.onrender.com/estadisticas/excel";
      const respuesta = await fetch(urlExcel, {
        method: "GET",
        headers: {
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
        },
      });

      if (!respuesta.ok) {
        throw new Error(
          `No se pudo descargar el reporte (${respuesta.status})`,
        );
      }

      const arrayBuffer = await respuesta.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      archivoDestino.write(bytes);

      if (Platform.OS === "ios") {
        await Sharing.shareAsync(archivoDestino.uri, {
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Compartir reporte de FastBite",
        });
      } else {
        await Sharing.shareAsync(archivoDestino.uri, {
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Descargar reporte de FastBite",
        });
      }

      Alert.alert("Reporte listo", "El archivo se generó correctamente.");
    } catch (error) {
      console.error("Error al descargar el archivo Excel:", error);
      Alert.alert(
        "Error",
        "No se pudo descargar el archivo Excel de Fast Bite.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <Button
        title="Descargar Reporte Excel"
        onPress={() => descargarExcelFastBite("TU_TOKEN_SI_LO_NECESITAS")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default MiPantallaFastBite;
