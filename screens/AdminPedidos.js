import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import FiltrosPedidosAdmin from '../components/admin/FiltrosPedidosAdmin';
import TarjetaPedidoAdmin from '../components/admin/TarjetaPedidoAdmin';

const filtrosEstado = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'en-preparacion', etiqueta: 'Preparación' },
  { valor: 'enviado', etiqueta: 'Enviados' },
  { valor: 'recibido', etiqueta: 'Recibidos' },
  { valor: 'cancelado', etiqueta: 'Cancelados' },
];

function normalizarEstadoPedido(estado) {
  const valor = String(estado || 'pendiente').toLowerCase().replace(/_/g, '-');
  return valor === 'preparacion' ? 'en-preparacion' : valor;
}

function obtenerEtiquetaEstado(estado) {
  const valor = normalizarEstadoPedido(estado);
  if (valor === 'cancelado') return 'Pedido Cancelado';
  if (valor === 'en-preparacion') return 'Recibido, En preparación';
  if (valor === 'enviado') return 'Enviado';
  if (valor === 'recibido') return 'Recibido';
  return 'Pendiente';
}

function formatearFecha(fecha) {
  if (!fecha) return 'Fecha no disponible';
  if (fecha?.toDate) return fecha.toDate().toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' });
  if (fecha instanceof Date) return fecha.toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' });
  if (typeof fecha === 'string') return new Date(fecha).toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' });
  return 'Fecha no disponible';
}

function formatearPrecio(valor) {
  const precio = Math.trunc(Number(valor));
  return `C$${Number.isFinite(precio) ? precio.toLocaleString('es-NI') : '0'}`;
}

function obtenerTiempo(fecha) {
  if (fecha?.toDate) return fecha.toDate().getTime();
  if (fecha instanceof Date) return fecha.getTime();
  if (typeof fecha === 'string') return Date.parse(fecha) || 0;
  return 0;
}

export default function AdminPedidos({ navigation }) {
  const [pedidos, setPedidos] = useState([]);
  const [nombresUsuarios, setNombresUsuarios] = useState({});
  const [pedidoExpandido, setPedidoExpandido] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const usuariosConsultados = useRef(new Set());

  useEffect(() => {
    let activo = true;
    const unsubscribe = onSnapshot(
      collection(db, 'pedido'),
      (snapshot) => {
        const resultados = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
        resultados.sort((primero, segundo) => obtenerTiempo(segundo.fecha) - obtenerTiempo(primero.fecha));
        setPedidos(resultados);

        const usuariosPorConsultar = [...new Set(
          resultados
            .filter((pedido) => !pedido.usuarioNombre && pedido.usuarioId && !usuariosConsultados.current.has(pedido.usuarioId))
            .map((pedido) => pedido.usuarioId),
        )];
        usuariosPorConsultar.forEach((usuarioId) => usuariosConsultados.current.add(usuarioId));

        Promise.all(usuariosPorConsultar.map(async (usuarioId) => {
          try {
            const perfil = await getDoc(doc(db, 'usuarios', usuarioId));
            return [usuarioId, perfil.exists() ? perfil.data().username : ''];
          } catch (error) {
            console.error(`Error cargando el nombre del usuario ${usuarioId}:`, error);
            return null;
          }
        })).then((perfiles) => {
          if (!activo) return;
          const nombres = perfiles.filter((perfil) => perfil?.[1]);
          if (nombres.length > 0) {
            setNombresUsuarios((actuales) => ({
              ...actuales,
              ...Object.fromEntries(nombres),
            }));
          }
          if (perfiles.some((perfil) => perfil === null)) {
            Alert.alert('No se pudieron cargar algunos nombres', 'Verifica los permisos de lectura de perfiles en Firestore.');
          }
        });
      },
      (error) => {
        console.error('Error cargando pedidos para administración:', error);
        Alert.alert('No se pudieron cargar los pedidos', 'Verifica los permisos de Firestore.');
      },
    );

    return () => {
      activo = false;
      unsubscribe();
    };
  }, []);

  const cambiarEstadoPedido = async (pedido, siguienteEstado) => {
    try {
      await updateDoc(doc(db, 'pedido', pedido.id), {
        estado: siguienteEstado,
      });

      if (siguienteEstado === 'cancelado') {
        Alert.alert('Pedido cancelado', 'El cliente verá este pedido como Pedido Cancelado.');
        return;
      }

      Alert.alert('Pedido actualizado', `El pedido quedó como ${obtenerEtiquetaEstado(siguienteEstado)}.`);
    } catch (error) {
      console.error('Error actualizando el estado del pedido:', error);
      Alert.alert('No se pudo actualizar el pedido', 'Verifica tu conexión y permisos de Firestore.');
    }
  };

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const estado = normalizarEstadoPedido(pedido.estado);
    const nombreCliente = pedido.usuarioNombre
      || nombresUsuarios[pedido.usuarioId]
      || pedido.correo
      || 'Cliente sin nombre';
    const textoPedido = [
      nombreCliente,
      pedido.correo,
      pedido.direccionEntrega?.direccion,
      pedido.direccionEntrega?.telefono,
    ].filter(Boolean).join(' ').toLowerCase();

    return (filtroEstado === 'todos' || estado === filtroEstado)
      && textoPedido.includes(busqueda.trim().toLowerCase());
  });

  return (
    <ScrollView contentContainerStyle={styles.contenedor}>
      <FiltrosPedidosAdmin
        navigation={navigation}
        pedidos={pedidos}
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
        filtrosEstado={filtrosEstado}
        normalizarEstadoPedido={normalizarEstadoPedido}
        styles={styles}
      />

      <Text style={styles.tituloLista}>
        {filtroEstado === 'todos' ? 'Pedidos recientes' : filtrosEstado.find((filtro) => filtro.valor === filtroEstado)?.etiqueta}
        <Text style={styles.cantidadLista}> · {pedidosFiltrados.length}</Text>
      </Text>

      {pedidos.length === 0 || pedidosFiltrados.length === 0 ? (
        <View style={styles.vacio}>
          <View style={styles.iconoVacio}>
            <Ionicons
              name={pedidos.length === 0 ? 'receipt-outline' : 'search-outline'}
              size={30}
              color="#ed0016"
            />
          </View>
          <Text style={styles.tituloVacio}>
            {pedidos.length === 0 ? 'Todavía no hay pedidos' : 'No encontramos pedidos'}
          </Text>
          <Text style={styles.textoVacio}>
            {pedidos.length === 0
              ? 'Cuando un cliente realice una compra, aparecerá aquí.'
              : 'Prueba con otro cliente o selecciona un estado distinto.'}
          </Text>
        </View>
      ) : (
        pedidosFiltrados.map((pedido) => (
          <TarjetaPedidoAdmin
            key={pedido.id}
            pedido={pedido}
            nombresUsuarios={nombresUsuarios}
            pedidoExpandido={pedidoExpandido}
            setPedidoExpandido={setPedidoExpandido}
            cambiarEstadoPedido={cambiarEstadoPedido}
            normalizarEstadoPedido={normalizarEstadoPedido}
            obtenerEtiquetaEstado={obtenerEtiquetaEstado}
            formatearFecha={formatearFecha}
            formatearPrecio={formatearPrecio}
            styles={styles}
          />
        ))
      )}
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
  subtitulo: {
    marginTop: 6,
    color: '#777b86',
    fontSize: 13,
    lineHeight: 18,
  },
  botonProductos: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#ffe0e3',
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  enlace: {
    color: '#ed0016',
    fontSize: 12,
    fontWeight: '800',
  },
  resumen: {
    minHeight: 76,
    marginBottom: 14,
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
  textoResumen: {
    flex: 1,
    marginLeft: 11,
  },
  totalResumen: {
    color: '#242630',
    fontSize: 19,
    fontWeight: '900',
  },
  detalleResumen: {
    marginTop: 2,
    color: '#777b86',
    fontSize: 11,
  },
  resumenPendientes: {
    alignItems: 'flex-end',
  },
  numeroPendientes: {
    color: '#c90014',
    fontSize: 17,
    fontWeight: '900',
  },
  etiquetaPendientes: {
    marginTop: 2,
    color: '#777b86',
    fontSize: 10,
  },
  buscador: {
    height: 46,
    marginBottom: 12,
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
  carruselFiltros: {
    height: 48,
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 12,
  },
  filtros: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 18,
  },
  filtro: {
    height: 36,
    flexShrink: 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  filtroActivo: {
    borderColor: '#ed0016',
    backgroundColor: '#ed0016',
  },
  textoFiltro: {
    color: '#666b75',
    fontSize: 11,
    fontWeight: '700',
  },
  textoFiltroActivo: {
    color: '#fff',
  },
  contadorFiltro: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 2,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#f1f1f3',
    color: '#666b75',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  contadorFiltroActivo: {
    backgroundColor: '#fff',
    color: '#c90014',
  },
  tituloLista: {
    marginBottom: 11,
    color: '#242630',
    fontSize: 15,
    fontWeight: '800',
  },
  cantidadLista: {
    color: '#858995',
    fontSize: 13,
    fontWeight: '600',
  },
  pedidoCard: {
    marginBottom: 13,
    padding: 15,
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
  pedidoHeader: {
    minHeight: 53,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  encabezadoCliente: {
    flex: 1,
    marginRight: 8,
  },
  filaCliente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconoCliente: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#fff0f1',
  },
  encabezadoEstado: {
    alignItems: 'flex-end',
    gap: 6,
  },
  flechaPedido: {
    marginRight: 4,
  },
  pedidoNumero: {
    flex: 1,
    color: '#242630',
    fontSize: 14,
    fontWeight: '800',
  },
  filaFecha: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pedidoFecha: {
    color: '#858995',
    fontSize: 10,
  },
  filaDetalle: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  pedidoDetalle: {
    flex: 1,
    color: '#666b75',
    fontSize: 11,
    lineHeight: 16,
  },
  productosPedido: {
    marginTop: 11,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eceef2',
  },
  productoPedido: {
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagenProducto: {
    width: 52,
    height: 52,
    borderRadius: 13,
  },
  imagenVacia: {
    backgroundColor: '#f2f2f2',
  },
  detalleProducto: {
    flex: 1,
    marginHorizontal: 10,
  },
  nombreProducto: {
    color: '#242630',
    fontSize: 13,
    fontWeight: '700',
  },
  textoProducto: {
    marginTop: 3,
    color: '#858995',
    fontSize: 11,
  },
  subtotalProducto: {
    color: '#242630',
    fontSize: 12,
    fontWeight: '700',
  },
  filaTotal: {
    marginTop: 13,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eceef2',
  },
  etiquetaTotal: {
    color: '#242630',
    fontSize: 13,
    fontWeight: '800',
  },
  totalPedido: {
    color: '#c90014',
    fontWeight: '900',
    fontSize: 18,
  },
  estadoPedido: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#fff1d6',
  },
  estadoPedidoEnviado: {
    backgroundColor: '#e6f5ec',
  },
  estadoPedidoRecibido: {
    backgroundColor: '#e9edff',
  },
  estadoPedidoPreparacion: {
    backgroundColor: '#fff2d8',
  },
  estadoPedidoCancelado: {
    backgroundColor: '#fbe7e7',
  },
  estadoTexto: {
    color: '#8c5a00',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  estadoTextoEnviado: {
    color: '#0b7d43',
  },
  estadoTextoRecibido: {
    color: '#2544b4',
  },
  estadoTextoPreparacion: {
    color: '#8a5d00',
  },
  estadoTextoCancelado: {
    color: '#b42318',
  },
  botonesContainer: {
    marginTop: 12,
    gap: 8,
  },
  botonEstado: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    backgroundColor: '#ed0016',
  },
  botonCancelar: {
    borderWidth: 1,
    borderColor: '#f3c4c7',
    backgroundColor: '#fff5f5',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  botonCancelarTexto: {
    color: '#c90014',
  },
  vacio: {
    minHeight: 230,
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
    marginTop: 15,
    color: '#242630',
    fontSize: 16,
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
