import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import TarjetaPedidoComponente from '../components/pedidos/TarjetaPedido';

function obtenerTiempo(fecha) {
  if (fecha?.toDate) return fecha.toDate().getTime();
  if (fecha instanceof Date) return fecha.getTime();
  if (typeof fecha === 'string') return Date.parse(fecha) || 0;
  return 0;
}

export default function Pedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState(user?.displayName || 'Cliente');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [alertasMostradas, setAlertasMostradas] = useState({});

  useEffect(() => {
    if (!user?.uid) {
      setNombreUsuario('Cliente');
      return undefined;
    }

    return onSnapshot(
      doc(db, 'usuarios', user.uid),
      (snapshot) => {
        const username = snapshot.exists() ? snapshot.data().username : null;
        setNombreUsuario(
          typeof username === 'string' && username.trim()
            ? username.trim()
            : user.displayName || 'Cliente',
        );
      },
      (error) => {
        console.error('Error cargando el nombre del usuario para pedidos:', error);
        setNombreUsuario(user.displayName || 'Cliente');
      },
    );
  }, [user?.uid, user?.displayName]);

  useEffect(() => {
    if (!user?.uid) {
      setPedidos([]);
      setCargando(false);
      return undefined;
    }

    setPedidos([]);
    setCargando(true);
    setErrorCarga(false);

    return onSnapshot(
      query(collection(db, 'pedido'), where('usuarioId', '==', user.uid)),
      (snapshot) => {
        const resultados = snapshot.docs.map((documento) => ({
          ...documento.data(),
          id: documento.id,
        }));
        resultados.sort((primero, segundo) => obtenerTiempo(segundo.fecha) - obtenerTiempo(primero.fecha));
        setPedidos(resultados);
        setCargando(false);
      },
      (error) => {
        console.error('Error cargando el historial de pedidos:', error);
        setErrorCarga(true);
        setCargando(false);
      },
    );
  }, [user?.uid]);

  useEffect(() => {
    pedidos.forEach((pedido) => {
      if (String(pedido.estado || '').toLowerCase() !== 'enviado') return;
      if (alertasMostradas[pedido.id]) return;

      Alert.alert(
        'Pedido enviado',
        `Tu pedido #${String(pedido.id).slice(0, 7)} ya salió para entrega. Cuando lo recibas, márcalo como recibido.`,
      );
      setAlertasMostradas((actual) => ({ ...actual, [pedido.id]: true }));
    });
  }, [alertasMostradas, pedidos]);

  const actualizarEstadoRecibido = async (pedido) => {
    try {
      await updateDoc(doc(db, 'pedido', pedido.id), {
        estado: 'recibido',
        recibidoEn: serverTimestamp(),
      });
      Alert.alert('Pedido recibido', 'Gracias por confirmar la recepción del pedido.');
    } catch (error) {
      console.error('Error actualizando el estado del pedido:', error);
      Alert.alert('No se pudo actualizar', 'Inténtalo de nuevo en unos segundos.');
    }
  };

  const pedidosOrdenados = useMemo(
    () => [...pedidos].sort((primero, segundo) => obtenerTiempo(segundo.fecha) - obtenerTiempo(primero.fecha)),
    [pedidos],
  );

  return (
    <View style={styles.contenedor}>
      <FlatList
        data={pedidosOrdenados}
        keyExtractor={(pedido) => pedido.id}
        renderItem={({ item }) => (
          <TarjetaPedidoComponente
            pedido={item}
            nombreUsuario={nombreUsuario}
            mostrarBotonRecibido={true}
            onRecibir={actualizarEstadoRecibido}
            styles={styles}
          />
        )}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={(
          <View style={styles.encabezado}>
            <View style={styles.filaEncabezado}>
              <View style={styles.encabezadoTexto}>
                <Text style={styles.etiquetaEncabezado}>FASTBITE · TU ACTIVIDAD</Text>
                <Text style={styles.titulo}>Mis pedidos</Text>
              </View>
              <View style={styles.iconoEncabezado}>
                <Ionicons name="receipt-outline" size={23} color="#ed0016" />
              </View>
            </View>
            <Text style={styles.descripcion}>Consulta el estado y los detalles de tus compras.</Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.mensajeVacio}>
            {cargando ? (
              <ActivityIndicator size="large" color="#ed0016" />
            ) : (
              <>
                <View style={styles.iconoEstadoVacio}>
                  <Ionicons
                    name={errorCarga ? 'cloud-offline-outline' : 'receipt-outline'}
                    size={34}
                    color="#ed0016"
                  />
                </View>
                <Text style={styles.tituloEstadoVacio}>
                  {errorCarga ? 'No se cargaron tus pedidos' : 'Aún no tienes pedidos'}
                </Text>
                <Text style={styles.textoVacio}>
                  {errorCarga
                    ? 'Verifica tu conexión e inténtalo de nuevo.'
                    : 'Cuando realices una compra, podrás seguir su estado aquí.'}
                </Text>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#f5f6f8',
  },
  lista: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 36,
    paddingBottom: 24,
  },
  encabezado: {
    marginBottom: 20,
  },
  filaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  encabezadoTexto: {
    flex: 1,
  },
  etiquetaEncabezado: {
    marginBottom: 4,
    color: '#c90014',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  titulo: {
    color: '#242630',
    fontSize: 25,
    fontWeight: '800',
  },
  iconoEncabezado: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#ffe7e9',
  },
  descripcion: {
    marginTop: 7,
    color: '#777b86',
    fontSize: 13,
    lineHeight: 18,
  },
  tarjetaPedido: {
    marginBottom: 14,
    padding: 16,
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
  encabezadoPedido: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resumenEncabezado: {
    flex: 1,
    marginRight: 8,
  },
  filaNumeroPedido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconoPedido: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#fff0f1',
  },
  numeroPedido: {
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
  fecha: {
    color: '#858995',
    fontSize: 11,
  },
  estado: {
    maxWidth: 145,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#fff1d6',
  },
  estadoEnviado: {
    backgroundColor: '#e6f5ec',
  },
  estadoRecibido: {
    backgroundColor: '#e9edff',
  },
  estadoPreparacion: {
    backgroundColor: '#fff2d8',
  },
  estadoCancelado: {
    backgroundColor: '#fbe7e7',
  },
  textoEstado: {
    color: '#8c5a00',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  textoEstadoEnviado: {
    color: '#0b7d43',
  },
  textoEstadoRecibido: {
    color: '#2544b4',
  },
  textoEstadoPreparacion: {
    color: '#8a5d00',
  },
  textoEstadoCancelado: {
    color: '#b42318',
  },
  encabezadoProductos: {
    minHeight: 42,
    marginTop: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    backgroundColor: '#fff7f8',
  },
  filaTituloProductos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  tituloProductos: {
    color: '#50535e',
    fontSize: 12,
    fontWeight: '700',
  },
  resumenProductos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  listaProductos: {
    paddingTop: 7,
  },
  producto: {
    marginVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imagenProducto: {
    width: 52,
    height: 52,
    borderRadius: 13,
  },
  imagenVacia: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff0f1',
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
  textoSecundario: {
    marginTop: 3,
    color: '#858995',
    fontSize: 11,
  },
  subtotalProducto: {
    color: '#c90014',
    fontSize: 12,
    fontWeight: '800',
  },
  avisoProductos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  separador: {
    height: 1,
    marginVertical: 13,
    backgroundColor: '#eceef2',
  },
  encabezadoDireccion: {
    marginBottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconoDireccion: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#fff0f1',
  },
  tituloDireccion: {
    color: '#242630',
    fontSize: 13,
    fontWeight: '800',
  },
  etiquetaDireccion: {
    color: '#50535e',
    fontSize: 12,
    fontWeight: '700',
  },
  textoDireccion: {
    marginTop: 3,
    color: '#50535e',
    fontSize: 12,
    lineHeight: 18,
  },
  filaContacto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  totalFila: {
    marginTop: 14,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eceef2',
  },
  textoTotal: {
    color: '#242630',
    fontSize: 14,
    fontWeight: '800',
  },
  total: {
    color: '#c90014',
    fontSize: 19,
    fontWeight: '900',
  },
  botonRecibido: {
    minHeight: 46,
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    backgroundColor: '#ed0016',
  },
  botonRecibidoTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  mensajeVacio: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  iconoEstadoVacio: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: '#ffe7e9',
  },
  tituloEstadoVacio: {
    marginTop: 17,
    color: '#242630',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  textoVacio: {
    marginTop: 7,
    color: '#777b86',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
