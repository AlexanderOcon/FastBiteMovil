import { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { CarritoContext } from '../context/CarritoContext';

// Genera el correo interno que Firebase usa para autenticar a un usuario con nombre de usuario.
function emailInternoDeUsuario(nombreUsuario) {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Falta EXPO_PUBLIC_FIREBASE_PROJECT_ID en .env.');
  return `${nombreUsuario}@${projectId}.firebaseapp.com`;
}

// Credenciales del usuario administrador que debe entrar directo a la administración.
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'grupo4';

// Inicia sesión como admin o crea la cuenta admin si todavía no existe en Firebase Auth.
async function iniciarSesionAdmin() {
  const emailAdmin = emailInternoDeUsuario(ADMIN_USERNAME);

  try {
    // Si el usuario admin ya existe, solo realiza el login.
    await signInWithEmailAndPassword(auth, emailAdmin, ADMIN_PASSWORD);
  } catch (error) {
    // Si la cuenta aún no existe, la crea con el rol de administrador.
    if (error?.code !== 'auth/user-not-found') {
      throw error;
    }

    const credential = await createUserWithEmailAndPassword(auth, emailAdmin, ADMIN_PASSWORD);
    await updateProfile(credential.user, { displayName: 'Admin' });
    await setDoc(doc(db, 'usuarios', credential.user.uid), {
      username: 'Admin',
      email: emailAdmin,
      telefono: 'N/A',
      role: 'admin',
    }, { merge: true });
    return;
  }

  // Si el usuario ya estaba registrado, asegura que en Firestore siga marcado como admin.
  const usuarioActual = auth.currentUser;
  if (usuarioActual) {
    await setDoc(doc(db, 'usuarios', usuarioActual.uid), {
      username: 'Admin',
      email: emailAdmin,
      role: 'admin',
    }, { merge: true });
  }
}

const MENSAJES_POR_CODIGO = {
  'auth/email-already-in-use': 'Ese nombre de usuario ya está registrado.',
  'auth/invalid-credential': 'El nombre de usuario o la contraseña no son correctos.',
  'auth/user-not-found': 'El nombre de usuario o la contraseña no son correctos.',
  'auth/wrong-password': 'El nombre de usuario o la contraseña no son correctos.',
  'auth/invalid-email': 'El nombre de usuario no es válido.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/operation-not-allowed':
    'El inicio de sesión con correo/contraseña está desactivado. Actívalo en Firebase Console > Authentication > Sign-in method.',
  'auth/configuration-not-found':
    'Firebase Authentication no está configurado para este proyecto. Revisa tu proyecto y habilita Correo/Contraseña.',
  'auth/network-request-failed': 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/invalid-api-key': 'La API key de Firebase no es válida. Revisa EXPO_PUBLIC_FIREBASE_API_KEY en .env.',
  'auth/app-not-authorized': 'La API key no está autorizada para este proyecto de Firebase.',
  'auth/api-key-not-valid':
    'La API key de Firebase no es válida. Revisa EXPO_PUBLIC_FIREBASE_API_KEY en .env.',
};

function describirErrorDeAutenticacion(error) {
  const codigo = error?.code;
  if (codigo && MENSAJES_POR_CODIGO[codigo]) return MENSAJES_POR_CODIGO[codigo];
  if (codigo && codigo.startsWith('auth/api-key-not-valid')) {
    return 'La API key de Firebase no es válida. Revisa EXPO_PUBLIC_FIREBASE_API_KEY en .env.';
  }
  const detalle = codigo ? `Código: ${codigo}.` : `Detalle: ${error?.message || 'error desconocido'}.`;
  return `No se pudo completar la solicitud. ${detalle}`;
}

export default function Perfil() {
  const { user, role } = useAuth();
  const { cerrarSesion } = useContext(CarritoContext);
  const [modoRegistro, setModoRegistro] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [telefonoCuenta, setTelefonoCuenta] = useState('');
  const [correoCuenta, setCorreoCuenta] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [direcciones, setDirecciones] = useState([]);
  const [idDireccionEditando, setIdDireccionEditando] = useState(null);
  const [etiqueta, setEtiqueta] = useState('');
  const [direccion, setDireccion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [telefono, setTelefono] = useState('');

  useEffect(() => {
    if (!user) {
      setPerfil(null);
      setDirecciones([]);
      return undefined;
    }

    const unsubscribeProfile = onSnapshot(
      doc(db, 'usuarios', user.uid),
      (snapshot) => setPerfil(snapshot.exists() ? snapshot.data() : null),
      (error) => {
        console.error('Error cargando perfil:', error);
        Alert.alert('No se pudieron cargar tus datos', 'Verifica tu conexión e inténtalo de nuevo.');
      },
    );
    const unsubscribeAddresses = onSnapshot(
      collection(db, 'usuarios', user.uid, 'direcciones'),
      (snapshot) => setDirecciones(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }))),
      (error) => {
        console.error('Error cargando direcciones:', error);
        Alert.alert('No se pudieron cargar las direcciones', 'Verifica tu conexión e inténtalo de nuevo.');
      },
    );

    return () => {
      unsubscribeProfile();
      unsubscribeAddresses();
    };
  }, [user?.uid]);

  const entrarORegistrarse = async () => {
    const identificador = nombreUsuario.trim().toLowerCase();
    const username = identificador;
    const email = correoCuenta.trim().toLowerCase();
    const phone = telefonoCuenta.trim();
    if (!identificador || !contrasena) {
      Alert.alert('Datos incompletos', 'Escribe tu nombre de usuario y contraseña.');
      return;
    }
    if ((modoRegistro || !identificador.includes('@'))
      && !/^[a-z0-9_]{3,20}$/.test(username)) {
      Alert.alert('Nombre de usuario inválido', 'Usa entre 3 y 20 letras, números o guiones bajos.');
      return;
    }
    if (modoRegistro && (!email || !phone)) {
      Alert.alert('Datos incompletos', 'Para registrarte, escribe tu teléfono y correo electrónico.');
      return;
    }
    if (modoRegistro && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Correo inválido', 'Escribe un correo electrónico válido.');
      return;
    }
    if (modoRegistro && !/^[+\d\s()-]{7,20}$/.test(phone)) {
      Alert.alert('Teléfono inválido', 'Escribe un teléfono válido de al menos 7 dígitos.');
      return;
    }
    if (modoRegistro && contrasena.length < 6) {
      Alert.alert('Contraseña muy corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setProcesando(true);
    let cuentaNueva = null;
    try {
      // Detecta el caso especial del usuario admin para saltar el catálogo y entrar directo a administración.
      const esAdminExplicito = !modoRegistro
        && identificador.toLowerCase() === ADMIN_USERNAME
        && contrasena === ADMIN_PASSWORD;

      if (esAdminExplicito) {
        await iniciarSesionAdmin();
        return;
      }

      // Inicio normal de sesión con un usuario que no es admin.
      if (!modoRegistro) {
        const authEmail = identificador.includes('@')
          ? identificador
          : emailInternoDeUsuario(username);
        await signInWithEmailAndPassword(auth, authEmail, contrasena);
        return;
      }

      const authEmail = emailInternoDeUsuario(username);
      const credential = await createUserWithEmailAndPassword(auth, authEmail, contrasena);
      cuentaNueva = credential.user;
      await updateProfile(credential.user, { displayName: username });
      await setDoc(doc(db, 'usuarios', credential.user.uid), {
        username,
        email,
        telefono: phone,
        role: 'user',
      });
    } catch (error) {
      console.error(modoRegistro ? 'Error creando cuenta:' : 'Error iniciando sesión:', error);
      if (cuentaNueva) {
        try {
          await deleteUser(cuentaNueva);
        } catch (rollbackError) {
          console.error('No se pudo limpiar la cuenta incompleta:', rollbackError);
        }
      }

      const mensaje = describirErrorDeAutenticacion(error);
      Alert.alert(modoRegistro ? 'No se pudo crear la cuenta' : 'No se pudo iniciar sesión', mensaje);
    } finally {
      setProcesando(false);
    }
  };

  const limpiarFormularioDireccion = () => {
    setIdDireccionEditando(null);
    setEtiqueta('');
    setDireccion('');
    setReferencia('');
    setTelefono('');
  };

  const guardarDireccion = async () => {
    if (!etiqueta.trim() || !direccion.trim() || !telefono.trim()) {
      Alert.alert('Datos incompletos', 'Completa el nombre, la dirección y el teléfono.');
      return;
    }
    const datos = {
      etiqueta: etiqueta.trim(),
      direccion: direccion.trim(),
      referencia: referencia.trim(),
      telefono: telefono.trim(),
    };
    try {
      if (idDireccionEditando) {
        await updateDoc(doc(db, 'usuarios', user.uid, 'direcciones', idDireccionEditando), datos);
      } else {
        await addDoc(collection(db, 'usuarios', user.uid, 'direcciones'), datos);
      }
      limpiarFormularioDireccion();
    } catch (error) {
      console.error('Error guardando dirección:', error);
      Alert.alert('No se pudo guardar la dirección', 'Revisa tu conexión e inténtalo de nuevo.');
    }
  };

  const editarDireccion = (item) => {
    setIdDireccionEditando(item.id);
    setEtiqueta(item.etiqueta || '');
    setDireccion(item.direccion || '');
    setReferencia(item.referencia || '');
    setTelefono(item.telefono || '');
  };

  const eliminarDireccion = (id) => {
    Alert.alert('Eliminar dirección', '¿Quieres eliminar esta dirección?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'usuarios', user.uid, 'direcciones', id));
          } catch (error) {
            console.error('Error eliminando dirección:', error);
            Alert.alert('No se pudo eliminar', 'Inténtalo de nuevo.');
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.contenedor}>
        <Text style={styles.titulo}>{modoRegistro ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
        <Text style={styles.descripcion}>
          {modoRegistro
            ? 'Regístrate con tu usuario, teléfono, correo y contraseña.'
            : 'Inicia sesión con tu nombre de usuario y contraseña.'}
        </Text>
        <TextInput
          style={styles.input}
          value={nombreUsuario}
          onChangeText={setNombreUsuario}
          placeholder="Nombre de usuario"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
        />
        {modoRegistro && (
          <>
            <TextInput
              style={styles.input}
              value={telefonoCuenta}
              onChangeText={setTelefonoCuenta}
              placeholder="Teléfono"
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              value={correoCuenta}
              onChangeText={setCorreoCuenta}
              placeholder="Correo electrónico"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </>
        )}
        <TextInput
          style={styles.input}
          value={contrasena}
          onChangeText={setContrasena}
          placeholder="Contraseña"
          secureTextEntry
          autoCapitalize="none"
          autoComplete={modoRegistro ? 'new-password' : 'password'}
        />
        <Pressable style={styles.boton} onPress={entrarORegistrarse} disabled={procesando}>
          {procesando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botonTexto}>{modoRegistro ? 'Registrarme' : 'Iniciar sesión'}</Text>}
        </Pressable>
        <Pressable onPress={() => setModoRegistro((actual) => !actual)}>
          <Text style={styles.enlace}>
            {modoRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.contenedor}>
      <Text style={styles.titulo}>Mi cuenta</Text>
      <View style={styles.tarjetaCuenta}>
        <Text style={styles.nombreCuenta}>{perfil?.username || user.displayName || 'Cliente FastBite'}</Text>
        <Text style={styles.datoCuenta}>Teléfono: {perfil?.telefono || 'No disponible'}</Text>
        <Text style={styles.datoCuenta}>Correo: {perfil?.email || 'No disponible'}</Text>
      </View>
      <Text selectable style={styles.uid}>UID: {user.uid}</Text>
      <Text style={styles.rol}>Rol: {role === 'admin' ? 'Administrador' : 'Cliente'}</Text>

      <Text style={styles.subtitulo}>Mis direcciones</Text>
      {direcciones.map((item) => (
        <View key={item.id} style={styles.tarjetaDireccion}>
          <View style={styles.detalleDireccion}>
            <Text style={styles.nombreDireccion}>{item.etiqueta}</Text>
            <Text>{item.direccion}</Text>
            {!!item.referencia && <Text style={styles.secundario}>{item.referencia}</Text>}
            <Text style={styles.secundario}>{item.telefono}</Text>
          </View>
          <Pressable onPress={() => editarDireccion(item)}><Text style={styles.enlace}>Editar</Text></Pressable>
          <Pressable onPress={() => eliminarDireccion(item.id)}><Text style={styles.eliminar}>Eliminar</Text></Pressable>
        </View>
      ))}

      <Text style={styles.subtitulo}>{idDireccionEditando ? 'Editar dirección' : 'Agregar dirección'}</Text>
      <TextInput style={styles.input} value={etiqueta} onChangeText={setEtiqueta} placeholder="Nombre (Casa, Trabajo...)" />
      <TextInput style={styles.input} value={direccion} onChangeText={setDireccion} placeholder="Dirección completa" />
      <TextInput style={styles.input} value={referencia} onChangeText={setReferencia} placeholder="Referencia (opcional)" />
      <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="Teléfono de contacto" keyboardType="phone-pad" />
      <Pressable style={styles.boton} onPress={guardarDireccion}>
        <Text style={styles.botonTexto}>{idDireccionEditando ? 'Guardar cambios' : 'Agregar dirección'}</Text>
      </Pressable>
      {idDireccionEditando && (
        <Pressable onPress={limpiarFormularioDireccion}>
          <Text style={styles.enlace}>Cancelar edición</Text>
        </Pressable>
      )}
      <Pressable style={[styles.boton, styles.botonSalir]} onPress={cerrarSesion}>
        <Text style={styles.botonTexto}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexGrow: 1, padding: 22, backgroundColor: '#f7f7f7' },
  titulo: { marginBottom: 8, color: '#29292e', fontSize: 25, fontWeight: '800' },
  descripcion: { marginBottom: 18, color: '#666', fontSize: 15 },
  tarjetaCuenta: { marginVertical: 8, padding: 16, borderRadius: 12, backgroundColor: '#fff' },
  nombreCuenta: { marginBottom: 8, color: '#29292e', fontSize: 18, fontWeight: '700' },
  datoCuenta: { marginTop: 4, color: '#555' },
  uid: { marginBottom: 12, color: '#777', fontSize: 12 },
  rol: { marginBottom: 20, color: '#555' },
  subtitulo: { marginTop: 14, marginBottom: 10, color: '#29292e', fontSize: 18, fontWeight: '700' },
  input: { marginBottom: 11, padding: 13, borderRadius: 10, backgroundColor: '#fff', color: '#222' },
  boton: { marginVertical: 6, padding: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#ed0016' },
  botonTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
  enlace: { marginVertical: 12, color: '#ed0016', fontWeight: '700' },
  tarjetaDireccion: { marginBottom: 9, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, backgroundColor: '#fff' },
  detalleDireccion: { flex: 1 },
  nombreDireccion: { marginBottom: 4, fontWeight: '700' },
  secundario: { marginTop: 3, color: '#777' },
  eliminar: { color: '#b00020', fontWeight: '600' },
  botonSalir: { marginTop: 28, backgroundColor: '#555' },
});
