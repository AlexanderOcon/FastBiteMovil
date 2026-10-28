import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';

function formatearPrecio(valor) {
  return `C$${Math.trunc(Number(valor) || 0).toLocaleString('es-NI')}`;
}

function textoSeguro(valor) {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number') return String(valor);
  if (valor && typeof valor === 'object') return textoSeguro(valor.nombre || '');
  return '';
}

export default function AdminOfertas() {
  const [productos, setProductos] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [productoIds, setProductoIds] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioOferta, setPrecioOferta] = useState('');
  const [idEditando, setIdEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => onSnapshot(
    collection(db, 'productos'),
    (snapshot) => setProductos(snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }))),
    (error) => {
      console.error('Error cargando productos para las ofertas:', error);
      Alert.alert('No se pudieron cargar los productos', 'Verifica los permisos de Firestore.');
    },
  ), []);

  useEffect(() => onSnapshot(
    collection(db, 'ofertas'),
    (snapshot) => setOfertas(snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    })).sort((a, b) => Number(b.createdAt?.seconds || 0) - Number(a.createdAt?.seconds || 0))),
    (error) => {
      console.error('Error cargando ofertas para administración:', error);
      Alert.alert('No se pudieron cargar las ofertas', 'Verifica los permisos de Firestore.');
    },
  ), []);

  const productosSeleccionados = productos.filter((producto) => productoIds.includes(producto.id));
  const precioRegular = productosSeleccionados.reduce(
    (suma, producto) => suma + Math.trunc(Number(producto.precio) || 0),
    0,
  );

  const limpiarFormulario = () => {
    setProductoIds([]);
    setTitulo('');
    setDescripcion('');
    setPrecioOferta('');
    setIdEditando(null);
  };

  const seleccionarProducto = (producto) => {
    if (productoIds.includes(producto.id)) {
      setPrecioOferta('');
      setProductoIds(productoIds.filter((id) => id !== producto.id));
      return;
    }
    if (productoIds.length === 0 && !idEditando && !titulo.trim()) {
      setTitulo(textoSeguro(producto.nombre));
    }
    setPrecioOferta('');
    setProductoIds([...productoIds, producto.id]);
  };

  const cargarEdicion = (oferta) => {
    setIdEditando(oferta.id);
    setProductoIds(
      Array.isArray(oferta.productoIds) && oferta.productoIds.length > 0
        ? oferta.productoIds
        : [oferta.productoId],
    );
    setTitulo(oferta.titulo || '');
    setDescripcion(oferta.descripcion || '');
    setPrecioOferta(String(oferta.precioOferta ?? ''));
  };

  const guardarOferta = async () => {
    const precioPromocional = Math.trunc(Number(precioOferta));
    if (productosSeleccionados.length === 0 || !titulo.trim() || precioRegular <= 0
      || productosSeleccionados.some((producto) => !Number.isFinite(Number(producto.precio)) || Number(producto.precio) <= 0)
      || !Number.isFinite(precioPromocional) || precioPromocional <= 0) {
      Alert.alert('Revisa la oferta', 'Selecciona uno o más productos e indica un título y un precio promocional válido.');
      return;
    }
    if (precioPromocional >= precioRegular) {
      Alert.alert('Precio no promocional', 'El precio de oferta debe ser menor que el precio regular del producto.');
      return;
    }

    setGuardando(true);
    try {
      const productosOferta = productosSeleccionados.map((producto) => ({
        id: producto.id,
        nombre: textoSeguro(producto.nombre),
        categoria: textoSeguro(producto.categoria),
        precio: Math.trunc(Number(producto.precio)),
        imagen: textoSeguro(producto.imagen || producto.image),
      }));
      const primerProducto = productosSeleccionados[0];
      const datos = {
        productoId: primerProducto.id,
        productoIds: productosOferta.map((producto) => producto.id),
        productos: productosOferta,
        nombreProducto: productosOferta.map((producto) => producto.nombre).join(', '),
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        precioOriginal: precioRegular,
        precioOferta: precioPromocional,
        imagen: productosOferta[0].imagen,
        activa: idEditando
          ? ofertas.find((oferta) => oferta.id === idEditando)?.activa ?? true
          : true,
        updatedAt: serverTimestamp(),
      };

      if (idEditando) {
        await updateDoc(doc(db, 'ofertas', idEditando), datos);
        Alert.alert('Oferta actualizada', 'Los cambios ya aparecen en el carrusel.');
      } else {
        await addDoc(collection(db, 'ofertas'), {
          ...datos,
          createdAt: serverTimestamp(),
        });
        Alert.alert('Oferta creada', 'La oferta activa ya aparece en el carrusel.');
      }
      limpiarFormulario();
    } catch (error) {
      console.error('Error guardando la oferta:', error);
      Alert.alert('No se pudo guardar la oferta', error.message || 'Verifica los permisos de Firestore.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarActiva = async (oferta) => {
    try {
      await updateDoc(doc(db, 'ofertas', oferta.id), {
        activa: !oferta.activa,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error cambiando el estado de la oferta:', error);
      Alert.alert('No se pudo actualizar la oferta', 'Verifica los permisos de Firestore.');
    }
  };

  const confirmarEliminar = (oferta) => {
    Alert.alert('Eliminar oferta', `¿Eliminar la oferta "${oferta.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'ofertas', oferta.id));
            if (idEditando === oferta.id) limpiarFormulario();
          } catch (error) {
            console.error('Error eliminando oferta:', error);
            Alert.alert('No se pudo eliminar', 'Verifica los permisos de Firestore.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.contenedor} keyboardShouldPersistTaps="handled">
      <View style={styles.encabezado}>
        <View style={styles.iconoEncabezado}>
          <Ionicons name="pricetag-outline" size={23} color="#ed0016" />
        </View>
        <Text style={styles.etiquetaEncabezado}>FASTBITE · ADMINISTRACIÓN</Text>
        <Text style={styles.titulo}>Ofertas de venta</Text>
        <Text style={styles.descripcion}>
          Crea promociones para mostrar en el carrusel del catálogo.
        </Text>
      </View>

      <View style={styles.tarjetaFormulario}>
        <Text style={styles.tituloFormulario}>
          {idEditando ? 'Editar oferta' : 'Nueva oferta'}
        </Text>
        <Text style={styles.etiquetaCampo}>Productos del menú (selecciona varios)</Text>
        {productos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listaProductos}>
            {productos.map((producto) => (
              <Pressable
                key={producto.id}
                style={[
                  styles.productoOpcion,
                  productoIds.includes(producto.id) && styles.productoOpcionActivo,
                ]}
                onPress={() => seleccionarProducto(producto)}
                accessibilityRole="button"
                accessibilityState={{ selected: productoIds.includes(producto.id) }}
              >
                <Text
                  style={[
                    styles.textoProductoOpcion,
                    productoIds.includes(producto.id) && styles.textoProductoOpcionActivo,
                  ]}
                  numberOfLines={1}
                >
                  {textoSeguro(producto.nombre) || 'Producto'}
                </Text>
                <Text style={styles.precioProductoOpcion}>{formatearPrecio(producto.precio)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.avisoSinProductos}>Primero agrega productos al menú.</Text>
        )}
        <Text style={styles.resumenSeleccion}>
          {productosSeleccionados.length
            ? `${productosSeleccionados.length} ${productosSeleccionados.length === 1 ? 'producto seleccionado' : 'productos seleccionados'} · Total regular ${formatearPrecio(precioRegular)}`
            : 'Selecciona los productos que incluirá el combo.'}
        </Text>

        <Text style={styles.etiquetaCampo}>Título de la oferta</Text>
        <TextInput
          style={styles.input}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ej. Combo especial"
          placeholderTextColor="#999"
          maxLength={60}
        />
        <Text style={styles.etiquetaCampo}>Precio promocional en córdobas</Text>
        <TextInput
          style={styles.input}
          value={precioOferta}
          onChangeText={(valor) => setPrecioOferta(valor.replace(/[^\d]/g, ''))}
          placeholder={productosSeleccionados.length ? `Menos de ${formatearPrecio(precioRegular)}` : 'Ej. 180'}
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
        <Text style={styles.ayudaPrecio}>Precio único por el combo; debe ser menor que el total regular.</Text>
        <Text style={styles.etiquetaCampo}>Descripción de la oferta (opcional)</Text>
        <TextInput
          style={[styles.input, styles.inputMultilinea]}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Ej. Aprovecha esta promoción por tiempo limitado"
          placeholderTextColor="#999"
          multiline
          maxLength={120}
        />
        {productosSeleccionados.length > 0 ? (
          <View style={styles.previsualizacion}>
            {productosSeleccionados[0].imagen || productosSeleccionados[0].image ? (
              <Image
                source={{ uri: textoSeguro(productosSeleccionados[0].imagen || productosSeleccionados[0].image) }}
                style={styles.imagenPrevisualizacion}
              />
            ) : null}
            <View style={styles.detallePrevisualizacion}>
              <Text style={styles.textoPrevisualizacion}>Productos que incluye el combo</Text>
              <Text style={styles.nombrePrevisualizacion} numberOfLines={1}>
                {productosSeleccionados.map((producto) => textoSeguro(producto.nombre)).join(', ')}
              </Text>
            </View>
          </View>
        ) : null}
        <Pressable
          style={[styles.boton, guardando && styles.botonDeshabilitado]}
          onPress={guardarOferta}
          disabled={guardando || productos.length === 0}
          accessibilityRole="button"
        >
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={idEditando ? 'save-outline' : 'add-circle-outline'} size={19} color="#fff" />
              <Text style={styles.textoBoton}>{idEditando ? 'Guardar cambios' : 'Crear oferta'}</Text>
            </>
          )}
        </Pressable>
        {idEditando && (
          <Pressable style={styles.botonCancelar} onPress={limpiarFormulario}>
            <Text style={styles.textoCancelar}>Cancelar edición</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.encabezadoLista}>
        <Text style={styles.tituloLista}>Ofertas creadas</Text>
        <Text style={styles.conteoLista}>{ofertas.length} en total</Text>
      </View>
      {ofertas.length === 0 ? (
        <View style={styles.estadoVacio}>
          <Ionicons name="pricetag-outline" size={25} color="#858995" />
          <Text style={styles.textoVacio}>Todavía no hay ofertas para mostrar.</Text>
        </View>
      ) : ofertas.map((oferta) => (
        <View key={oferta.id} style={styles.tarjetaOferta}>
          {oferta.imagen ? (
            <Image source={{ uri: oferta.imagen }} style={styles.imagenOferta} />
          ) : (
            <View style={[styles.imagenOferta, styles.imagenVacia]}>
              <Ionicons name="fast-food-outline" size={22} color="#ed0016" />
            </View>
          )}
          <View style={styles.detalleOferta}>
            <Text style={styles.tituloOferta} numberOfLines={1}>{oferta.titulo}</Text>
            <Text style={styles.nombreProductoOferta} numberOfLines={1}>{oferta.nombreProducto}</Text>
            <View style={styles.filaPrecios}>
              <Text style={styles.precioPromocional}>{formatearPrecio(oferta.precioOferta)}</Text>
              <Text style={styles.precioRegular}>{formatearPrecio(oferta.precioOriginal)}</Text>
            </View>
            <Text style={[styles.estadoOferta, oferta.activa ? styles.estadoActiva : styles.estadoInactiva]}>
              {oferta.activa ? 'Activa en el carrusel' : 'Pausada'}
            </Text>
          </View>
          <View style={styles.accionesOferta}>
            <Pressable
              style={styles.botonAccion}
              onPress={() => cambiarActiva(oferta)}
              accessibilityRole="button"
              accessibilityLabel={oferta.activa ? 'Pausar oferta' : 'Activar oferta'}
            >
              <Ionicons
                name={oferta.activa ? 'pause-circle-outline' : 'play-circle-outline'}
                size={22}
                color={oferta.activa ? '#8a5d00' : '#0b7d43'}
              />
            </Pressable>
            <Pressable
              style={styles.botonAccion}
              onPress={() => cargarEdicion(oferta)}
              accessibilityRole="button"
              accessibilityLabel={`Editar oferta ${oferta.titulo}`}
            >
              <Ionicons name="create-outline" size={20} color="#ed0016" />
            </Pressable>
            <Pressable
              style={styles.botonAccion}
              onPress={() => confirmarEliminar(oferta)}
              accessibilityRole="button"
              accessibilityLabel={`Eliminar oferta ${oferta.titulo}`}
            >
              <Ionicons name="trash-outline" size={20} color="#b42318" />
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 32,
    backgroundColor: '#f5f6f8',
  },
  encabezado: {
    marginBottom: 17,
  },
  iconoEncabezado: {
    width: 46,
    height: 46,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: '#ffe7e9',
  },
  etiquetaEncabezado: {
    color: '#c90014',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  titulo: {
    marginTop: 4,
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
  tarjetaFormulario: {
    marginBottom: 24,
    padding: 17,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 19,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#222',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  tituloFormulario: {
    marginBottom: 15,
    color: '#242630',
    fontSize: 17,
    fontWeight: '800',
  },
  etiquetaCampo: {
    marginBottom: 7,
    color: '#50535e',
    fontSize: 12,
    fontWeight: '700',
  },
  listaProductos: {
    gap: 8,
    paddingBottom: 14,
  },
  productoOpcion: {
    minWidth: 105,
    maxWidth: 165,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e8eaf0',
    borderRadius: 13,
    backgroundColor: '#f8f9fb',
  },
  productoOpcionActivo: {
    borderColor: '#ed0016',
    backgroundColor: '#fff0f1',
  },
  textoProductoOpcion: {
    color: '#50535e',
    fontSize: 12,
    fontWeight: '700',
  },
  textoProductoOpcionActivo: {
    color: '#c90014',
  },
  precioProductoOpcion: {
    marginTop: 3,
    color: '#858995',
    fontSize: 11,
  },
  resumenSeleccion: {
    marginTop: -7,
    marginBottom: 14,
    color: '#777b86',
    fontSize: 11,
    lineHeight: 16,
  },
  avisoSinProductos: {
    marginBottom: 14,
    color: '#b42318',
    fontSize: 12,
  },
  input: {
    minHeight: 48,
    marginBottom: 13,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#e8eaf0',
    borderRadius: 12,
    backgroundColor: '#f8f9fb',
    color: '#242630',
    fontSize: 13,
  },
  inputMultilinea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  ayudaPrecio: {
    marginTop: -8,
    marginBottom: 13,
    color: '#858995',
    fontSize: 11,
  },
  previsualizacion: {
    marginBottom: 14,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 13,
    backgroundColor: '#f8f9fb',
  },
  imagenPrevisualizacion: {
    width: 46,
    height: 46,
    borderRadius: 11,
  },
  detallePrevisualizacion: {
    flex: 1,
  },
  textoPrevisualizacion: {
    color: '#858995',
    fontSize: 10,
  },
  nombrePrevisualizacion: {
    marginTop: 3,
    color: '#50535e',
    fontSize: 12,
    fontWeight: '700',
  },
  boton: {
    minHeight: 50,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 13,
    backgroundColor: '#ed0016',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBoton: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  botonCancelar: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 5,
  },
  textoCancelar: {
    color: '#c90014',
    fontSize: 12,
    fontWeight: '700',
  },
  encabezadoLista: {
    marginBottom: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tituloLista: {
    color: '#242630',
    fontSize: 17,
    fontWeight: '800',
  },
  conteoLista: {
    color: '#858995',
    fontSize: 12,
  },
  estadoVacio: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  textoVacio: {
    color: '#777b86',
    fontSize: 13,
  },
  tarjetaOferta: {
    marginBottom: 10,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  imagenOferta: {
    width: 58,
    height: 58,
    borderRadius: 12,
  },
  imagenVacia: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff0f1',
  },
  detalleOferta: {
    flex: 1,
    minWidth: 0,
  },
  tituloOferta: {
    color: '#242630',
    fontSize: 13,
    fontWeight: '800',
  },
  nombreProductoOferta: {
    marginTop: 2,
    color: '#858995',
    fontSize: 11,
  },
  filaPrecios: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  precioPromocional: {
    color: '#c90014',
    fontSize: 13,
    fontWeight: '800',
  },
  precioRegular: {
    color: '#858995',
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  estadoOferta: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
  },
  estadoActiva: {
    color: '#0b7d43',
  },
  estadoInactiva: {
    color: '#858995',
  },
  accionesOferta: {
    alignItems: 'center',
    gap: 5,
  },
  botonAccion: {
    minWidth: 34,
    minHeight: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
