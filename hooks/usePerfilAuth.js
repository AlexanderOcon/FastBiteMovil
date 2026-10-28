import { useState } from 'react';
import { Alert } from 'react-native';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'grupo4';

const MENSAJES_POR_CODIGO = {
  'auth/email-already-in-use': 'Ese nombre de usuario ya está registrado.',
  'auth/requires-recent-login':
    'Por seguridad, cierra sesión e inicia sesión de nuevo antes de cambiar el nombre de usuario.',
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
  'auth/invalid-api-key':
    'La API key de Firebase no es válida. Revisa EXPO_PUBLIC_FIREBASE_API_KEY en .env.',
  'auth/app-not-authorized': 'La API key no está autorizada para este proyecto de Firebase.',
  'auth/api-key-not-valid':
    'La API key de Firebase no es válida. Revisa EXPO_PUBLIC_FIREBASE_API_KEY en .env.',
};

function emailInternoDeUsuario(nombreUsuario) {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Falta EXPO_PUBLIC_FIREBASE_PROJECT_ID en .env.');
  return `${nombreUsuario}@${projectId}.firebaseapp.com`;
}

async function iniciarSesionAdmin() {
  const emailAdmin = emailInternoDeUsuario(ADMIN_USERNAME);

  try {
    await signInWithEmailAndPassword(auth, emailAdmin, ADMIN_PASSWORD);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;

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

  const usuarioActual = auth.currentUser;
  if (usuarioActual) {
    await setDoc(doc(db, 'usuarios', usuarioActual.uid), {
      username: 'Admin',
      email: emailAdmin,
      role: 'admin',
    }, { merge: true });
  }
}

function describirErrorDeAutenticacion(error) {
  const codigo = error?.code;
  if (codigo && MENSAJES_POR_CODIGO[codigo]) return MENSAJES_POR_CODIGO[codigo];
  if (codigo && codigo.startsWith('auth/api-key-not-valid')) {
    return 'La API key de Firebase no es válida. Revisa EXPO_PUBLIC_FIREBASE_API_KEY en .env.';
  }
  const detalle = codigo ? `Código: ${codigo}.` : `Detalle: ${error?.message || 'error desconocido'}.`;
  return `No se pudo completar la solicitud. ${detalle}`;
}

export default function usePerfilAuth() {
  const [modoRegistro, setModoRegistro] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [telefonoCuenta, setTelefonoCuenta] = useState('');
  const [correoCuenta, setCorreoCuenta] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [procesando, setProcesando] = useState(false);

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
      const esAdminExplicito = !modoRegistro
        && identificador.toLowerCase() === ADMIN_USERNAME
        && contrasena === ADMIN_PASSWORD;

      if (esAdminExplicito) {
        await iniciarSesionAdmin();
        return;
      }

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

  return {
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
  };
}

export { describirErrorDeAutenticacion };
