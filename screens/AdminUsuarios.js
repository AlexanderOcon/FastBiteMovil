import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const crearAdmin = httpsCallable(functions, 'createAdminUser');

function obtenerMensajeError(error) {
  if (error.code === 'functions/not-found') {
    return 'La función de creación de administradores no está desplegada en Firebase. Despliega createAdminUser e inténtalo de nuevo.';
  }
  if (error.code === 'functions/unauthenticated') {
    return 'Tu sesión expiró. Cierra sesión, vuelve a entrar como administrador e inténtalo de nuevo.';
  }
  if (error.code === 'functions/already-exists') {
    return 'Ese nombre de usuario ya está registrado.';
  }
  if (error.code === 'functions/invalid-argument') {
    return error.message || 'Revisa los datos ingresados.';
  }
  if (error.code === 'functions/permission-denied') {
    return 'Tu cuenta no tiene permisos para crear administradores.';
  }
  if (error.code === 'functions/unavailable' || error.code === 'functions/deadline-exceeded') {
    return 'No se pudo conectar con el servicio. Inténtalo de nuevo.';
  }
  if (error.message && error.code !== 'functions/internal') {
    return `${error.message} (${error.code || 'error desconocido'})`;
  }
  return 'Error del servidor de Firebase. Verifica en Firebase Console que Cloud Functions esté habilitado y revisa los registros de createAdminUser.';
}

export default function AdminUsuarios() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const enviarFormulario = async () => {
    const datos = {
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
    };

    if (!datos.username || !datos.email || !datos.phone || !datos.password) {
      Alert.alert('Datos incompletos', 'Completa todos los campos para crear el administrador.');
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(datos.username)) {
      Alert.alert('Usuario inválido', 'Usa entre 3 y 20 letras, números o guiones bajos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
      Alert.alert('Correo inválido', 'Escribe un correo electrónico válido.');
      return;
    }
    if (!/^[+\d\s()-]{7,20}$/.test(datos.phone)) {
      Alert.alert('Teléfono inválido', 'Escribe un teléfono válido de al menos 7 dígitos.');
      return;
    }
    if (datos.password.length < 6) {
      Alert.alert('Contraseña muy corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCreating(true);
    try {
      await crearAdmin(datos);
      setUsername('');
      setEmail('');
      setPhone('');
      setPassword('');
      setShowPassword(false);
      Alert.alert(
        'Administrador creado',
        `La cuenta de ${datos.username} ya puede iniciar sesión con su usuario y contraseña.`,
      );
    } catch (error) {
      console.error('Error creando administrador desde el panel:', error);
      Alert.alert('No se pudo crear el administrador', obtenerMensajeError(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.teclado}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.encabezado}>
          <View style={styles.iconoEncabezado}>
            <Ionicons name="people-outline" size={25} color="#ed0016" />
          </View>
          <Text style={styles.etiqueta}>FASTBITE · ADMINISTRACIÓN</Text>
          <Text style={styles.titulo}>Agregar administrador</Text>
          <Text style={styles.descripcion}>
            Crea una cuenta con acceso al panel para gestionar pedidos y productos.
          </Text>
        </View>

        <View style={styles.tarjeta}>
          <View style={styles.aviso}>
            <Ionicons name="shield-checkmark-outline" size={19} color="#b42318" />
            <Text style={styles.textoAviso}>
              Solo los administradores actuales pueden crear nuevas cuentas admin.
            </Text>
          </View>

          <View style={styles.grupoCampo}>
            <Text style={styles.etiquetaCampo}>Nombre de usuario</Text>
            <View style={styles.campo}>
              <Ionicons name="person-outline" size={19} color="#858995" />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Ej. ana_admin"
                placeholderTextColor="#9699a3"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                maxLength={20}
              />
            </View>
          </View>

          <View style={styles.grupoCampo}>
            <Text style={styles.etiquetaCampo}>Correo electrónico</Text>
            <View style={styles.campo}>
              <Ionicons name="mail-outline" size={19} color="#858995" />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="nombre@correo.com"
                placeholderTextColor="#9699a3"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={styles.grupoCampo}>
            <Text style={styles.etiquetaCampo}>Teléfono</Text>
            <View style={styles.campo}>
              <Ionicons name="call-outline" size={19} color="#858995" />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Número de contacto"
                placeholderTextColor="#9699a3"
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>
          </View>

          <View style={styles.grupoCampo}>
            <Text style={styles.etiquetaCampo}>Contraseña temporal</Text>
            <View style={styles.campo}>
              <Ionicons name="lock-closed-outline" size={19} color="#858995" />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#9699a3"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                maxLength={128}
              />
              <Pressable
                onPress={() => setShowPassword((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#858995"
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.boton, creating && styles.botonDesactivado]}
            onPress={enviarFormulario}
            disabled={creating}
            accessibilityRole="button"
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={19} color="#fff" />
                <Text style={styles.textoBoton}>Crear administrador</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  teclado: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 32,
    paddingBottom: 30,
  },
  encabezado: {
    marginBottom: 18,
  },
  iconoEncabezado: {
    width: 48,
    height: 48,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#ffe7e9',
  },
  etiqueta: {
    color: '#c90014',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  titulo: {
    marginTop: 5,
    color: '#242630',
    fontSize: 24,
    fontWeight: '900',
  },
  descripcion: {
    marginTop: 6,
    color: '#777b86',
    fontSize: 13,
    lineHeight: 19,
  },
  tarjeta: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#222',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  aviso: {
    marginBottom: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 13,
    backgroundColor: '#fff1f1',
  },
  textoAviso: {
    flex: 1,
    color: '#7a2525',
    fontSize: 12,
    lineHeight: 17,
  },
  grupoCampo: {
    marginBottom: 13,
  },
  etiquetaCampo: {
    marginBottom: 6,
    color: '#50535e',
    fontSize: 13,
    fontWeight: '700',
  },
  campo: {
    minHeight: 52,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e8eaf0',
    borderRadius: 13,
    backgroundColor: '#f8f9fb',
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    color: '#242630',
    fontSize: 14,
  },
  boton: {
    minHeight: 52,
    marginTop: 4,
    paddingHorizontal: 16,
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
  botonDesactivado: {
    opacity: 0.7,
  },
  textoBoton: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
