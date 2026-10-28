import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const categoriasDisponibles = ['Alitas', 'Hamburguesas', 'Papas', 'Bebidas'];

function formatearPrecioInput(valor) {
  const numero = `${valor ?? ''}`.replace(/[^\d]/g, '');
  if (!numero) return '';
  const precio = Number(numero);
  return `C$ ${Number.isFinite(precio) ? precio.toLocaleString('es-NI') : numero}`;
}

export default function FormularioProductoAdmin({
  formulario,
  idEditando,
  guardando,
  imagenSeleccionada,
  mostrarCategorias,
  setMostrarCategorias,
  actualizarCampo,
  seleccionarImagen,
  guardarProducto,
  limpiarFormulario,
  styles,
}) {
  return (
    <View style={styles.formulario}>
      <View style={styles.tituloFormularioFila}>
        <View style={styles.iconoFormulario}>
          <Ionicons name={idEditando ? 'create-outline' : 'add-outline'} size={19} color="#ed0016" />
        </View>
        <View style={styles.detalleTituloFormulario}>
          <Text style={styles.subtitulo}>{idEditando ? 'Editar producto' : 'Agregar producto'}</Text>
          <Text style={styles.ayudaFormulario}>Completa los datos para actualizar tu menú.</Text>
        </View>
      </View>

      <Text style={styles.etiquetaCampo}>Nombre</Text>
      <TextInput
        style={styles.input}
        value={formulario.nombre}
        onChangeText={(value) => actualizarCampo('nombre', value)}
        placeholder="Ej. Alitas BBQ"
        placeholderTextColor="#999"
        accessibilityLabel="Nombre del producto"
      />
      <Text style={styles.etiquetaCampo}>Categoría</Text>
      <Pressable
        style={styles.selectorCategoria}
        onPress={() => setMostrarCategorias((actual) => !actual)}
        accessibilityRole="button"
        accessibilityLabel="Seleccionar categoría del producto"
      >
        <Text style={[styles.textoSelectorCategoria, !formulario.categoria && styles.textoSelectorCategoriaVacio]}>
          {formulario.categoria || 'Selecciona una categoría'}
        </Text>
        <Ionicons
          name={mostrarCategorias ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={18}
          color="#858995"
        />
      </Pressable>

      {mostrarCategorias && (
        <View style={styles.menuCategorias}>
          {categoriasDisponibles.map((categoria) => (
            <Pressable
              key={categoria}
              style={[styles.opcionCategoria, formulario.categoria === categoria && styles.opcionCategoriaActiva]}
              onPress={() => {
                actualizarCampo('categoria', categoria);
                setMostrarCategorias(false);
              }}
            >
              <Text
                style={[
                  styles.textoOpcionCategoria,
                  formulario.categoria === categoria && styles.textoOpcionCategoriaActiva,
                ]}
              >
                {categoria}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.etiquetaCampo}>Precio en córdobas</Text>
      <TextInput
        style={styles.input}
        value={formatearPrecioInput(formulario.precio)}
        onChangeText={(value) => actualizarCampo('precio', `${value ?? ''}`.replace(/[^\d]/g, ''))}
        placeholder="C$ 180"
        placeholderTextColor="#999"
        keyboardType="numeric"
        accessibilityLabel="Precio en córdobas"
      />
      <Text style={styles.etiquetaCampo}>Imagen del producto</Text>
      <View style={styles.selectorImagen}>
        {(imagenSeleccionada?.uri || formulario.imagen) ? (
          <Image
            source={{ uri: imagenSeleccionada?.uri || formulario.imagen }}
            style={styles.vistaPreviaImagen}
          />
        ) : (
          <View style={styles.iconoImagenVacia}>
            <Ionicons name="image-outline" size={25} color="#ed0016" />
          </View>
        )}
        <View style={styles.detalleImagen}>
          <Text style={styles.nombreImagen} numberOfLines={1}>
            {imagenSeleccionada?.fileName || (imagenSeleccionada ? 'Imagen lista para subir' : formulario.imagen ? 'Imagen actual del producto' : 'Sin imagen seleccionada')}
          </Text>
          <Text style={styles.ayudaImagen}>JPG, PNG o WebP · máximo 8 MB</Text>
          <Pressable
            style={styles.botonImagen}
            onPress={seleccionarImagen}
            disabled={guardando}
            accessibilityRole="button"
            accessibilityLabel={formulario.imagen || imagenSeleccionada ? 'Cambiar imagen del producto' : 'Seleccionar imagen del producto'}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#c90014" />
            <Text style={styles.textoBotonImagen}>
              {imagenSeleccionada || formulario.imagen ? 'Cambiar imagen' : 'Seleccionar imagen'}
            </Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.etiquetaCampo}>Descripción</Text>
      <TextInput
        style={[styles.input, styles.multilinea]}
        value={formulario.descripcion}
        onChangeText={(value) => actualizarCampo('descripcion', value)}
        placeholder="Describe brevemente el producto"
        placeholderTextColor="#999"
        multiline
        accessibilityLabel="Descripción del producto"
      />
      <Text style={styles.etiquetaCampo}>Calificación (opcional)</Text>
      <TextInput
        style={styles.input}
        value={formulario.rating}
        onChangeText={(value) => actualizarCampo('rating', value)}
        placeholder="5.0"
        placeholderTextColor="#999"
        keyboardType="decimal-pad"
        accessibilityLabel="Calificación del producto"
      />
      <Pressable
        style={[styles.boton, guardando && styles.deshabilitado]}
        onPress={guardarProducto}
        disabled={guardando}
        accessibilityRole="button"
      >
        <Ionicons name={idEditando ? 'save-outline' : 'add-circle-outline'} size={19} color="#fff" />
        <Text style={styles.botonTexto}>
          {guardando ? 'Guardando...' : idEditando ? 'Guardar cambios' : 'Agregar producto'}
        </Text>
      </Pressable>
      {idEditando && (
        <Pressable
          style={styles.botonCancelarEdicion}
          onPress={limpiarFormulario}
          accessibilityRole="button"
        >
          <Text style={styles.textoCancelarEdicion}>Cancelar edición</Text>
        </Pressable>
      )}
    </View>
  );
}
