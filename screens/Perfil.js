import { useContext, useEffect, useState } from 'react';
import {ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View,} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {createUserWithEmailAndPassword,deleteUser,signInWithEmailAndPassword,updateProfile,} from 'firebase/auth';
import {addDoc,collection,deleteDoc,doc,onSnapshot,setDoc,updateDoc,} from 'firebase/firestore';
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
      <View style={styles.encabezadoPerfil}>
        <View style={styles.avatarPerfil}>
          <Ionicons name="person" size={26} color="#fff" />
        </View>
        <View style={styles.encabezadoTexto}>
          <Text style={styles.titulo}>Mi cuenta</Text>
          <Text style={styles.subtituloEncabezado}>Tu perfil FastBite</Text>
        </View>
      </View>
      <View style={styles.tarjetaCuenta}>
        <View style={styles.identidadCuenta}>
          <View style={styles.avatarCuenta}>
            <Ionicons name="person-outline" size={22} color="#ed0016" />
          </View>
          <View style={styles.identidadTexto}>
            <Text style={styles.nombreCuenta} numberOfLines={1}>
              {perfil?.username || user.displayName || 'Cliente FastBite'}
            </Text>
            <View style={styles.insigniaRol}>
              <Text style={styles.textoInsigniaRol}>
                {role === 'admin' ? 'Administrador' : 'Cliente'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.separadorCuenta} />
        <View style={styles.filaDatoCuenta}>
          <Ionicons name="call-outline" size={17} color="#ed0016" />
          <Text style={styles.datoCuenta}>{perfil?.telefono || 'Teléfono no disponible'}</Text>
        </View>
        <View style={styles.filaDatoCuenta}>
          <Ionicons name="mail-outline" size={17} color="#ed0016" />
          <Text style={styles.datoCuenta} numberOfLines={1}>
            {perfil?.email || 'Correo no disponible'}
          </Text>
        </View>
      </View>

      <View style={styles.metadataPerfil}>
        <Ionicons name="shield-checkmark-outline" size={15} color="#85858d" />
        <Text selectable style={styles.uid}>UID: {user.uid}</Text>
      </View>

      <View style={styles.encabezadoSeccion}>
        <Text style={styles.subtitulo}>Mis direcciones</Text>
        <View style={styles.contadorDirecciones}>
          <Text style={styles.textoContador}>{direcciones.length}</Text>
        </View>
      </View>
      {direcciones.length === 0 && (
        <View style={styles.sinDirecciones}>
          <Ionicons name="location-outline" size={22} color="#85858d" />
          <Text style={styles.textoSinDirecciones}>
            Aún no tienes direcciones guardadas.
          </Text>
        </View>
      )}
      {direcciones.map((item) => (
        <View key={item.id} style={styles.tarjetaDireccion}>
          <View style={styles.iconoDireccion}>
            <Ionicons name="location-outline" size={20} color="#ed0016" />
          </View>
          <View style={styles.detalleDireccion}>
            <Text style={styles.nombreDireccion}>{item.etiqueta}</Text>
            <Text style={styles.textoDireccion}>{item.direccion}</Text>
            {!!item.referencia && <Text style={styles.secundario}>{item.referencia}</Text>}
            <Text style={styles.secundario}>{item.telefono}</Text>
            <View style={styles.accionesDireccion}>
              <Pressable
                style={styles.botonAccionDireccion}
                onPress={() => editarDireccion(item)}
                accessibilityRole="button"
                accessibilityLabel={`Editar dirección ${item.etiqueta}`}
              >
                <Ionicons name="create-outline" size={15} color="#ed0016" />
                <Text style={styles.enlace}>Editar</Text>
              </Pressable>
              <Pressable
                style={styles.botonAccionDireccion}
                onPress={() => eliminarDireccion(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar dirección ${item.etiqueta}`}
              >
                <Ionicons name="trash-outline" size={15} color="#b00020" />
                <Text style={styles.eliminar}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}

      <Text style={styles.subtitulo}>
        {idDireccionEditando ? 'Editar dirección' : 'Agregar dirección'}
      </Text>
      <View style={styles.formularioDireccion}>
        <TextInput
          style={styles.input}
          value={etiqueta}
          onChangeText={setEtiqueta}
          placeholder="Nombre (Casa, Trabajo...)"
        />
        <TextInput
          style={styles.input}
          value={direccion}
          onChangeText={setDireccion}
          placeholder="Dirección completa"
        />
        <TextInput
          style={styles.input}
          value={referencia}
          onChangeText={setReferencia}
          placeholder="Referencia (opcional)"
        />
        <TextInput
          style={styles.input}
          value={telefono}
          onChangeText={setTelefono}
          placeholder="Teléfono de contacto"
          keyboardType="phone-pad"
        />
        <Pressable style={styles.boton} onPress={guardarDireccion}>
          <Ionicons name="add-circle-outline" size={19} color="#fff" />
          <Text style={styles.botonTexto}>
            {idDireccionEditando ? 'Guardar cambios' : 'Agregar dirección'}
          </Text>
        </Pressable>
      </View>
      {idDireccionEditando && (
        <Pressable style={styles.botonCancelar} onPress={limpiarFormularioDireccion}>
          <Text style={styles.enlace}>Cancelar edición</Text>
        </Pressable>
      )}
      <Pressable style={[styles.boton, styles.botonSalir]} onPress={cerrarSesion}>
        <Ionicons name="log-out-outline" size={19} color="#555" />
        <Text style={styles.textoBotonSalir}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: "#f7f7f7",
  },
  encabezadoPerfil: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 14,
  },
  avatarPerfil: {
    width: 48,
    height: 48,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#ed0016",
  },
  encabezadoTexto: { flex: 1 },
  titulo: {
    marginBottom: 2,
    color: "#29292e",
    fontSize: 25,
    fontWeight: "800",
  },
  subtituloEncabezado: { color: "#85858d", fontSize: 13 },
  descripcion: { marginBottom: 18, color: "#666", fontSize: 15 },
  tarjetaCuenta: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  identidadCuenta: { flexDirection: "row", alignItems: "center" },
  avatarCuenta: {
    width: 42,
    height: 42,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#fff0f1",
  },
  identidadTexto: { flex: 1 },
  nombreCuenta: {
    marginBottom: 5,
    color: "#29292e",
    fontSize: 17,
    fontWeight: "700",
  },
  insigniaRol: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#fff0f1",
  },
  textoInsigniaRol: { color: "#c90014", fontSize: 11, fontWeight: "700" },
  separadorCuenta: {
    height: 1,
    marginVertical: 13,
    backgroundColor: "#f0f0f2",
  },
  filaDatoCuenta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 8,
  },
  datoCuenta: { flex: 1, color: "#555", fontSize: 13 },
  metadataPerfil: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  uid: { flex: 1, color: "#85858d", fontSize: 11 },
  encabezadoSeccion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 10,
  },
  subtitulo: {
    marginTop: 8,
    marginBottom: 10,
    color: "#29292e",
    fontSize: 18,
    fontWeight: "700",
  },
  contadorDirecciones: {
    minWidth: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#fff0f1",
  },
  textoContador: { color: "#c90014", fontSize: 12, fontWeight: "700" },
  sinDirecciones: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  textoSinDirecciones: { color: "#777", fontSize: 13 },
  tarjetaDireccion: {
    marginBottom: 10,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "#fff",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  iconoDireccion: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#fff0f1",
  },
  detalleDireccion: { flex: 1 },
  nombreDireccion: {
    marginBottom: 5,
    color: "#29292e",
    fontSize: 14,
    fontWeight: "700",
  },
  textoDireccion: { color: "#444", fontSize: 13, lineHeight: 19 },
  secundario: { marginTop: 4, color: "#85858d", fontSize: 12 },
  accionesDireccion: { flexDirection: "row", gap: 16, marginTop: 10 },
  botonAccionDireccion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
  },
  input: {
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#eeeeF0",
    borderRadius: 10,
    backgroundColor: "#f9f9fa",
    color: "#222",
    fontSize: 14,
  },
  formularioDireccion: {
    padding: 14,
    borderRadius: 15,
    backgroundColor: "#fff",
  },
  boton: {
    marginVertical: 6,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 11,
    backgroundColor: "#ed0016",
  },
  botonTexto: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  enlace: {
    color: "#ed0016",
    fontSize: 12,
    fontWeight: "700",
  },
  botonCancelar: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  eliminar: {
    color: "#b00020",
    fontSize: 12,
    fontWeight: "600",
  },
  botonSalir: {
    marginTop: 20,
    padding: 13,
    borderWidth: 1,
    borderColor: "#dedee2",
    backgroundColor: "#fff",
  },
  textoBotonSalir: {
    color: "#555",
    fontSize: 14,
    fontWeight: "700",
  },
});
