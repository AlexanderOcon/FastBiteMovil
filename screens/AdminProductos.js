import { useEffect, useState } from 'react';
import { useContext } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { CarritoContext } from '../context/CarritoContext';

const formularioVacio = {
  nombre: '',
  categoria: '',
  precio: '',
  imagen: '',
  descripcion: '',
  rating: '5.0',
};

export default function AdminProductos() {
  const { user } = useAuth();
  const { cerrarSesion } = useContext(CarritoContext);
  const [productos, setProductos] = useState([]);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [idEditando, setIdEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => onSnapshot(
    collection(db, 'productos'),
    (snapshot) => setProductos(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    (error) => {
      console.error('Error cargando productos para administración:', error);
      Alert.alert('No se pudieron cargar los productos', 'Verifica los permisos de Firestore.');
    },
  ), []);

  const actualizarCampo = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  };

  const limpiarFormulario = () => {
    setIdEditando(null);
    setFormulario(formularioVacio);
  };

  const guardarProducto = async () => {
    const precio = Number(formulario.precio);
    if (!formulario.nombre.trim() || !formulario.categoria.trim() || !formulario.imagen.trim()
      || !formulario.descripcion.trim() || !Number.isFinite(precio) || precio <= 0) {
      Alert.alert('Revisa el formulario', 'Completa nombre, categoría, precio válido, imagen y descripción.');
      return;
    }

    const datos = {
      nombre: formulario.nombre.trim(),
      categoria: formulario.categoria.trim(),
      precio,
      imagen: formulario.imagen.trim(),
      descripcion: formulario.descripcion.trim(),
      rating: formulario.rating.trim() || '5.0',
    };

    setGuardando(true);
    try {
      if (idEditando) {
        await updateDoc(doc(db, 'productos', idEditando), datos);
      } else {
        await addDoc(collection(db, 'productos'), datos);
      }
      limpiarFormulario();
    } catch (error) {
      console.error('Error guardando producto:', error);
      Alert.alert('No se pudo guardar', 'Confirma que este usuario tiene el rol admin en Firestore.');
    } finally {
      setGuardando(false);
    }
  };

  const cargarParaEditar = (producto) => {
    setIdEditando(producto.id);
    setFormulario({
      nombre: producto.nombre || '',
      categoria: producto.categoria || producto.categoria_id?.nombre || producto.categoria_id || '',
      precio: String(producto.precio ?? ''),
      imagen: producto.imagen || producto.image || '',
      descripcion: producto.descripcion || '',
      rating: String(producto.rating || producto.calificacion || '5.0'),
    });
  };

  const confirmarEliminacion = (producto) => {
    Alert.alert('Eliminar producto', `¿Quieres eliminar ${producto.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'productos', producto.id));
          } catch (error) {
            console.error('Error eliminando producto:', error);
            Alert.alert('No se pudo eliminar', 'Confirma que tienes permisos de administrador.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.contenedor}>
      <View style={styles.encabezado}>
        <View>
          <Text style={styles.titulo}>Administrar productos</Text>
          <Text style={styles.usuario}>{user?.displayName || 'Administrador'}</Text>
          <Text style={styles.usuario}>{user?.email}</Text>
          <Text selectable style={styles.uid}>UID: {user?.uid}</Text>
        </View>
        <Pressable onPress={cerrarSesion}>
          <Text style={styles.enlace}>Salir</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitulo}>{idEditando ? 'Actualizar producto' : 'Agregar producto'}</Text>
      <TextInput style={styles.input} value={formulario.nombre} onChangeText={(value) => actualizarCampo('nombre', value)} placeholder="Nombre" />
      <TextInput style={styles.input} value={formulario.categoria} onChangeText={(value) => actualizarCampo('categoria', value)} placeholder="Categoría (Alitas, Papas...)" />
      <TextInput style={styles.input} value={formulario.precio} onChangeText={(value) => actualizarCampo('precio', value)} placeholder="Precio en córdobas" keyboardType="decimal-pad" />
      <TextInput style={styles.input} value={formulario.imagen} onChangeText={(value) => actualizarCampo('imagen', value)} placeholder="URL de la imagen" autoCapitalize="none" />
      <TextInput style={[styles.input, styles.multilinea]} value={formulario.descripcion} onChangeText={(value) => actualizarCampo('descripcion', value)} placeholder="Descripción" multiline />
      <TextInput style={styles.input} value={formulario.rating} onChangeText={(value) => actualizarCampo('rating', value)} placeholder="Calificación (opcional)" keyboardType="decimal-pad" />
      <Pressable style={[styles.boton, guardando && styles.deshabilitado]} onPress={guardarProducto} disabled={guardando}>
        <Text style={styles.botonTexto}>{guardando ? 'Guardando...' : idEditando ? 'Guardar cambios' : 'Agregar producto'}</Text>
      </Pressable>
      {idEditando && (
        <Pressable onPress={limpiarFormulario}>
          <Text style={styles.enlace}>Cancelar edición</Text>
        </Pressable>
      )}

      <Text style={styles.subtitulo}>Productos actuales ({productos.length})</Text>
      {productos.map((producto) => (
        <View key={producto.id} style={styles.producto}>
          <View style={styles.detalle}>
            <Text style={styles.nombre}>{producto.nombre}</Text>
            <Text style={styles.secundario}>{producto.categoria || producto.categoria_id} · C${producto.precio}</Text>
          </View>
          <Pressable onPress={() => cargarParaEditar(producto)}><Text style={styles.enlace}>Editar</Text></Pressable>
          <Pressable onPress={() => confirmarEliminacion(producto)}><Text style={styles.eliminar}>Borrar</Text></Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexGrow: 1, padding: 20, backgroundColor: '#f7f7f7' },
  encabezado: { marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { color: '#29292e', fontSize: 23, fontWeight: '800' },
  usuario: { marginTop: 4, color: '#666' },
  uid: { marginTop: 4, color: '#777', fontSize: 11 },
  subtitulo: { marginTop: 12, marginBottom: 10, color: '#29292e', fontSize: 18, fontWeight: '700' },
  input: { marginBottom: 10, padding: 12, borderRadius: 9, backgroundColor: '#fff', color: '#222' },
  multilinea: { minHeight: 76, textAlignVertical: 'top' },
  boton: { marginVertical: 6, padding: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#ed0016' },
  botonTexto: { color: '#fff', fontWeight: '700' },
  deshabilitado: { opacity: 0.6 },
  producto: { marginBottom: 9, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, backgroundColor: '#fff' },
  detalle: { flex: 1 },
  nombre: { color: '#29292e', fontWeight: '700' },
  secundario: { marginTop: 4, color: '#777' },
  enlace: { paddingVertical: 6, color: '#ed0016', fontWeight: '700' },
  eliminar: { paddingVertical: 6, color: '#b00020', fontWeight: '700' },
});
