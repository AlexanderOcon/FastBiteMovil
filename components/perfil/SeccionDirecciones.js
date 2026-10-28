import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SeccionDirecciones({
  idDireccionEditando,
  etiqueta,
  setEtiqueta,
  direccion,
  setDireccion,
  referencia,
  setReferencia,
  telefono,
  setTelefono,
  guardarDireccion,
  limpiarFormularioDireccion,
  direcciones,
  direccionPerfilSeleccionada,
  idDireccionSeleccionada,
  setIdDireccionSeleccionada,
  direccionesAbiertas,
  setDireccionesAbiertas,
  editarDireccion,
  eliminarDireccion,
}) {
  return (
    <>
      <View style={styles.encabezadoFormulario}>
        <Text style={styles.tituloSeccion}>
          {idDireccionEditando ? 'Editar dirección' : 'Agregar dirección'}
        </Text>
        <Text style={styles.descripcionSeccion}>Completa los datos para tu entrega</Text>
      </View>
      <View style={styles.formulario}>
        <Text style={styles.etiquetaCampo}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={etiqueta}
          onChangeText={setEtiqueta}
          placeholder="Casa, trabajo..."
        />
        <Text style={styles.etiquetaCampo}>Dirección completa</Text>
        <TextInput style={styles.input} value={direccion} onChangeText={setDireccion} />
        <Text style={styles.etiquetaCampo}>Referencia (opcional)</Text>
        <TextInput style={styles.input} value={referencia} onChangeText={setReferencia} />
        <Text style={styles.etiquetaCampo}>Teléfono de contacto</Text>
        <TextInput
          style={styles.input}
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
        />
        <Pressable style={styles.boton} onPress={guardarDireccion} accessibilityRole="button">
          <Ionicons name="add-circle-outline" size={19} color="#fff" />
          <Text style={styles.textoBoton}>
            {idDireccionEditando ? 'Guardar cambios' : 'Agregar dirección'}
          </Text>
        </Pressable>
      </View>
      {idDireccionEditando && (
        <Pressable
          style={styles.botonCancelarEdicion}
          onPress={limpiarFormularioDireccion}
          accessibilityRole="button"
        >
          <Text style={styles.enlace}>Cancelar edición</Text>
        </Pressable>
      )}

      <View style={styles.encabezadoLista}>
        <View>
          <Text style={styles.tituloSeccion}>Mis direcciones</Text>
          <Text style={styles.descripcionSeccion}>Lugares donde recibes tus pedidos</Text>
        </View>
        <View style={styles.contador}>
          <Text style={styles.textoContador}>{direcciones.length}</Text>
        </View>
      </View>
      {direcciones.length > 0 ? (
        <>
          <Pressable
            style={styles.selector}
            onPress={() => setDireccionesAbiertas((abiertas) => !abiertas)}
            accessibilityRole="button"
            accessibilityLabel="Elegir dirección guardada"
            accessibilityState={{ expanded: direccionesAbiertas }}
          >
            <View style={styles.iconoDireccion}>
              <Ionicons name="location" size={20} color="#ed0016" />
            </View>
            <View style={styles.detalleDireccion}>
              <Text style={styles.nombreDireccion}>
                {direccionPerfilSeleccionada?.etiqueta || 'Selecciona una dirección'}
              </Text>
              {!!direccionPerfilSeleccionada && (
                <Text style={styles.textoDireccion} numberOfLines={1}>
                  {direccionPerfilSeleccionada.direccion}
                </Text>
              )}
              {!!direccionPerfilSeleccionada?.telefono && (
                <Text style={styles.secundario}>{direccionPerfilSeleccionada.telefono}</Text>
              )}
            </View>
            <Ionicons
              name={direccionesAbiertas ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#c90014"
            />
          </Pressable>
          {direccionesAbiertas && (
            <View style={styles.opciones}>
              {direcciones.map((item) => {
                const seleccionada = item.id === idDireccionSeleccionada;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.opcion, seleccionada && styles.opcionActiva]}
                    onPress={() => {
                      setIdDireccionSeleccionada(item.id);
                      setDireccionesAbiertas(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={`${item.etiqueta}, ${item.direccion}`}
                    accessibilityState={{ selected: seleccionada }}
                  >
                    <View style={styles.detalleDireccion}>
                      <Text style={styles.nombreDireccion}>{item.etiqueta}</Text>
                      <Text style={styles.textoDireccion}>{item.direccion}</Text>
                      {!!item.referencia && <Text style={styles.secundario}>{item.referencia}</Text>}
                      {!!item.telefono && <Text style={styles.secundario}>{item.telefono}</Text>}
                    </View>
                    {seleccionada && (
                      <Ionicons name="checkmark-circle" size={21} color="#ed0016" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
          {!!direccionPerfilSeleccionada && (
            <View style={styles.accionesDireccion}>
              <Pressable
                style={styles.botonAccionDireccion}
                onPress={() => editarDireccion(direccionPerfilSeleccionada)}
                accessibilityRole="button"
                accessibilityLabel={`Editar dirección ${direccionPerfilSeleccionada.etiqueta}`}
              >
                <Ionicons name="create-outline" size={15} color="#ed0016" />
                <Text style={styles.enlace}>Editar</Text>
              </Pressable>
              <Pressable
                style={styles.botonAccionDireccion}
                onPress={() => eliminarDireccion(direccionPerfilSeleccionada.id)}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar dirección ${direccionPerfilSeleccionada.etiqueta}`}
              >
                <Ionicons name="trash-outline" size={15} color="#b00020" />
                <Text style={styles.eliminar}>Eliminar</Text>
              </Pressable>
            </View>
          )}
        </>
      ) : (
        <View style={styles.sinDirecciones}>
          <Ionicons name="location-outline" size={22} color="#85858d" />
          <Text style={styles.textoSinDirecciones}>Aún no tienes direcciones guardadas.</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  encabezadoFormulario: { marginBottom: 12 },
  tituloSeccion: { marginBottom: 4, color: '#242630', fontSize: 19, fontWeight: '900' },
  descripcionSeccion: { color: '#858995', fontSize: 12, lineHeight: 17 },
  formulario: {
    padding: 17,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#222',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  etiquetaCampo: { marginBottom: 6, color: '#50535e', fontSize: 13, fontWeight: '700' },
  input: {
    minHeight: 50,
    marginBottom: 11,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#e8eaf0',
    borderRadius: 13,
    backgroundColor: '#f8f9fb',
    color: '#242630',
    fontSize: 14,
  },
  boton: {
    minHeight: 52,
    marginVertical: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#ed0016',
    elevation: 2,
    shadowColor: '#c90014',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  textoBoton: { color: '#fff', fontSize: 15, fontWeight: '800' },
  botonCancelarEdicion: { alignSelf: 'center', paddingVertical: 10 },
  enlace: { color: '#c90014', fontSize: 12, fontWeight: '800' },
  encabezadoLista: {
    marginTop: 10,
    marginBottom: 12,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contador: {
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#ffe7e9',
  },
  textoContador: { color: '#c90014', fontSize: 13, fontWeight: '800' },
  selector: {
    minHeight: 76,
    marginBottom: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#c90014',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  iconoDireccion: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#fff0f1',
  },
  detalleDireccion: { flex: 1 },
  nombreDireccion: { marginBottom: 5, color: '#242630', fontSize: 14, fontWeight: '800' },
  textoDireccion: { color: '#50535e', fontSize: 13, lineHeight: 19 },
  secundario: { marginTop: 5, color: '#858995', fontSize: 12 },
  opciones: {
    marginBottom: 8,
    padding: 5,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  opcion: { minHeight: 60, padding: 11, flexDirection: 'row', alignItems: 'center', borderRadius: 12 },
  opcionActiva: { backgroundColor: '#fff0f1' },
  accionesDireccion: { flexDirection: 'row', gap: 18, marginTop: 13 },
  botonAccionDireccion: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5 },
  eliminar: { color: '#b00020', fontSize: 12, fontWeight: '700' },
  sinDirecciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  textoSinDirecciones: { flex: 1, color: '#777b86', fontSize: 13 },
});
