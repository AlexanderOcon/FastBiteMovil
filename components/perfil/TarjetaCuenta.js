import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TarjetaCuenta({
  user,
  perfil,
  editandoPerfil,
  nombreUsuarioPerfil,
  setNombreUsuarioPerfil,
  telefonoPerfil,
  setTelefonoPerfil,
  correoPerfil,
  setCorreoPerfil,
  guardandoPerfil,
  guardarPerfil,
  editarPerfil,
  cancelarEdicion,
  cerrarSesion,
}) {
  return (
    <>
      <View style={styles.encabezado}>
        <View style={styles.textosEncabezado}>
          <Text style={styles.marca}>FASTBITE · TU CUENTA</Text>
          <Text style={styles.titulo}>Mi perfil</Text>
          <Text style={styles.descripcion}>Administra tus datos y direcciones de entrega.</Text>
        </View>
        <View style={styles.iconoEncabezado}>
          <Ionicons name="person-outline" size={22} color="#c90014" />
        </View>
      </View>
      <View style={styles.tarjeta}>
        <View style={styles.identidad}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={24} color="#c90014" />
          </View>
          <View style={styles.identidadTexto}>
            {editandoPerfil ? (
              <TextInput
                style={styles.inputPerfil}
                value={nombreUsuarioPerfil}
                onChangeText={setNombreUsuarioPerfil}
                placeholder="Nombre de usuario"
                placeholderTextColor="#858995"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
            ) : (
              <>
                <Text style={styles.nombre} numberOfLines={1}>
                  {perfil?.username || user.displayName || 'Cliente FastBite'}
                </Text>
                <Text style={styles.etiquetaCuenta}>Cuenta personal</Text>
              </>
            )}
          </View>
          <Pressable
            style={styles.botonSalir}
            onPress={cerrarSesion}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
          >
            <Ionicons name="log-out-outline" size={17} color="#c90014" />
            <Text style={styles.textoSalir}>Salir</Text>
          </Pressable>
        </View>
        <View style={styles.separador} />
        <View style={styles.filaDato}>
          <Ionicons name="call-outline" size={17} color="#c90014" />
          {editandoPerfil ? (
            <TextInput
              style={styles.inputDato}
              value={telefonoPerfil}
              onChangeText={setTelefonoPerfil}
              placeholder="Teléfono"
              placeholderTextColor="#858995"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.dato}>{perfil?.telefono || 'Teléfono no disponible'}</Text>
          )}
        </View>
        <View style={styles.filaDato}>
          <Ionicons name="mail-outline" size={17} color="#c90014" />
          {editandoPerfil ? (
            <TextInput
              style={styles.inputDato}
              value={correoPerfil}
              onChangeText={setCorreoPerfil}
              placeholder="Correo electrónico"
              placeholderTextColor="#858995"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : (
            <Text style={styles.dato} numberOfLines={1}>
              {perfil?.email || 'Correo no disponible'}
            </Text>
          )}
        </View>
        {editandoPerfil ? (
          <View style={styles.acciones}>
            <Pressable
              style={styles.botonGuardar}
              onPress={guardarPerfil}
              disabled={guardandoPerfil}
              accessibilityRole="button"
            >
              {guardandoPerfil
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.textoGuardar}>Guardar cambios</Text>}
            </Pressable>
            <Pressable
              style={styles.botonCancelar}
              onPress={cancelarEdicion}
              disabled={guardandoPerfil}
              accessibilityRole="button"
            >
              <Text style={styles.textoCancelar}>Cancelar</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.botonEditar}
            onPress={editarPerfil}
            accessibilityRole="button"
            accessibilityLabel="Editar datos del perfil"
          >
            <Ionicons name="create-outline" size={16} color="#c90014" />
            <Text style={styles.textoEditar}>Editar datos</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  encabezado: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textosEncabezado: { flex: 1, paddingRight: 12 },
  marca: {
    marginBottom: 4,
    color: '#c90014',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  titulo: { color: '#242630', fontSize: 25, fontWeight: '800' },
  descripcion: { marginTop: 7, color: '#777b86', fontSize: 13, lineHeight: 18 },
  iconoEncabezado: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#ffe7e9',
  },
  tarjeta: {
    marginBottom: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 22,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#222',
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 3 },
  },
  identidad: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 54,
    height: 54,
    marginRight: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#fff0f1',
  },
  identidadTexto: { flex: 1 },
  nombre: { color: '#242630', fontSize: 16, fontWeight: '900' },
  etiquetaCuenta: { marginTop: 4, color: '#858995', fontSize: 11 },
  botonSalir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ffd0d4',
    borderRadius: 12,
    backgroundColor: '#fff6f6',
  },
  textoSalir: { color: '#c90014', fontSize: 11, fontWeight: '800' },
  inputPerfil: {
    minHeight: 44,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#e8eaf0',
    borderRadius: 12,
    backgroundColor: '#f8f9fb',
    color: '#242630',
    fontSize: 15,
    fontWeight: '700',
  },
  separador: { height: 1, marginVertical: 17, backgroundColor: '#eceef2' },
  filaDato: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 13 },
  dato: { flex: 1, color: '#50535e', fontSize: 13 },
  inputDato: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#e8eaf0',
    borderRadius: 11,
    backgroundColor: '#f8f9fb',
    color: '#242630',
    fontSize: 13,
  },
  botonEditar: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ffd0d4',
    borderRadius: 12,
    backgroundColor: '#fff6f6',
  },
  textoEditar: { color: '#c90014', fontSize: 12, fontWeight: '800' },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  botonGuardar: {
    minHeight: 40,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ed0016',
  },
  textoGuardar: { color: '#fff', fontSize: 12, fontWeight: '800' },
  botonCancelar: { paddingHorizontal: 8, paddingVertical: 10 },
  textoCancelar: { color: '#777b86', fontSize: 12, fontWeight: '700' },
});
