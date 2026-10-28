import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FiltrosPedidosAdmin({
  navigation,
  pedidos,
  busqueda,
  setBusqueda,
  filtroEstado,
  setFiltroEstado,
  filtrosEstado,
  normalizarEstadoPedido,
  styles,
}) {
  const pendientes = pedidos.filter(
    (pedido) => normalizarEstadoPedido(pedido.estado) === 'pendiente',
  ).length;

  return (
    <>
      <View style={styles.encabezado}>
        <View style={styles.encabezadoTexto}>
          <Text style={styles.etiquetaEncabezado}>FASTBITE · ADMINISTRACIÓN</Text>
          <Text style={styles.titulo}>Pedidos</Text>
          <Text style={styles.subtitulo}>Revisa y gestiona los pedidos de tus clientes.</Text>
        </View>
        <Pressable
          style={styles.botonProductos}
          onPress={() => navigation.navigate('AdminProductos')}
          accessibilityRole="button"
        >
          <Ionicons name="fast-food-outline" size={16} color="#ed0016" />
          <Text style={styles.enlace}>Productos</Text>
        </Pressable>
      </View>

      <View style={styles.resumen}>
        <View style={styles.iconoResumen}>
          <Ionicons name="receipt-outline" size={22} color="#ed0016" />
        </View>
        <View style={styles.textoResumen}>
          <Text style={styles.totalResumen}>{pedidos.length}</Text>
          <Text style={styles.detalleResumen}>pedidos registrados</Text>
        </View>
        <View style={styles.resumenPendientes}>
          <Text style={styles.numeroPendientes}>{pendientes}</Text>
          <Text style={styles.etiquetaPendientes}>por atender</Text>
        </View>
      </View>

      <View style={styles.buscador}>
        <Ionicons name="search-outline" size={18} color="#858995" />
        <TextInput
          style={styles.inputBusqueda}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar cliente, correo o dirección"
          placeholderTextColor="#999"
          accessibilityLabel="Buscar pedidos por cliente, correo o dirección"
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

      <ScrollView
        style={styles.carruselFiltros}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtros}
      >
        {filtrosEstado.map((filtro) => {
          const seleccionado = filtroEstado === filtro.valor;
          const cantidad = filtro.valor === 'todos'
            ? pedidos.length
            : pedidos.filter(
              (pedido) => normalizarEstadoPedido(pedido.estado) === filtro.valor,
            ).length;
          return (
            <Pressable
              key={filtro.valor}
              style={[styles.filtro, seleccionado && styles.filtroActivo]}
              onPress={() => setFiltroEstado(filtro.valor)}
              accessibilityRole="button"
              accessibilityState={{ selected: seleccionado }}
            >
              <Text
                numberOfLines={1}
                style={[styles.textoFiltro, seleccionado && styles.textoFiltroActivo]}
              >
                {filtro.etiqueta}
              </Text>
              <Text style={[styles.contadorFiltro, seleccionado && styles.contadorFiltroActivo]}>
                {cantidad}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}
