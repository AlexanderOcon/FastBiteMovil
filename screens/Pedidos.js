import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';

function obtenerTiempo(fecha) {
  if (fecha?.toDate) return fecha.toDate().getTime();
  if (fecha instanceof Date) return fecha.getTime();
  if (typeof fecha === 'string') return Date.parse(fecha) || 0;
  return 0;
}

function formatearFecha(fecha) {
  const tiempo = obtenerTiempo(fecha);
  if (!tiempo) return 'Fecha no disponible';

  return new Date(tiempo).toLocaleString('es-NI', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatearPrecio(valor) {
  const precio = Number(valor);
  return `C$${Number.isFinite(precio) ? precio.toLocaleString('es-NI') : '0'}`;
}

function ProductoPedido({ producto }) {
  const cantidad = Math.max(0, Number(producto.cantidad) || 0);
  const precio = Number(producto.precio) || 0;

  return (
    <View style={styles.producto}>
      {producto.imagen ? (
        <Image source={{ uri: producto.imagen }} style={styles.imagenProducto} />
      ) : (
        <View style={[styles.imagenProducto, styles.imagenVacia]}>
          <Text style={styles.iconoImagen}>🍽️</Text>
        </View>
      )}
      <View style={styles.detalleProducto}>
        <Text style={styles.nombreProducto}>{producto.nombre || 'Producto'}</Text>
        {!!producto.categoria && <Text style={styles.textoSecundario}>{producto.categoria}</Text>}
        <Text style={styles.textoSecundario}>
          {cantidad} × {formatearPrecio(precio)}
        </Text>
      </View>
      <Text style={styles.subtotalProducto}>{formatearPrecio(precio * cantidad)}</Text>
    </View>
  );
}

function TarjetaPedido({ pedido }) {
  const direccion = pedido.direccionEntrega || {};
  const productos = Array.isArray(pedido.productos) ? pedido.productos : [];
  const estado = String(pedido.estado || 'pendiente');

  return (
    <View style={styles.tarjetaPedido}>
      <View style={styles.encabezadoPedido}>
        <View>
          <Text style={styles.numeroPedido}>Pedido #{pedido.id.slice(0, 7)}</Text>
          <Text style={styles.fecha}>{formatearFecha(pedido.fecha)}</Text>
        </View>
        <View style={styles.estado}>
          <Text style={styles.textoEstado}>{estado}</Text>
        </View>
      </View>

      {productos.length > 0 ? (
        productos.map((producto, indice) => (
          <ProductoPedido key={`${producto.productoId || producto.nombre || 'producto'}-${indice}`} producto={producto} />
        ))
      ) : (
        <Text style={styles.textoSecundario}>Este pedido no tiene productos guardados.</Text>
      )}

      <View style={styles.separador} />
      <Text style={styles.tituloDireccion}>Dirección de entrega</Text>
      {!!direccion.etiqueta && <Text style={styles.textoSecundario}>{direccion.etiqueta}</Text>}
      <Text style={styles.textoDireccion}>{direccion.direccion || 'Dirección no disponible'}</Text>
      {!!direccion.referencia && <Text style={styles.textoSecundario}>{direccion.referencia}</Text>}
      {!!direccion.telefono && <Text style={styles.textoSecundario}>Tel. {direccion.telefono}</Text>}
      {!!pedido.correo && <Text style={styles.textoSecundario}>Correo: {pedido.correo}</Text>}
      <View style={styles.totalFila}>
        <Text style={styles.textoTotal}>Total</Text>
        <Text style={styles.total}>{formatearPrecio(pedido.total)}</Text>
      </View>
    </View>
  );
}

export default function Pedidos() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

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

  return (
    <View style={styles.contenedor}>
      <FlatList
        data={pedidos}
        keyExtractor={(pedido) => pedido.id}
        renderItem={({ item }) => <TarjetaPedido pedido={item} />}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={(
          <View style={styles.encabezado}>
            <Text style={styles.titulo}>Pedidos</Text>
            <Text style={styles.descripcion}>Consulta el estado y los detalles de tus compras.</Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.mensajeVacio}>
            {cargando ? (
              <ActivityIndicator size="large" color="#ed0016" />
            ) : (
              <Text style={styles.textoVacio}>
                {errorCarga
                  ? 'No se pudo cargar tu historial. Verifica tu conexión e inténtalo de nuevo.'
                  : 'Aún no has realizado pedidos.'}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f7f7f7' },
  lista: { flexGrow: 1, padding: 18 },
  encabezado: { marginBottom: 14 },
  titulo: { color: '#29292e', fontSize: 25, fontWeight: '800' },
  descripcion: { marginTop: 5, color: '#777', fontSize: 14 },
  tarjetaPedido: { marginBottom: 14, padding: 15, borderRadius: 12, backgroundColor: '#fff', elevation: 2 },
  encabezadoPedido: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  numeroPedido: { color: '#29292e', fontSize: 16, fontWeight: '800' },
  fecha: { marginTop: 4, color: '#777', fontSize: 12 },
  estado: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#fff1d6' },
  textoEstado: { color: '#8c5a00', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  producto: { marginVertical: 6, flexDirection: 'row', alignItems: 'center' },
  imagenProducto: { width: 54, height: 54, borderRadius: 8 },
  imagenVacia: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f2' },
  iconoImagen: { fontSize: 24 },
  detalleProducto: { flex: 1, marginHorizontal: 10 },
  nombreProducto: { color: '#29292e', fontSize: 14, fontWeight: '700' },
  textoSecundario: { marginTop: 3, color: '#777', fontSize: 12 },
  subtotalProducto: { color: '#29292e', fontSize: 13, fontWeight: '700' },
  separador: { height: 1, marginVertical: 12, backgroundColor: '#eee' },
  tituloDireccion: { marginBottom: 3, color: '#29292e', fontSize: 14, fontWeight: '700' },
  textoDireccion: { marginTop: 3, color: '#555', fontSize: 13 },
  totalFila: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textoTotal: { color: '#29292e', fontSize: 15, fontWeight: '700' },
  total: { color: '#ed0016', fontSize: 18, fontWeight: '800' },
  mensajeVacio: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  textoVacio: { color: '#777', fontSize: 14, textAlign: 'center' },
});
