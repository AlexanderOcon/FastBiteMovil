import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { updateProfile } from 'firebase/auth';
import {addDoc,collection,deleteDoc,doc,getDoc,onSnapshot,updateDoc,writeBatch,} from 'firebase/firestore';
import { db } from '../firebase/config';
import { describirErrorDeAutenticacion } from './usePerfilAuth';

export default function useDatosPerfil(user) {
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

  return {
    perfil,
    editandoPerfil,
    setEditandoPerfil,
    nombreUsuarioPerfil,
    setNombreUsuarioPerfil,
    correoPerfil,
    setCorreoPerfil,
    telefonoPerfil,
    setTelefonoPerfil,
    guardandoPerfil,
    direcciones,
    direccionesAbiertas,
    setDireccionesAbiertas,
    idDireccionSeleccionada,
    setIdDireccionSeleccionada,
    idDireccionEditando,
    etiqueta,
    setEtiqueta,
    direccion,
    setDireccion,
    referencia,
    setReferencia,
    telefono,
    setTelefono,
    limpiarFormularioDireccion,
    editarPerfil,
    guardarPerfil,
    guardarDireccion,
    editarDireccion,
    eliminarDireccion,
    direccionPerfilSeleccionada: direcciones.find((item) => item.id === idDireccionSeleccionada),
  };
}
