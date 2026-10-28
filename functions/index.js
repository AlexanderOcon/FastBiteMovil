const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

initializeApp();

const auth = getAuth();
const db = getFirestore();

exports.createAdminUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para crear un administrador.');
  }

  const callerProfile = await db.collection('usuarios').doc(request.auth.uid).get();
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new HttpsError('internal', 'No se pudo identificar el proyecto de Firebase.');
  }
  const isPrimaryAdmin = request.auth.token.email
    ?.toLowerCase() === `admin@${projectId}.firebaseapp.com`;

  if (!isPrimaryAdmin && callerProfile.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un administrador puede crear otro administrador.');
  }

  const username = typeof request.data?.username === 'string'
    ? request.data.username.trim().toLowerCase()
    : '';
  const email = typeof request.data?.email === 'string'
    ? request.data.email.trim().toLowerCase()
    : '';
  const phone = typeof request.data?.phone === 'string'
    ? request.data.phone.trim()
    : '';
  const password = typeof request.data?.password === 'string'
    ? request.data.password
    : '';

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new HttpsError('invalid-argument', 'El usuario debe tener entre 3 y 20 letras, números o guiones bajos.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Escribe un correo electrónico válido.');
  }
  if (!/^[+\d\s()-]{7,20}$/.test(phone)) {
    throw new HttpsError('invalid-argument', 'Escribe un teléfono válido de al menos 7 dígitos.');
  }
  if (password.length < 6 || password.length > 128) {
    throw new HttpsError('invalid-argument', 'La contraseña debe tener entre 6 y 128 caracteres.');
  }

  const authEmail = `${username}@${projectId}.firebaseapp.com`;
  let newUser;
  try {
    newUser = await auth.createUser({
      email: authEmail,
      password,
      displayName: username,
    });

    await db.runTransaction(async (transaction) => {
      const usernameRef = db.collection('nombresUsuario').doc(username);
      const usernameSnapshot = await transaction.get(usernameRef);
      if (usernameSnapshot.exists) {
        throw new HttpsError('already-exists', 'Ese nombre de usuario ya está registrado.');
      }

      transaction.create(db.collection('usuarios').doc(newUser.uid), {
        username,
        email,
        telefono: phone,
        role: 'admin',
      });
      transaction.create(usernameRef, {
        uid: newUser.uid,
        authEmail,
      });
    });

    return { uid: newUser.uid, username };
  } catch (error) {
    if (newUser) {
      try {
        await auth.deleteUser(newUser.uid);
      } catch (rollbackError) {
        console.error('No se pudo eliminar la cuenta admin incompleta:', rollbackError);
      }
    }

    if (error instanceof HttpsError) throw error;
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Ese nombre de usuario ya está registrado.');
    }

    console.error('Error creando la cuenta de administrador:', error);
    throw new HttpsError('internal', 'No se pudo crear el administrador. Inténtalo de nuevo.');
  }
});
