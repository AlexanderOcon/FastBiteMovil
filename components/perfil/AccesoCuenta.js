import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AccesoCuenta({
  modoRegistro,
  setModoRegistro,
  nombreUsuario,
  setNombreUsuario,
  telefonoCuenta,
  setTelefonoCuenta,
  correoCuenta,
  setCorreoCuenta,
  contrasena,
  setContrasena,
  mostrarContrasena,
  setMostrarContrasena,
  procesando,
  entrarORegistrarse,
}) {
  return (
    <View style={styles.contenido}>
      <View style={styles.encabezado}>
        <View style={styles.icono}>
          <Ionicons name="fast-food-outline" size={34} color="#fff" />
        </View>
        <Text style={styles.marca}>FASTBITE</Text>
        <Text style={styles.titulo}>
          {modoRegistro ? 'Únete a FastBite' : '¡Qué bueno verte!'}
        </Text>
        <Text style={styles.descripcion}>
          {modoRegistro
            ? 'Crea tu cuenta para pedir tus favoritos.'
            : 'Inicia sesión y disfruta algo delicioso.'}
        </Text>
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.tituloFormulario}>
          {modoRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
        </Text>
        <View style={styles.grupoCampo}>
          <Text style={styles.etiquetaCampo}>Nombre de usuario</Text>
          <View style={styles.campo}>
            <Ionicons name="person-outline" size={19} color="#858995" />
            <TextInput
              style={styles.input}
              value={nombreUsuario}
              onChangeText={setNombreUsuario}
              placeholder="Escribe tu usuario"
              placeholderTextColor="#9699a3"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
            />
          </View>
        </View>
        {modoRegistro && (
          <>
            <View style={styles.grupoCampo}>
              <Text style={styles.etiquetaCampo}>Teléfono</Text>
              <View style={styles.campo}>
                <Ionicons name="call-outline" size={19} color="#858995" />
                <TextInput
                  style={styles.input}
                  value={telefonoCuenta}
                  onChangeText={setTelefonoCuenta}
                  placeholder="Escribe tu teléfono"
                  placeholderTextColor="#9699a3"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View style={styles.grupoCampo}>
              <Text style={styles.etiquetaCampo}>Correo electrónico</Text>
              <View style={styles.campo}>
                <Ionicons name="mail-outline" size={19} color="#858995" />
                <TextInput
                  style={styles.input}
                  value={correoCuenta}
                  onChangeText={setCorreoCuenta}
                  placeholder="nombre@correo.com"
                  placeholderTextColor="#9699a3"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>
          </>
        )}
        <View style={styles.grupoCampo}>
          <Text style={styles.etiquetaCampo}>Contraseña</Text>
          <View style={styles.campo}>
            <Ionicons name="lock-closed-outline" size={19} color="#858995" />
            <TextInput
              style={styles.input}
              value={contrasena}
              onChangeText={setContrasena}
              placeholder={modoRegistro ? 'Crea una contraseña' : 'Escribe tu contraseña'}
              placeholderTextColor="#9699a3"
              secureTextEntry={!mostrarContrasena}
              autoCapitalize="none"
              autoComplete={modoRegistro ? 'new-password' : 'password'}
            />
            <Pressable
              onPress={() => setMostrarContrasena((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              accessibilityState={{ selected: mostrarContrasena }}
              hitSlop={8}
            >
              <Ionicons
                name={mostrarContrasena ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#858995"
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.boton, procesando && styles.botonDesactivado]}
          onPress={entrarORegistrarse}
          disabled={procesando}
          accessibilityRole="button"
        >
          {procesando
            ? <ActivityIndicator color="#fff" />
            : (
              <>
                <Text style={styles.textoBoton}>
                  {modoRegistro ? 'Crear mi cuenta' : 'Iniciar sesión'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
        </Pressable>
        <Pressable
          style={styles.enlaceBoton}
          onPress={() => setModoRegistro((actual) => !actual)}
          accessibilityRole="button"
        >
          <Text style={styles.enlaceTexto}>
            {modoRegistro ? '¿Ya tienes cuenta? ' : '¿Eres nuevo en FastBite? '}
            <Text style={styles.enlaceAccion}>
              {modoRegistro ? 'Inicia sesión' : 'Regístrate'}
            </Text>
          </Text>
        </Pressable>
      </View>
      <View style={styles.pie}>
        <Ionicons name="shield-checkmark-outline" size={15} color="#858995" />
        <Text style={styles.textoPie}>Tu cuenta está protegida</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  encabezado: { alignItems: 'center', marginBottom: 25 },
  icono: {
    width: 76,
    height: 76,
    marginBottom: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: '#ed0016',
    elevation: 5,
    shadowColor: '#c90014',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  marca: { color: '#c90014', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  titulo: { marginTop: 8, color: '#242630', fontSize: 27, fontWeight: '900', textAlign: 'center' },
  descripcion: {
    marginTop: 6,
    color: '#777b86',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  tarjeta: {
    padding: 21,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 23,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#222',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  tituloFormulario: { marginBottom: 14, color: '#242630', fontSize: 18, fontWeight: '800' },
  grupoCampo: { marginBottom: 12 },
  etiquetaCampo: { marginBottom: 6, color: '#50535e', fontSize: 13, fontWeight: '700' },
  campo: {
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: '#e8eaf0',
    borderRadius: 14,
    backgroundColor: '#f8f9fb',
  },
  input: { flex: 1, minWidth: 0, paddingVertical: 13, color: '#242630', fontSize: 14 },
  boton: {
    minHeight: 54,
    marginTop: 5,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 15,
    backgroundColor: '#ed0016',
    elevation: 2,
    shadowColor: '#c90014',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  botonDesactivado: { opacity: 0.7 },
  textoBoton: { color: '#fff', fontSize: 15, fontWeight: '800' },
  enlaceBoton: { alignItems: 'center', paddingTop: 17, paddingBottom: 2 },
  enlaceTexto: { color: '#777b86', fontSize: 13, textAlign: 'center' },
  enlaceAccion: { color: '#c90014', fontWeight: '800' },
  pie: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  textoPie: { color: '#858995', fontSize: 11 },
});
