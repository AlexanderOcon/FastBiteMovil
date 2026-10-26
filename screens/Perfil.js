import { useContext, useEffect, useState } from 'react';
import {ActivityIndicator,Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View,} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {createUserWithEmailAndPassword,deleteUser,signInWithEmailAndPassword,updateProfile,} from 'firebase/auth';
import {addDoc,collection,deleteDoc,doc,getDoc,onSnapshot,setDoc,updateDoc,writeBatch,} from 'firebase/firestore';
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
  'auth/requires-recent-login': 'Por seguridad, cierra sesión e inicia sesión de nuevo antes de cambiar el nombre de usuario.',
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
  const { user } = useAuth();
  const { cerrarSesion } = useContext(CarritoContext);
  const [modoRegistro, setModoRegistro] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [telefonoCuenta, setTelefonoCuenta] = useState('');
  const [correoCuenta, setCorreoCuenta] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [nombreUsuarioPerfil, setNombreUsuarioPerfil] = useState('');
  const [correoPerfil, setCorreoPerfil] = useState('');
  const [telefonoPerfil, setTelefonoPerfil] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [direcciones, setDirecciones] = useState([]);
  const [direccionesAbiertas, setDireccionesAbiertas] = useState(false);
  const [idDireccionSeleccionada, setIdDireccionSeleccionada] = useState(null);
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

  useEffect(() => {
    if (direcciones.length === 0) {
      setIdDireccionSeleccionada(null);
      setDireccionesAbiertas(false);
      return;
    }
    if (!direcciones.some((item) => item.id === idDireccionSeleccionada)) {
      setIdDireccionSeleccionada(direcciones[0].id);
    }
  }, [direcciones, idDireccionSeleccionada]);

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
        let authEmail = identificador;
        if (!identificador.includes('@')) {
          const usernameSnapshot = await getDoc(doc(db, 'nombresUsuario', username));
          const mappedAuthEmail = usernameSnapshot.exists()
            ? usernameSnapshot.data().authEmail
            : null;
          authEmail = typeof mappedAuthEmail === 'string'
            ? mappedAuthEmail
            : emailInternoDeUsuario(username);
        }
        await signInWithEmailAndPassword(auth, authEmail, contrasena);
        return;
      }

      const authEmail = emailInternoDeUsuario(username);
      const credential = await createUserWithEmailAndPassword(auth, authEmail, contrasena);
      cuentaNueva = credential.user;
      await updateProfile(credential.user, { displayName: username });
      const batch = writeBatch(db);
      batch.set(doc(db, 'usuarios', credential.user.uid), {
        username,
        email,
        telefono: phone,
        role: 'user',
      });
      batch.set(doc(db, 'nombresUsuario', username), {
        uid: credential.user.uid,
        authEmail,
      });
      await batch.commit();
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

  const editarPerfil = () => {
    setNombreUsuarioPerfil(perfil?.username || user.displayName || '');
    setCorreoPerfil(perfil?.email || '');
    setTelefonoPerfil(perfil?.telefono || '');
    setEditandoPerfil(true);
  };

  const guardarPerfil = async () => {
    const username = nombreUsuarioPerfil.trim().toLowerCase();
    const email = correoPerfil.trim().toLowerCase();
    const phone = telefonoPerfil.trim();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      Alert.alert('Nombre de usuario inválido', 'Usa entre 3 y 20 letras, números o guiones bajos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Correo inválido', 'Escribe un correo electrónico válido.');
      return;
    }
    if (!/^[+\d\s()-]{7,20}$/.test(phone)) {
      Alert.alert('Teléfono inválido', 'Escribe un teléfono válido de al menos 7 dígitos.');
      return;
    }

    const usernameAnterior = perfil?.username || user.displayName || '';
    setGuardandoPerfil(true);
    try {
      const usernameAnteriorNormalizado = usernameAnterior.toLowerCase();
      let usernameAnteriorSnapshot = null;
      if (username !== usernameAnterior.toLowerCase()) {
        const usernameSnapshot = await getDoc(doc(db, 'nombresUsuario', username));
        if (usernameSnapshot.exists() && usernameSnapshot.data().uid !== user.uid) {
          Alert.alert('Nombre de usuario ocupado', 'Elige otro nombre de usuario.');
          return;
        }
        usernameAnteriorSnapshot = await getDoc(doc(db, 'nombresUsuario', usernameAnteriorNormalizado));
        if (usernameAnteriorSnapshot.exists() && usernameAnteriorSnapshot.data().uid !== user.uid) {
          throw new Error('El nombre de usuario actual está vinculado a otra cuenta.');
        }
        await updateProfile(user, { displayName: username });
      }
      const batch = writeBatch(db);
      batch.set(doc(db, 'usuarios', user.uid), {
        username,
        email,
        telefono: phone,
      }, { merge: true });
      if (username !== usernameAnteriorNormalizado) {
        batch.set(doc(db, 'nombresUsuario', username), {
          uid: user.uid,
          authEmail: user.email,
        });
        if (usernameAnteriorSnapshot?.exists()) {
          batch.delete(doc(db, 'nombresUsuario', usernameAnteriorNormalizado));
        }
      }
      await batch.commit();
      setEditandoPerfil(false);
      Alert.alert('Perfil actualizado', 'Tus datos se guardaron correctamente.');
    } catch (error) {
      console.error('Error actualizando el perfil:', error);
      if (username !== usernameAnterior.toLowerCase()) {
        try {
          await updateProfile(user, { displayName: usernameAnterior });
        } catch (rollbackError) {
          console.error('No se pudo restaurar el nombre de usuario anterior:', rollbackError);
        }
      }
      const mensaje = error?.code === 'permission-denied'
        ? 'Firebase rechazó la actualización. Publica las reglas actualizadas de Firestore y vuelve a intentarlo.'
        : error?.code
        ? describirErrorDeAutenticacion(error)
        : error?.message || 'Verifica tu conexión y los permisos de Firestore.';
      Alert.alert('No se pudo actualizar el perfil', mensaje);
    } finally {
      setGuardandoPerfil(false);
    }
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
    setIdDireccionSeleccionada(item.id);
    setDireccionesAbiertas(false);
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

  const direccionPerfilSeleccionada = direcciones.find(
    (item) => item.id === idDireccionSeleccionada,
  );

  if (!user) {
    return (
      <KeyboardAvoidingView
        style={styles.contenedorTeclado}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.contenedor}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
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
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.contenedorTeclado}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <ScrollView
      contentContainerStyle={styles.contenedor}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
    >
      <View style={styles.tarjetaCuenta}>
        <View style={styles.identidadCuenta}>
          <View style={styles.avatarCuenta}>
            <Ionicons name="person-outline" size={22} color="#fff" />
          </View>
          <View style={styles.identidadTexto}>
            {editandoPerfil ? (
              <TextInput
                style={styles.inputPerfil}
                value={nombreUsuarioPerfil}
                onChangeText={setNombreUsuarioPerfil}
                placeholder="Nombre de usuario"
                placeholderTextColor="#ffe0e3"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
            ) : (
              <Text style={styles.nombreCuenta} numberOfLines={1}>
                {perfil?.username || user.displayName || 'Cliente FastBite'}
              </Text>
            )}
          </View>
          <Pressable
            style={styles.botonSalirPerfil}
            onPress={cerrarSesion}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
          >
            <Ionicons name="log-out-outline" size={17} color="#fff" />
            <Text style={styles.textoSalirPerfil}>Salir</Text>
          </Pressable>
        </View>
        <View style={styles.separadorCuenta} />
        <View style={styles.filaDatoCuenta}>
          <Ionicons name="call-outline" size={17} color="#fff" />
          {editandoPerfil ? (
            <TextInput
              style={styles.inputDatoPerfil}
              value={telefonoPerfil}
              onChangeText={setTelefonoPerfil}
              placeholder="Teléfono"
              placeholderTextColor="#ffe0e3"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.datoCuenta}>{perfil?.telefono || 'Teléfono no disponible'}</Text>
          )}
        </View>
        <View style={styles.filaDatoCuenta}>
          <Ionicons name="mail-outline" size={17} color="#fff" />
          {editandoPerfil ? (
            <TextInput
              style={styles.inputDatoPerfil}
              value={correoPerfil}
              onChangeText={setCorreoPerfil}
              placeholder="Correo electrónico"
              placeholderTextColor="#ffe0e3"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : (
            <Text style={styles.datoCuenta} numberOfLines={1}>
              {perfil?.email || 'Correo no disponible'}
            </Text>
          )}
        </View>
        {editandoPerfil ? (
          <View style={styles.accionesPerfil}>
            <Pressable
              style={styles.botonGuardarPerfil}
              onPress={guardarPerfil}
              disabled={guardandoPerfil}
              accessibilityRole="button"
            >
              {guardandoPerfil
                ? <ActivityIndicator size="small" color="#c90014" />
                : <Text style={styles.textoBotonGuardarPerfil}>Guardar cambios</Text>}
            </Pressable>
            <Pressable
              style={styles.botonCancelarPerfil}
              onPress={() => setEditandoPerfil(false)}
              disabled={guardandoPerfil}
              accessibilityRole="button"
            >
              <Text style={styles.textoBotonCancelarPerfil}>Cancelar</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.botonEditarPerfil}
            onPress={editarPerfil}
            accessibilityRole="button"
            accessibilityLabel="Editar datos del perfil"
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.textoBotonEditarPerfil}>Editar datos</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.encabezadoFormulario}>
        <Text style={styles.subtitulo}>
          {idDireccionEditando ? 'Editar dirección' : 'Agregar dirección'}
        </Text>
        <Text style={styles.descripcionSeccion}>Completa los datos para tu entrega</Text>
      </View>
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

      <View style={styles.encabezadoSeccion}>
        <View>
          <Text style={styles.subtitulo}>Mis direcciones</Text>
          <Text style={styles.descripcionSeccion}>Lugares donde recibes tus pedidos</Text>
        </View>
        <View style={styles.contadorDirecciones}>
          <Text style={styles.textoContador}>{direcciones.length}</Text>
        </View>
      </View>
      {direcciones.length > 0 && (
        <>
          <Pressable
            style={styles.selectorDirecciones}
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
            <View style={styles.opcionesDireccionesPerfil}>
              {direcciones.map((item) => {
                const seleccionada = item.id === idDireccionSeleccionada;
                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.opcionDireccionPerfil,
                      seleccionada && styles.opcionDireccionPerfilActiva,
                    ]}
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
                      {!!item.referencia && (
                        <Text style={styles.secundario}>{item.referencia}</Text>
                      )}
                      {!!item.telefono && (
                        <Text style={styles.secundario}>{item.telefono}</Text>
                      )}
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
      )}
      {direcciones.length === 0 && (
        <View style={styles.sinDirecciones}>
          <Ionicons name="location-outline" size={22} color="#85858d" />
          <Text style={styles.textoSinDirecciones}>Aún no tienes direcciones guardadas.</Text>
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedorTeclado: { flex: 1 },
  contenedor: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 36,
    backgroundColor: '#f5f6f8',
  },
  titulo: {
    marginBottom: 2,
    color: '#29292e',
    fontSize: 25,
    fontWeight: '800',
  },
  descripcion: { marginBottom: 18, color: '#626570', fontSize: 15, lineHeight: 22 },
  tarjetaCuenta: {
    marginTop: 40,
    marginBottom: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#ed0016',
    elevation: 5,
    shadowColor: '#a30010',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  identidadCuenta: { flexDirection: "row", alignItems: "center" },
  avatarCuenta: {
    width: 48,
    height: 48,
    marginRight: 13,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  identidadTexto: { flex: 1 },
  nombreCuenta: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  botonSalirPerfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 11,
  },
  textoSalirPerfil: { color: '#fff', fontSize: 11, fontWeight: '700' },
  inputPerfil: {
    minHeight: 44,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 11,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  separadorCuenta: {
    height: 1,
    marginVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  filaDatoCuenta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 10,
  },
  datoCuenta: { flex: 1, color: '#fff', fontSize: 13 },
  inputDatoPerfil: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 11,
    color: '#fff',
    fontSize: 13,
  },
  botonEditarPerfil: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: 12,
  },
  textoBotonEditarPerfil: { color: '#fff', fontSize: 12, fontWeight: '700' },
  accionesPerfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  botonGuardarPerfil: {
    minHeight: 40,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  textoBotonGuardarPerfil: { color: '#c90014', fontSize: 12, fontWeight: '800' },
  botonCancelarPerfil: { paddingHorizontal: 8, paddingVertical: 10 },
  textoBotonCancelarPerfil: { color: '#fff', fontSize: 12, fontWeight: '700' },
  encabezadoSeccion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 12,
    paddingVertical: 5,
  },
  controlesSeccionDirecciones: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subtitulo: {
    marginTop: 6,
    marginBottom: 3,
    color: '#242630',
    fontSize: 18,
    fontWeight: '800',
  },
  descripcionSeccion: { color: '#858995', fontSize: 12, lineHeight: 17 },
  encabezadoFormulario: { marginTop: 4, marginBottom: 10 },
  contadorDirecciones: {
    minWidth: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: '#ffe7e9',
  },
  textoContador: { color: '#c90014', fontSize: 13, fontWeight: '800' },
  selectorDirecciones: {
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
  opcionesDireccionesPerfil: {
    marginBottom: 8,
    padding: 5,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  opcionDireccionPerfil: {
    minHeight: 60,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  opcionDireccionPerfilActiva: { backgroundColor: '#fff0f1' },
  sinDirecciones: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  textoSinDirecciones: { flex: 1, color: '#777b86', fontSize: 13 },
  tarjetaDireccion: {
    marginBottom: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 18,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#222',
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  iconoDireccion: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: '#fff0f1',
  },
  detalleDireccion: { flex: 1 },
  nombreDireccion: {
    marginBottom: 5,
    color: '#242630',
    fontSize: 14,
    fontWeight: '800',
  },
  textoDireccion: { color: '#50535e', fontSize: 13, lineHeight: 19 },
  secundario: { marginTop: 5, color: '#858995', fontSize: 12 },
  accionesDireccion: { flexDirection: "row", gap: 18, marginTop: 13 },
  botonAccionDireccion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
  },
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
  formularioDireccion: {
    padding: 16,
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
  boton: {
    minHeight: 52,
    marginVertical: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: '#ed0016',
    elevation: 2,
    shadowColor: '#c90014',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  botonTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  enlace: {
    color: '#c90014',
    fontSize: 12,
    fontWeight: '800',
  },
  botonCancelar: {
    alignSelf: "center",
    paddingVertical: 10,
  },
  eliminar: {
    color: '#b00020',
    fontSize: 12,
    fontWeight: '700',
  },
});
