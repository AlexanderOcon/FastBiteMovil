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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { CarritoContext } from '../context/CarritoContext';
import { eliminarImagenProducto, subirImagenProducto } from '../services/supabaseStorage';
import ListaProductosAdmin from '../components/admin/ListaProductosAdmin';
import FormularioProductoAdmin from '../components/admin/FormularioProductoAdmin';

const formularioVacio = {
  nombre: '',
  categoria: '',
  precio: '',
  imagen: '',
  descripcion: '',
  rating: '5.0',
};

// Convierte un valor que venga como objeto, arreglo o número a un texto seguro para mostrarse en pantalla.
function textoSeguro(valor) {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (Array.isArray(valor)) return valor.map((item) => textoSeguro(item)).filter(Boolean).join(', ');
  if (valor && typeof valor === 'object') {
    return textoSeguro(valor.nombre || valor.descripcion || valor.titulo || valor.label || '');
  }
  return '';
}

export default function AdminProductos({ navigation }) {
  const { user } = useAuth();
  const { cerrarSesion } = useContext(CarritoContext);
  const [productos, setProductos] = useState([]);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [idEditando, setIdEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [mostrarCategorias, setMostrarCategorias] = useState(false);

  useEffect(() => onSnapshot(
    collection(db, 'productos'),
    (snapshot) => setProductos(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    (error) => {
      console.error('Error cargando productos para administración:', error);
      Alert.alert('No se pudieron cargar los productos', 'Verifica los permisos de Firestore.');
    },
  ), []);

  // Actualiza un campo del formulario en tiempo real mientras el administrador escribe.
  const actualizarCampo = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  };

  // Reinicia el formulario cuando se cancela una edición o se guarda un producto nuevo.
  const limpiarFormulario = () => {
    setIdEditando(null);
    setFormulario(formularioVacio);
    setImagenSeleccionada(null);
  };

  const seleccionarImagen = async () => {
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (resultado.canceled) return;

      const imagen = resultado.assets[0];
      if (!imagen) {
        Alert.alert('No se pudo seleccionar la imagen', 'Vuelve a elegir el archivo.');
        return;
      }

      const tipoMime = imagen.mimeType || imagen.file?.type || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(tipoMime)) {
        Alert.alert('Formato no compatible', 'Selecciona una imagen JPG, PNG o WebP.');
        return;
      }
      const tamanoBase64 = imagen.base64
        ? Math.floor((imagen.base64.length * 3) / 4)
          - (imagen.base64.endsWith('==') ? 2 : imagen.base64.endsWith('=') ? 1 : 0)
        : 0;
      if (tamanoBase64 > 8 * 1024 * 1024) {
        Alert.alert('Imagen demasiado grande', 'Selecciona una imagen que pese menos de 8 MB.');
        return;
      }

      setImagenSeleccionada(imagen);
    } catch (error) {
      console.error('Error seleccionando imagen del producto:', error);
      Alert.alert('No se pudo abrir la galería', 'Inténtalo de nuevo y verifica los permisos del dispositivo.');
    }
  };

  // Guarda un producto nuevo o actualiza el actual en Firestore.
  const guardarProducto = async () => {
    const precio = Math.trunc(Number(formulario.precio));
    if (!formulario.nombre.trim() || !formulario.categoria.trim()
      || (!imagenSeleccionada && !formulario.imagen.trim())
      || !formulario.descripcion.trim() || !Number.isFinite(precio) || precio <= 0) {
      Alert.alert('Revisa el formulario', 'Completa nombre, categoría, precio válido, imagen y descripción.');
      return;
    }

    setGuardando(true);
    let imagenSubida = null;
    try {
      let urlImagen = formulario.imagen.trim();
      if (imagenSeleccionada) {
        imagenSubida = await subirImagenProducto(imagenSeleccionada);
        urlImagen = imagenSubida.url;
      }

      const datos = {
        nombre: formulario.nombre.trim(),
        categoria: formulario.categoria.trim(),
        precio,
        imagen: urlImagen,
        image: urlImagen,
        descripcion: formulario.descripcion.trim(),
        rating: formulario.rating.trim() || '5.0',
      };

      if (idEditando) {
        await updateDoc(doc(db, 'productos', idEditando), datos);
      } else {
        await addDoc(collection(db, 'productos'), datos);
      }
      limpiarFormulario();
    } catch (error) {
      if (imagenSubida) {
        try {
          await eliminarImagenProducto(imagenSubida.path);
        } catch (errorLimpieza) {
          console.error('No se pudo limpiar la imagen tras fallar el guardado del producto:', errorLimpieza);
        }
      }
      console.error('Error guardando producto:', error);
      Alert.alert('No se pudo guardar', error.message || 'Verifica la configuración de Supabase y los permisos de Firestore.');
    } finally {
      setGuardando(false);
    }
  };

  // Carga un producto ya existente para editarlo en el formulario.
  const cargarParaEditar = (producto) => {
    setIdEditando(producto.id);
    setImagenSeleccionada(null);
    setFormulario({
      nombre: textoSeguro(producto.nombre || ''),
      categoria: textoSeguro(producto.categoria || producto.categoria_id?.nombre || producto.categoria_id || ''),
      precio: String(Math.trunc(Number(producto.precio) || 0)),
      imagen: textoSeguro(producto.imagen || producto.image || ''),
      descripcion: textoSeguro(producto.descripcion || ''),
      rating: String(producto.rating || producto.calificacion || '5.0'),
    });
  };

  // Pide confirmación antes de eliminar un producto de la base de datos.
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

  const productosFiltrados = productos.filter((producto) => {
    const textoProducto = [
      producto.nombre,
      producto.categoria?.nombre || producto.categoria_id?.nombre || producto.categoria_id || producto.categoria,
      producto.descripcion,
    ].map((valor) => textoSeguro(valor)).join(' ').toLowerCase();
    return textoProducto.includes(busqueda.trim().toLowerCase());
  });

  return (
    <ScrollView contentContainerStyle={styles.contenedor}>
      <View style={styles.encabezado}>
        <View style={styles.encabezadoTexto}>
          <Text style={styles.etiquetaEncabezado}>FASTBITE · ADMINISTRACIÓN</Text>
          <Text style={styles.titulo}>Productos</Text>
          <Text style={styles.descripcion}>Gestiona los productos de tu menú.</Text>
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

      <View style={styles.resumen}>
        <View style={styles.iconoResumen}>
          <Ionicons name="fast-food-outline" size={22} color="#ed0016" />
        </View>
        <View style={styles.detalleResumen}>
          <Text style={styles.totalResumen}>{productos.length}</Text>
          <Text style={styles.textoResumen}>productos en el menú</Text>
        </View>
        <View style={styles.etiquetaMenu}>
          <Ionicons name="restaurant-outline" size={14} color="#c90014" />
          <Text style={styles.textoEtiquetaMenu}>Menú</Text>
        </View>
      </View>

      <FormularioProductoAdmin
        formulario={formulario}
        idEditando={idEditando}
        guardando={guardando}
        imagenSeleccionada={imagenSeleccionada}
        mostrarCategorias={mostrarCategorias}
        setMostrarCategorias={setMostrarCategorias}
        actualizarCampo={actualizarCampo}
        seleccionarImagen={seleccionarImagen}
        guardarProducto={guardarProducto}
        limpiarFormulario={limpiarFormulario}
        styles={styles}
      />

      <View style={styles.encabezadoLista}>
        <View style={styles.encabezadoListaTexto}>
          <Text style={styles.subtituloLista}>Productos actuales</Text>
          <Text style={styles.cantidadLista}>{productos.length} en total</Text>
        </View>
      </View>

      <View style={styles.buscador}>
        <Ionicons name="search-outline" size={18} color="#858995" />
        <TextInput
          style={styles.inputBusqueda}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre o categoría"
          placeholderTextColor="#999"
          accessibilityLabel="Buscar productos por nombre o categoría"
          returnKeyType="search"
        />
        {busqueda.length > 0 && (
          <Pressable
            onPress={() => setBusqueda('')}
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
          >
            <Ionicons name="close-circle" size={18} color="#858995" />
          </Pressable>
        )}
      </View>

      <ListaProductosAdmin
        productos={productosFiltrados}
        totalProductos={productos.length}
        textoSeguro={textoSeguro}
        cargarParaEditar={cargarParaEditar}
        confirmarEliminacion={confirmarEliminacion}
        styles={styles}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 24,
    backgroundColor: '#f5f6f8',
  },
  encabezado: {
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  encabezadoTexto: {
    flex: 1,
  },
  etiquetaEncabezado: {
    marginBottom: 4,
    color: '#c90014',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  titulo: {
    color: '#242630',
    fontSize: 25,
    fontWeight: '800',
  },
  descripcion: {
    marginTop: 6,
    color: '#777b86',
    fontSize: 13,
    lineHeight: 18,
  },
  botonSalir: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#ffe0e3',
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  textoSalir: {
    color: '#c90014',
    fontSize: 12,
    fontWeight: '800',
  },
  resumen: {
    minHeight: 76,
    marginBottom: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 18,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#222',
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
  },
  iconoResumen: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#ffe7e9',
  },
  detalleResumen: {
    flex: 1,
    marginLeft: 11,
  },
  totalResumen: {
    color: '#242630',
    fontSize: 19,
    fontWeight: '900',
  },
  textoResumen: {
    marginTop: 2,
    color: '#777b86',
    fontSize: 11,
  },
  etiquetaMenu: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 11,
    backgroundColor: '#fff0f1',
  },
  textoEtiquetaMenu: {
    color: '#c90014',
    fontSize: 11,
    fontWeight: '800',
  },
  formulario: {
    marginBottom: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 18,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#222',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  tituloFormularioFila: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconoFormulario: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#fff0f1',
  },
  detalleTituloFormulario: {
    flex: 1,
  },
  subtitulo: {
    color: '#242630',
    fontSize: 16,
    fontWeight: '800',
  },
  ayudaFormulario: {
    marginTop: 3,
    color: '#858995',
    fontSize: 11,
  },
  etiquetaCampo: {
    marginBottom: 6,
    color: '#50535e',
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    minHeight: 44,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 12,
    backgroundColor: '#f8f8fa',
    color: '#242630',
    fontSize: 13,
  },
  selectorCategoria: {
    minHeight: 44,
    marginBottom: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 12,
    backgroundColor: '#f8f8fa',
  },
  textoSelectorCategoria: {
    color: '#242630',
    fontSize: 13,
    fontWeight: '600',
  },
  textoSelectorCategoriaVacio: {
    color: '#999',
  },
  menuCategorias: {
    marginTop: -4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  opcionCategoria: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f4',
  },
  opcionCategoriaActiva: {
    backgroundColor: '#fff0f1',
  },
  textoOpcionCategoria: {
    color: '#242630',
    fontSize: 13,
    fontWeight: '600',
  },
  textoOpcionCategoriaActiva: {
    color: '#c90014',
  },
  multilinea: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  selectorImagen: {
    minHeight: 88,
    marginBottom: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 14,
    backgroundColor: '#f8f8fa',
  },
  vistaPreviaImagen: {
    width: 68,
    height: 68,
    borderRadius: 13,
  },
  iconoImagenVacia: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#fff0f1',
  },
  detalleImagen: {
    flex: 1,
  },
  nombreImagen: {
    color: '#242630',
    fontSize: 12,
    fontWeight: '700',
  },
  ayudaImagen: {
    marginTop: 4,
    color: '#858995',
    fontSize: 10,
  },
  botonImagen: {
    minHeight: 30,
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#ffe0e3',
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  textoBotonImagen: {
    color: '#c90014',
    fontSize: 10,
    fontWeight: '800',
  },
  boton: {
    minHeight: 46,
    marginTop: 2,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    backgroundColor: '#ed0016',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  deshabilitado: {
    opacity: 0.6,
  },
  botonCancelarEdicion: {
    marginTop: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  textoCancelarEdicion: {
    color: '#c90014',
    fontSize: 12,
    fontWeight: '700',
  },
  encabezadoLista: {
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  encabezadoListaTexto: {
    flex: 1,
  },
  subtituloLista: {
    color: '#242630',
    fontSize: 16,
    fontWeight: '800',
  },
  cantidadLista: {
    marginTop: 3,
    color: '#858995',
    fontSize: 11,
  },
  buscador: {
    height: 46,
    marginBottom: 13,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  inputBusqueda: {
    flex: 1,
    color: '#242630',
    fontSize: 13,
  },
  producto: {
    minHeight: 84,
    marginBottom: 11,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 17,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#222',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  imagenProducto: {
    width: 60,
    height: 60,
    borderRadius: 15,
  },
  imagenVacia: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff0f1',
  },
  detalle: {
    flex: 1,
  },
  nombre: {
    color: '#242630',
    fontSize: 13,
    fontWeight: '800',
  },
  secundario: {
    marginTop: 4,
    color: '#858995',
    fontSize: 11,
  },
  precio: {
    marginTop: 5,
    color: '#c90014',
    fontSize: 13,
    fontWeight: '900',
  },
  accionesProducto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  botonEditar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#fff0f1',
  },
  botonEliminar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#fff1f0',
  },
  vacio: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  iconoVacio: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: '#ffe7e9',
  },
  tituloVacio: {
    marginTop: 14,
    color: '#242630',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  textoVacio: {
    marginTop: 6,
    color: '#777b86',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
