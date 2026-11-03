import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Svg, { Circle, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { auth, db } from '../firebase/config';

// Estas opciones definen qué se analiza en cada modo del dashboard.
const configuracion = {
  producto: {
    etiqueta: 'Producto',
    etiquetaFiltro: 'Producto',
    etiquetaTodos: 'Todos los productos',
    grupos: [{ id: 'producto', etiqueta: 'Producto' }],
    medidas: [
      { id: 'importe', etiqueta: 'Importe total' },
      { id: 'unidades', etiqueta: 'Apariciones totales' },
      { id: 'promedio', etiqueta: 'Importe promedio por aparición' },
    ],
  },
  pedido: {
    etiqueta: 'Pedido',
    etiquetaFiltro: 'Pedido',
    etiquetaTodos: 'Todos los pedidos',
    grupos: [
      { id: 'usuario', etiqueta: 'Usuario' },
      { id: 'fecha', etiqueta: 'Fecha' },
      { id: 'estado', etiqueta: 'Estado' },
    ],
    medidas: [
      { id: 'promedio_ticket', etiqueta: 'Promedio vs. global' },
      { id: 'total', etiqueta: 'Total de pedidos' },
    ],
  },
};

const MODELOS_GROQ = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-safeguard-20b',
  'qwen/qwen3.8-27b',
];
const GROQ_API_KEY_STORAGE = 'groq_api_key_dashboard';
const GROQ_MODELO_STORAGE = 'groq_modelo_dashboard';
const COLORES_GRAFICO = [
  '#2563eb', '#f97316', '#16a34a', '#9333ea', '#e11d48',
  '#0891b2', '#ca8a04', '#4f46e5', '#0d9488',
];
const formatoMoneda = new Intl.NumberFormat('es-NI', {
  style: 'currency',
  currency: 'NIO',
  maximumFractionDigits: 0,
});
const formatoNumero = new Intl.NumberFormat('es-NI', { maximumFractionDigits: 1 });
const formatoPorcentaje = new Intl.NumberFormat('es-NI', {
  style: 'percent',
  maximumFractionDigits: 2,
});

// Usa el almacén cifrado en móvil y el almacenamiento compatible del navegador en web.
function leerConfiguracionLocal(clave) {
  return Platform.OS === 'web' ? AsyncStorage.getItem(clave) : SecureStore.getItemAsync(clave);
}

function guardarConfiguracionLocal(clave, valor) {
  return Platform.OS === 'web'
    ? AsyncStorage.setItem(clave, valor)
    : SecureStore.setItemAsync(clave, valor);
}

function eliminarConfiguracionLocal(clave) {
  return Platform.OS === 'web'
    ? AsyncStorage.removeItem(clave)
    : SecureStore.deleteItemAsync(clave);
}

// Convierte valores numéricos dudosos a cero para que un pedido incompleto no rompa las estadísticas.
function numeroSeguro(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

// Interpreta fechas de Firestore, Date o texto y devuelve una clave común para agrupar por día.
function obtenerFecha(fecha) {
  if (!fecha) return 'Sin fecha';
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  const fechaNormalizada = fecha?.toDate ? fecha.toDate() : fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(fechaNormalizada.getTime())) return 'Sin fecha';
  const anio = fechaNormalizada.getFullYear();
  const mes = String(fechaNormalizada.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaNormalizada.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// Muestra estados con una etiqueta consistente aunque la base tenga guiones o guiones bajos.
function obtenerEstado(estado) {
  const valor = String(estado || 'pendiente').toLowerCase().replace(/_/g, '-');
  if (valor === 'preparacion') return 'En preparación';
  if (valor === 'en-preparacion') return 'En preparación';
  if (valor === 'enviado') return 'Enviado';
  if (valor === 'recibido') return 'Recibido';
  if (valor === 'cancelado') return 'Cancelado';
  return 'Pendiente';
}

// Convierte un documento Firestore en un pedido consistente para los filtros y los indicadores.
function normalizarPedido(pedido) {
  return {
    ...pedido,
    estado: obtenerEstado(pedido.estado),
    fecha: obtenerFecha(pedido.fecha),
    usuario: pedido.usuarioNombre || pedido.correo || 'Cliente sin nombre',
    total: numeroSeguro(pedido.total),
    productos: Array.isArray(pedido.productos) ? pedido.productos : [],
  };
}

// Aplana los productos de todos los pedidos para analizar ventas y unidades por producto o categoría.
function obtenerProductos(pedidos) {
  return pedidos
    .filter((pedido) => pedido.estado !== 'Cancelado')
    .flatMap((pedido) => pedido.productos.map((producto) => {
      const unidades = numeroSeguro(producto.cantidad);
      const precio = numeroSeguro(producto.precio);
      return {
        producto: String(producto.nombre || producto.producto || 'Producto sin nombre'),
        categoria: String(producto.categoria || 'Sin categoría'),
        unidades,
        importe: numeroSeguro(producto.subtotal) || precio * unidades,
      };
    }));
}

// Este selector horizontal adapta los filtros del dashboard a controles táctiles de móvil.
function Selector({ titulo, opciones, valor, alCambiar }) {
  return (
    <View style={styles.bloqueSelector}>
      {!!titulo && <Text style={styles.etiquetaCampo}>{titulo}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opcionesSelector}>
        {opciones.map((opcion) => {
          const activo = opcion.id === valor;
          return (
            <Pressable
              key={opcion.id}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              onPress={() => alCambiar(opcion.id)}
              style={[styles.chip, activo && styles.chipActivo]}
            >
              <Text style={[styles.textoChip, activo && styles.textoChipActivo]}>
                {opcion.id !== 'todos' && /^\d{4}-\d{2}-\d{2}$/.test(opcion.id)
                  ? new Date(`${opcion.id}T00:00:00`).toLocaleDateString('es-NI')
                  : opcion.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Convierte dos ángulos en un sector SVG para los gráficos circulares y de dona.
function crearSector(cx, cy, radio, inicio, fin) {
  const punto = (angulo) => ({
    x: cx + radio * Math.cos(angulo),
    y: cy + radio * Math.sin(angulo),
  });
  const desde = punto(inicio);
  const hasta = punto(fin);
  const arcoGrande = fin - inicio > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${desde.x} ${desde.y} A ${radio} ${radio} 0 ${arcoGrande} 1 ${hasta.x} ${hasta.y} Z`;
}

// Dibuja los cuatro tipos de gráfico del HTML usando SVG compatible con iOS y Android.
function GraficoDashboard({ tipo, filas, formatearValor }) {
  const ancho = 360;
  const alto = 270;
  const valoresPositivos = filas.map((fila) => Math.max(0, fila.valor));
  const maximo = Math.max(...valoresPositivos, 0) || 1;
  const suma = valoresPositivos.reduce((total, valor) => total + valor, 0);

  if (suma <= 0) {
    return (
      <View style={styles.estado}>
        <Text style={styles.textoEstado}>Los valores seleccionados no tienen datos para graficar.</Text>
      </View>
    );
  }

  if (tipo === 'pie' || tipo === 'doughnut') {
    let anguloActual = -Math.PI / 2;
    const radio = tipo === 'doughnut' ? 77 : 91;
    return (
      <View>
        <Svg width="100%" height={alto} viewBox={`0 0 ${ancho} ${alto}`}>
          {filas.map((fila, indice) => {
            const proporcion = Math.max(0, fila.valor) / suma;
            const inicio = anguloActual;
            anguloActual += proporcion * Math.PI * 2;
            if (filas.length === 1) {
              return (
                <Circle
                  key={fila.etiqueta}
                  cx={180}
                  cy={130}
                  r={radio}
                  fill={COLORES_GRAFICO[indice % COLORES_GRAFICO.length]}
                />
              );
            }
            return (
              <Path
                key={fila.etiqueta}
                d={crearSector(180, 130, radio, inicio, anguloActual)}
                fill={COLORES_GRAFICO[indice % COLORES_GRAFICO.length]}
                stroke="#ffffff"
                strokeWidth={2}
              />
            );
          })}
          {tipo === 'doughnut' && <Circle cx={180} cy={130} r={48} fill="#ffffff" />}
          {tipo === 'doughnut' && (
            <SvgText x={180} y={127} fill="#242630" fontSize="12" fontWeight="bold" textAnchor="middle">
              {filas.length} grupos
            </SvgText>
          )}
        </Svg>
        <View style={styles.leyendaGrafico}>
          {filas.map((fila, indice) => (
            <View key={fila.etiqueta} style={styles.elementoLeyenda}>
              <View style={[styles.puntoLeyenda, { backgroundColor: COLORES_GRAFICO[indice % COLORES_GRAFICO.length] }]} />
              <Text style={styles.textoLeyenda} numberOfLines={1}>{fila.etiqueta}</Text>
              <Text style={styles.valorLeyenda}>{formatearValor(fila.valor)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (tipo === 'bar') {
    const anchoGrafico = Math.max(ancho, filas.length * 48);
    const eje = alto - 43;
    const paso = (anchoGrafico - 36) / filas.length;
    const anchoBarra = Math.min(28, paso * 0.62);
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.graficoVertical}>
        <Svg width={anchoGrafico} height={alto} viewBox={`0 0 ${anchoGrafico} ${alto}`}>
          <Polyline
            points={`18,${eje} ${anchoGrafico - 12},${eje}`}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          {filas.map((fila, indice) => {
            const x = 18 + indice * paso + (paso - anchoBarra) / 2;
            const altura = (Math.max(0, fila.valor) / maximo) * (alto - 96);
            const centro = x + anchoBarra / 2;
            return (
              <React.Fragment key={fila.etiqueta}>
                <Rect
                  x={x}
                  y={eje - altura}
                  width={anchoBarra}
                  height={altura}
                  rx={3}
                  fill={COLORES_GRAFICO[indice % COLORES_GRAFICO.length]}
                />
                <SvgText x={centro} y={eje - altura - 7} fill="#334155" fontSize="8" fontWeight="bold" textAnchor="middle">
                  {formatearValor(fila.valor)}
                </SvgText>
                <SvgText x={centro} y={eje + 17} fill="#64748b" fontSize="8" textAnchor="middle">
                  {fila.etiqueta.slice(0, 9)}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </ScrollView>
    );
  }

  if (tipo === 'line') {
    const anchoGrafico = Math.max(ancho, filas.length * 48);
    const puntos = filas.map((fila, indice) => {
      const x = filas.length === 1 ? anchoGrafico / 2 : 30 + (indice * (anchoGrafico - 60)) / (filas.length - 1);
      const y = alto - 40 - (Math.max(0, fila.valor) / maximo) * (alto - 90);
      return { x, y, fila };
    });
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.graficoVertical}>
        <Svg width={anchoGrafico} height={alto} viewBox={`0 0 ${anchoGrafico} ${alto}`}>
          <Polyline
            points={`30,${alto - 40} ${anchoGrafico - 20},${alto - 40}`}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          <Polyline
            points={puntos.map((punto) => `${punto.x},${punto.y}`).join(' ')}
            fill="none"
            stroke="#2563eb"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {puntos.map(({ x, y, fila }, indice) => (
            <React.Fragment key={fila.etiqueta}>
              <Circle cx={x} cy={y} r={5} fill={COLORES_GRAFICO[indice % COLORES_GRAFICO.length]} />
              <SvgText x={x} y={y - 10} fill="#334155" fontSize="9" fontWeight="bold" textAnchor="middle">
                {formatearValor(fila.valor)}
              </SvgText>
              {(puntos.length <= 8 || indice % Math.ceil(puntos.length / 8) === 0 || indice === puntos.length - 1) && (
                <SvgText x={x} y={alto - 17} fill="#64748b" fontSize="9" textAnchor="middle">
                  {fila.etiqueta.slice(0, 12)}
                </SvgText>
              )}
            </React.Fragment>
          ))}
        </Svg>
      </ScrollView>
    );
  }
}

export default function AdminScreen() {
  const [pedidos, setPedidos] = useState([]);
  const [modo, setModo] = useState('producto');
  const [grupoElegido, setGrupoElegido] = useState('producto');
  const [medidaElegida, setMedidaElegida] = useState('importe');
  const [filtroElegido, setFiltroElegido] = useState('todos');
  const [tipoGrafico, setTipoGrafico] = useState('bar');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [apiKeyGroq, setApiKeyGroq] = useState('');
  const [modeloGroq, setModeloGroq] = useState(MODELOS_GROQ[0]);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [modeloDraft, setModeloDraft] = useState(MODELOS_GROQ[0]);
  const [modalApiVisible, setModalApiVisible] = useState(false);
  const [estadoApi, setEstadoApi] = useState('Cargando configuración de Groq...');
  const [interpretacion, setInterpretacion] = useState('');
  const [estadoInterpretacion, setEstadoInterpretacion] = useState('');
  const [recargarInterpretacion, setRecargarInterpretacion] = useState(0);
  const [decision, setDecision] = useState('');
  const [estadoDecision, setEstadoDecision] = useState('');
  const [decisionVisible, setDecisionVisible] = useState(false);
  const controladorDecision = useRef(null);

  // Mantiene las estadísticas sincronizadas con los pedidos actuales de Firestore.
  useEffect(() => onSnapshot(
    collection(db, 'pedido'),
    (snapshot) => {
      const pedidosActuales = snapshot.docs.map((documento) => normalizarPedido({
        ...documento.data(),
        id: documento.id,
      }));
      setPedidos(pedidosActuales);
      setErrorCarga('');
      setCargando(false);
    },
    (error) => {
      console.error('Error cargando estadísticas de pedidos:', error);
      setErrorCarga('No se pudieron cargar las estadísticas. Verifica tu conexión y los permisos de Firestore.');
      setCargando(false);
    },
  ), []);

  // Restaura la API key del dispositivo y el modelo elegido al abrir el dashboard.
  useEffect(() => {
    let activo = true;
    Promise.all([
      leerConfiguracionLocal(GROQ_API_KEY_STORAGE),
      leerConfiguracionLocal(GROQ_MODELO_STORAGE),
    ]).then(([claveGuardada, modeloGuardado]) => {
      if (!activo) return;
      const modelo = MODELOS_GROQ.includes(modeloGuardado) ? modeloGuardado : MODELOS_GROQ[0];
      setApiKeyGroq(claveGuardada || '');
      setModeloGroq(modelo);
      setModeloDraft(modelo);
      setEstadoApi(claveGuardada ? `Groq configurada (${modelo})` : 'Sin API key de Groq');
    }).catch((error) => {
      console.error('Error restaurando la configuración de Groq:', error);
      if (activo) setEstadoApi('No se pudo leer la configuración guardada de Groq.');
    });
    return () => { activo = false; };
  }, []);

  // Prepara las métricas y opciones según el modo seleccionado y el filtro activo.
  const datosDashboard = useMemo(() => {
    const registros = modo === 'pedido' ? pedidos : obtenerProductos(pedidos);
    const grupoValido = configuracion[modo].grupos.some((grupo) => grupo.id === grupoElegido);
    const grupo = grupoValido ? grupoElegido : configuracion[modo].grupos[0].id;
    const grupoActual = configuracion[modo].grupos.find((opcion) => opcion.id === grupo);
    const todosEtiqueta = modo === 'producto'
      ? 'Todos los productos'
      : grupo === 'usuario'
        ? 'Todos los usuarios'
        : grupo === 'fecha'
          ? 'Todas las fechas'
          : 'Todos los estados';
    const opcionesFiltro = [...new Set(registros.map((registro) => String(registro[grupo] || 'Sin dato')))]
      .sort((primero, segundo) => primero.localeCompare(segundo, 'es', { numeric: true }));
    const filtro = opcionesFiltro.includes(filtroElegido) ? filtroElegido : 'todos';
    const registrosFiltrados = filtro === 'todos'
      ? registros
      : registros.filter((registro) => String(registro[grupo] || 'Sin dato') === filtro);
    const registrosVenta = modo === 'pedido'
      ? registrosFiltrados.filter((pedido) => pedido.estado !== 'Cancelado')
      : registrosFiltrados;
    const medidaValida = configuracion[modo].medidas.some((medida) => medida.id === medidaElegida);
    const medida = medidaValida ? medidaElegida : configuracion[modo].medidas[0].id;
    const pedidosNoCancelados = pedidos.filter((pedido) => pedido.estado !== 'Cancelado');
    const promedioGlobal = pedidosNoCancelados.length > 0
      ? pedidosNoCancelados.reduce((suma, pedido) => suma + pedido.total, 0) / pedidosNoCancelados.length
      : 0;
    const grupos = new Map();

    registrosFiltrados.forEach((registro) => {
      const etiqueta = String(registro[grupo] || 'Sin dato');
      if (!grupos.has(etiqueta)) grupos.set(etiqueta, []);
      grupos.get(etiqueta).push(registro);
    });

    const filas = [...grupos.entries()].map(([etiqueta, elementos]) => {
      const elementosVenta = elementos.filter((elemento) => elemento.estado !== 'Cancelado');
      let valor = 0;
      if (modo === 'pedido') {
        const totalVentas = elementosVenta.reduce((suma, pedido) => suma + pedido.total, 0);
        if (medida === 'total') valor = totalVentas;
        if (medida === 'promedio_ticket') {
          const promedioGrupo = elementosVenta.length > 0 ? totalVentas / elementosVenta.length : 0;
          valor = promedioGlobal > 0 ? promedioGrupo / promedioGlobal : 0;
        }
      } else {
        const importe = elementos.reduce((suma, producto) => suma + producto.importe, 0);
        const unidades = elementos.reduce((suma, producto) => suma + producto.unidades, 0);
        if (medida === 'importe') valor = importe;
        if (medida === 'unidades') valor = unidades;
        if (medida === 'promedio') valor = unidades > 0 ? importe / unidades : 0;
      }
      return { etiqueta, valor };
    }).sort((primero, segundo) => primero.etiqueta.localeCompare(segundo.etiqueta, 'es', { numeric: true }));

    const importeVentas = registrosVenta.reduce((suma, registro) => (
      suma + (modo === 'pedido' ? registro.total : registro.importe)
    ), 0);
    const cantidadVenta = registrosVenta.length;
    const promedioVentasFiltradas = cantidadVenta > 0 ? importeVentas / cantidadVenta : 0;
    const unidades = modo === 'producto'
      ? registrosFiltrados.reduce((suma, producto) => suma + producto.unidades, 0)
      : cantidadVenta;

    return {
      grupo,
      filtro,
      grupoActual,
      filtroTodosEtiqueta: todosEtiqueta,
      opcionesFiltro: [
        { id: 'todos', etiqueta: todosEtiqueta },
        ...opcionesFiltro.map((opcion) => ({ id: opcion, etiqueta: opcion })),
      ],
      filas,
      importeVentas,
      unidades,
      promedio: unidades > 0 ? importeVentas / unidades : 0,
      promedioVentasFiltradas,
      totalPedidos: modo === 'pedido' ? registrosFiltrados.length : 0,
      sumaTotales: modo === 'pedido'
        ? registrosFiltrados.reduce((suma, pedido) => suma + pedido.total, 0)
        : 0,
      promedioRelativoPedidos: modo === 'pedido' && promedioGlobal > 0
        ? promedioVentasFiltradas / promedioGlobal
        : 0,
      promedioTicketGlobal: promedioGlobal,
      medida,
    };
  }, [filtroElegido, grupoElegido, medidaElegida, modo, pedidos]);

  // Prepara etiquetas y medidas para compartir con Groq el contexto visible del dashboard.
  const contextoIA = useMemo(() => {
    const esPedido = modo === 'pedido';
    const medida = configuracion[modo].medidas.find((opcion) => opcion.id === datosDashboard.medida);
    const nombreAgrupacion = datosDashboard.grupoActual?.etiqueta || configuracion[modo].etiqueta;
    const valoresGrafico = datosDashboard.filas.map((fila, indice) => {
      const relativo = esPedido && datosDashboard.medida === 'promedio_ticket';
      const moneda = esPedido
        ? datosDashboard.medida === 'total'
        : datosDashboard.medida === 'importe' || datosDashboard.medida === 'promedio';
      const etiqueta = esPedido && datosDashboard.grupo === 'usuario'
        ? `Usuario ${indice + 1}`
        : fila.etiqueta;
      return `- ${etiqueta}: ${relativo
        ? formatoPorcentaje.format(fila.valor)
        : moneda ? formatoMoneda.format(fila.valor) : formatoNumero.format(fila.valor)}`;
    });

    return {
      modo,
      medida: medida?.etiqueta || datosDashboard.medida,
      dimension: nombreAgrupacion,
      filtro: datosDashboard.filtro === 'todos'
        ? datosDashboard.filtroTodosEtiqueta
        : esPedido && datosDashboard.grupo === 'usuario'
          ? 'Usuario seleccionado'
          : datosDashboard.filtro,
      pedidos: datosDashboard.totalPedidos,
      total: datosDashboard.sumaTotales,
      promedio: datosDashboard.totalPedidos > 0
        ? datosDashboard.sumaTotales / datosDashboard.totalPedidos
        : 0,
      promedioGlobal: datosDashboard.promedioTicketGlobal,
      importe: datosDashboard.importeVentas,
      apariciones: datosDashboard.unidades,
      promedioProducto: datosDashboard.promedio,
      lineasDatos: valoresGrafico.length > 0 ? valoresGrafico.join('\n') : '- Sin datos',
      datoRelativo: esPedido && datosDashboard.medida === 'promedio_ticket',
      hayDatos: datosDashboard.filas.length > 0,
    };
  }, [datosDashboard, modo]);

  // Detiene una recomendación anterior cuando cambian los filtros y al salir de la pantalla.
  useEffect(() => {
    controladorDecision.current?.abort();
    setDecision('');
    setEstadoDecision('');
    setDecisionVisible(false);
    return () => controladorDecision.current?.abort();
  }, [apiKeyGroq, contextoIA, modeloGroq]);

  // Envía el análisis actual a Groq con retraso y cancela peticiones obsoletas al cambiar filtros.
  useEffect(() => {
    let temporizador;
    const controlador = new AbortController();
    if (!apiKeyGroq) {
      setInterpretacion('');
      setEstadoInterpretacion('Configura tu API key de Groq para generar una interpretación automática.');
      return undefined;
    }
    if (!contextoIA.hayDatos) {
      setInterpretacion('');
      setEstadoInterpretacion('No hay datos para interpretar con los filtros seleccionados.');
      return undefined;
    }

    temporizador = setTimeout(async () => {
      setInterpretacion('');
      setEstadoInterpretacion(`Analizando los datos con ${modeloGroq}...`);
      try {
        const instrucciones = [
          'Actúa como analista de datos senior especializado en ventas de comida rápida.',
          'Redacta en español un único párrafo profesional de 4 a 6 oraciones.',
          'Incluye el hallazgo principal, la comparación de mayor y menor valor, la concentración y una recomendación accionable.',
          'Si se analiza por usuario, habla de usuarios sin revelar identificadores.',
          'Usa únicamente los datos proporcionados, no inventes cifras ni categorías, y no uses listas ni Markdown.',
        ].join(' ');
        const contenido = [
          'Dashboard multidimensional de comida rápida.',
          `Modo: ${contextoIA.modo === 'pedido' ? 'Pedidos' : 'Productos'}`,
          `Medida: ${contextoIA.medida}`,
          `Agrupación: ${contextoIA.dimension}`,
          `Tipo de gráfico: ${tipoGrafico}`,
          `Filtro: ${contextoIA.filtro}`,
          '',
          'Indicadores del conjunto filtrado:',
          ...(contextoIA.modo === 'pedido'
            ? [
              `Pedidos en el filtro: ${formatoNumero.format(contextoIA.pedidos)}`,
              `Suma de totales: ${formatoMoneda.format(contextoIA.total)}`,
              `Promedio por pedido: ${formatoMoneda.format(contextoIA.promedio)}`,
              `Promedio global: ${formatoMoneda.format(contextoIA.promedioGlobal)}`,
            ]
            : [
              `Importe total: ${formatoMoneda.format(contextoIA.importe)}`,
              `Apariciones totales: ${formatoNumero.format(contextoIA.apariciones)}`,
              `Importe promedio por aparición: ${formatoMoneda.format(contextoIA.promedioProducto)}`,
            ]),
          '',
          'Valores mostrados en el gráfico:',
          contextoIA.lineasDatos,
          contextoIA.datoRelativo
            ? 'Los valores del gráfico representan el promedio de cada grupo como proporción del promedio global.'
            : '',
        ].filter(Boolean).join('\n');
        const respuesta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKeyGroq}`,
          },
          signal: controlador.signal,
          body: JSON.stringify({
            model: modeloGroq,
            temperature: 0.4,
            max_tokens: 320,
            messages: [
              { role: 'system', content: instrucciones },
              { role: 'user', content: contenido },
            ],
          }),
        });
        const cuerpo = await respuesta.json().catch(() => null);
        if (!respuesta.ok) {
          const detalle = cuerpo?.error?.message || `Error HTTP ${respuesta.status}`;
          if (respuesta.status === 401) throw new Error('API key de Groq inválida o sin permisos. Revisa la configuración.');
          if (respuesta.status === 429) throw new Error('Se alcanzó el límite de solicitudes de Groq. Intenta más tarde.');
          throw new Error(detalle);
        }
        const texto = cuerpo?.choices?.[0]?.message?.content;
        if (typeof texto !== 'string' || !texto.trim()) throw new Error('Groq no devolvió una respuesta válida.');
        setInterpretacion(texto.trim());
        setEstadoInterpretacion('');
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Error generando la interpretación de Groq:', error);
        setInterpretacion('');
        setEstadoInterpretacion(error instanceof TypeError
          ? 'No se pudo conectar con Groq. Verifica tu conexión a Internet.'
          : `No fue posible generar la interpretación: ${error.message}`);
      }
    }, 400);

    return () => {
      clearTimeout(temporizador);
      controlador.abort();
    };
  }, [apiKeyGroq, contextoIA, modeloGroq, recargarInterpretacion, tipoGrafico]);

  // Guarda la API key y el modelo con almacenamiento protegido y valida la información del proveedor.
  const guardarConfiguracionApi = async () => {
    const clave = apiKeyDraft.trim();
    if (!clave) {
      Alert.alert('Falta la API key', 'Ingresa una API key válida de Groq.');
      return;
    }
    if (!MODELOS_GROQ.includes(modeloDraft)) {
      Alert.alert('Modelo no válido', 'Selecciona uno de los modelos disponibles de Groq.');
      return;
    }
    try {
      await Promise.all([
        guardarConfiguracionLocal(GROQ_API_KEY_STORAGE, clave),
        guardarConfiguracionLocal(GROQ_MODELO_STORAGE, modeloDraft),
      ]);
      setApiKeyGroq(clave);
      setModeloGroq(modeloDraft);
      setEstadoApi(`Groq configurada (${modeloDraft})`);
      setModalApiVisible(false);
    } catch (error) {
      console.error('Error guardando la configuración de Groq:', error);
      Alert.alert('No se pudo guardar la configuración', 'Verifica el almacenamiento seguro del dispositivo e inténtalo de nuevo.');
    }
  };

  // Elimina la clave de este dispositivo y detiene cualquier análisis pendiente.
  const eliminarConfiguracionApi = async () => {
    try {
      await Promise.all([
        eliminarConfiguracionLocal(GROQ_API_KEY_STORAGE),
        eliminarConfiguracionLocal(GROQ_MODELO_STORAGE),
      ]);
      controladorDecision.current?.abort();
      setApiKeyGroq('');
      setModeloGroq(MODELOS_GROQ[0]);
      setModeloDraft(MODELOS_GROQ[0]);
      setApiKeyDraft('');
      setInterpretacion('');
      setDecision('');
      setEstadoApi('Sin API key de Groq');
      setEstadoDecision('');
      setModalApiVisible(false);
    } catch (error) {
      console.error('Error eliminando la configuración de Groq:', error);
      Alert.alert('No se pudo eliminar la configuración', 'Vuelve a intentarlo.');
    }
  };

  // Genera una recomendación de decisión utilizando el mismo filtro y contexto que el gráfico.
  const generarDecision = async () => {
    if (!apiKeyGroq) {
      setEstadoDecision('Configura tu API key de Groq para generar una recomendación.');
      setDecisionVisible(true);
      return;
    }
    if (!contextoIA.hayDatos) {
      setEstadoDecision('No hay datos para analizar con los filtros seleccionados.');
      setDecisionVisible(true);
      return;
    }

    controladorDecision.current?.abort();
    const controlador = new AbortController();
    controladorDecision.current = controlador;
    setDecisionVisible(true);
    setDecision('');
    setEstadoDecision(`Generando recomendación con ${modeloGroq}...`);

    const contenido = [
      `Modo: ${contextoIA.modo === 'pedido' ? 'Pedidos' : 'Productos'}`,
      `Medida: ${contextoIA.medida}`,
      `Agrupación: ${contextoIA.dimension}`,
      `Filtro: ${contextoIA.filtro}`,
      `Valores del gráfico:\n${contextoIA.lineasDatos}`,
      `Interpretación previa: ${interpretacion || 'No hay análisis previo disponible.'}`,
    ].join('\n');

    try {
      const respuesta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKeyGroq}`,
        },
        signal: controlador.signal,
        body: JSON.stringify({
          model: modeloGroq,
          temperature: 0.3,
          max_tokens: 160,
          messages: [
            {
              role: 'system',
              content: 'Actúa como analista de datos senior. Redacta en español una decisión concreta en 2 o 3 oraciones y máximo 60 palabras. No inventes cifras ni categorías y no uses listas ni Markdown.',
            },
            { role: 'user', content: contenido },
          ],
        }),
      });
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        const detalle = cuerpo?.error?.message || `Error HTTP ${respuesta.status}`;
        if (respuesta.status === 401) throw new Error('API key de Groq inválida o sin permisos.');
        if (respuesta.status === 429) throw new Error('Se alcanzó el límite de solicitudes de Groq.');
        throw new Error(detalle);
      }
      const texto = cuerpo?.choices?.[0]?.message?.content;
      if (typeof texto !== 'string' || !texto.trim()) throw new Error('Groq no devolvió una respuesta válida.');
      setDecision(texto.trim());
      setEstadoDecision('');
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Error generando una decisión con Groq:', error);
      setDecision('');
      setEstadoDecision(error instanceof TypeError
        ? 'No se pudo conectar con Groq. Verifica tu conexión a Internet.'
        : `No fue posible generar la recomendación: ${error.message}`);
    }
  };

  // Descarga el archivo Excel existente utilizando la sesión autenticada del administrador.
  const descargarExcel = async () => {
    setDescargando(true);
    try {
      const fechaArchivo = new Date().toISOString().replace(/[:.]/g, '-');
      const carpetaReportes = new Directory(Paths.cache, 'reportes');
      carpetaReportes.create({ intermediates: true, idempotent: true });
      const archivo = new File(carpetaReportes, `Reporte_FastBite_${fechaArchivo}.xlsx`);
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const respuesta = await fetch('https://backend-gupal-alastapas-7s0v.onrender.com/estadisticas/excel', {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!respuesta.ok) throw new Error(`El servidor respondió con el estado ${respuesta.status}.`);
      archivo.write(new Uint8Array(await respuesta.arrayBuffer()));
      if (!await Sharing.isAvailableAsync()) {
        throw new Error('La función para compartir archivos no está disponible en este dispositivo.');
      }
      await Sharing.shareAsync(archivo.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Compartir reporte de FastBite',
      });
      Alert.alert('Reporte listo', 'El archivo Excel se generó correctamente.');
    } catch (error) {
      console.error('Error descargando el reporte de Excel:', error);
      Alert.alert('No se pudo descargar el reporte', error.message || 'Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  // Cambia el tipo de análisis y coloca filtros iniciales válidos para cada modo.
  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setGrupoElegido(configuracion[nuevoModo].grupos[0].id);
    setMedidaElegida(configuracion[nuevoModo].medidas[0].id);
    setFiltroElegido('todos');
  };

  // Muestra un indicador compacto con una etiqueta y el valor calculado.
  const renderIndicador = (titulo, valor, icono) => (
    <View key={titulo} style={styles.tarjetaIndicador}>
      <View style={styles.iconoIndicador}>
        <Ionicons name={icono} size={19} color="#ed0016" />
      </View>
      <Text style={styles.tituloIndicador}>{titulo}</Text>
      <Text style={styles.valorIndicador} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </View>
  );

  const filasGrafico = datosDashboard.filas;
  const medidaActual = configuracion[modo].medidas.find((medida) => medida.id === datosDashboard.medida);
  const formatearValor = (valor) => {
    if (modo === 'pedido' && datosDashboard.medida === 'promedio_ticket') {
      return formatoPorcentaje.format(valor);
    }
    if (modo === 'producto'
      && (datosDashboard.medida === 'importe' || datosDashboard.medida === 'promedio')) {
      return formatoMoneda.format(valor);
    }
    if (modo === 'pedido' && datosDashboard.medida === 'total') return formatoMoneda.format(valor);
    return formatoNumero.format(valor);
  };
  const tituloGrafico = `${medidaActual?.etiqueta} por ${datosDashboard.grupoActual?.etiqueta.toLowerCase()}`;
  const etiquetaTipoGrafico = {
    bar: 'Barras',
    line: 'Líneas',
    pie: 'Circular',
    doughnut: 'Dona',
  }[tipoGrafico];

  return (
    <>
      <ScrollView contentContainerStyle={styles.contenedor}>
      {/* El encabezado identifica esta pantalla administrativa y permite abrir el reporte Excel. */}
      <View style={styles.encabezado}>
        <View style={styles.encabezadoTexto}>
          <Text style={styles.eyebrow}>PANEL ADMINISTRATIVO</Text>
          <Text style={styles.titulo}>Dashboard multidimensional</Text>
          <Text style={styles.subtitulo}>Comida rápida · Explora ventas y pedidos con filtros e IA.</Text>
        </View>
        <View style={styles.accionesEncabezado}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setApiKeyDraft(apiKeyGroq);
              setModeloDraft(modeloGroq);
              setModalApiVisible(true);
            }}
            style={styles.botonReporte}
          >
            <Ionicons name="key-outline" size={18} color="#2563eb" />
            <Text style={styles.textoBotonApi}>Configurar Groq</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={descargarExcel}
            disabled={descargando}
            style={[styles.botonReporte, descargando && styles.botonDeshabilitado]}
          >
            {descargando
              ? <ActivityIndicator size="small" color="#ed0016" />
              : <Ionicons name="download-outline" size={19} color="#ed0016" />}
            <Text style={styles.textoBotonReporte}>{descargando ? 'Preparando' : 'Excel'}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.estadoApi}>
        <View style={[styles.indicadorApi, apiKeyGroq && styles.indicadorApiActivo]} />
        <Text style={styles.textoEstadoApi}>{estadoApi}</Text>
      </View>

      {/* Los controles definen el modo, la medida, la agrupación y el filtro de los datos. */}
      <View style={styles.tarjeta}>
        <Text style={styles.tituloSeccion}>Filtros y configuración</Text>
        <Selector
          titulo="Analizar por"
          opciones={[
            { id: 'pedido', etiqueta: 'Pedidos' },
            { id: 'producto', etiqueta: 'Productos' },
          ]}
          valor={modo}
          alCambiar={cambiarModo}
        />
        <Selector
          titulo="Medida principal"
          opciones={configuracion[modo].medidas}
          valor={datosDashboard.medida}
          alCambiar={setMedidaElegida}
        />
        <Selector
          titulo="Agrupar resultados por"
          opciones={configuracion[modo].grupos}
          valor={datosDashboard.grupo}
          alCambiar={(grupo) => {
            setGrupoElegido(grupo);
            setFiltroElegido('todos');
          }}
        />
        <Selector
          titulo={modo === 'pedido' ? datosDashboard.grupoActual?.etiqueta : configuracion[modo].etiquetaFiltro}
          opciones={datosDashboard.opcionesFiltro}
          valor={datosDashboard.filtro}
          alCambiar={setFiltroElegido}
        />
        <Selector
          titulo="Tipo de gráfico"
          opciones={[
            { id: 'bar', etiqueta: 'Barras' },
            { id: 'line', etiqueta: 'Líneas' },
            { id: 'pie', etiqueta: 'Circular' },
            { id: 'doughnut', etiqueta: 'Dona' },
          ]}
          valor={tipoGrafico}
          alCambiar={setTipoGrafico}
        />
      </View>

      {/* Los indicadores reproducen las métricas que presenta el modo activo en el dashboard original. */}
      <View style={styles.contenedorIndicadores}>
        {modo === 'pedido' ? (
          <>
            {renderIndicador('Total pedidos', formatoNumero.format(datosDashboard.totalPedidos), 'receipt-outline')}
            {renderIndicador('Suma de totales', formatoMoneda.format(datosDashboard.sumaTotales), 'cash-outline')}
            {renderIndicador('Promedio vs. global', formatoPorcentaje.format(datosDashboard.promedioRelativoPedidos), 'trending-up-outline')}
          </>
        ) : (
          <>
            {renderIndicador('Importe total', formatoMoneda.format(datosDashboard.importeVentas), 'cash-outline')}
            {renderIndicador('Apariciones totales', formatoNumero.format(datosDashboard.unidades), 'fast-food-outline')}
            {renderIndicador('Importe promedio', formatoMoneda.format(datosDashboard.promedio), 'pricetag-outline')}
          </>
        )}
      </View>

      {/* El gráfico cambia entre barras, líneas, circular y dona usando las mismas medidas y agrupaciones. */}
      <View style={styles.tarjeta}>
        <View style={styles.encabezadoGrafico}>
          <Text style={styles.tituloSeccion}>{tituloGrafico}</Text>
          <Text style={styles.subtituloGrafico}>{etiquetaTipoGrafico}</Text>
        </View>
        {cargando ? (
          <View style={styles.estado}>
            <ActivityIndicator size="large" color="#ed0016" />
            <Text style={styles.textoEstado}>Cargando estadísticas...</Text>
          </View>
        ) : errorCarga ? (
          <View style={styles.estado}>
            <Ionicons name="cloud-offline-outline" size={28} color="#b42318" />
            <Text style={styles.textoError}>{errorCarga}</Text>
          </View>
        ) : filasGrafico.length === 0 ? (
          <View style={styles.estado}>
            <Ionicons name="bar-chart-outline" size={30} color="#9297a3" />
            <Text style={styles.textoEstado}>No hay datos para mostrar con estos filtros.</Text>
          </View>
        ) : (
          <GraficoDashboard tipo={tipoGrafico} filas={filasGrafico} formatearValor={formatearValor} />
        )}
      </View>

      {/* Groq genera una interpretación de los datos y permite pedir una recomendación de decisión. */}
      <View style={styles.tarjeta}>
        <View style={styles.encabezadoAnalisis}>
          <View style={styles.tituloAnalisis}>
            <View style={styles.iconoAnalisis}>
              <Ionicons name="sparkles-outline" size={19} color="#6d43b5" />
            </View>
            <Text style={styles.tituloSeccion}>Interpretación automática con IA</Text>
          </View>
          <View style={styles.accionesAnalisis}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRecargarInterpretacion((actual) => actual + 1)}
              style={styles.botonSecundario}
            >
              <Text style={styles.textoBotonSecundario}>Regenerar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={generarDecision}
              style={styles.botonPrimario}
            >
              <Text style={styles.textoBotonPrimario}>Toma de decisión</Text>
            </Pressable>
          </View>
        </View>
        {!!estadoInterpretacion && (
          <Text style={[styles.estadoInterpretacion, estadoInterpretacion.startsWith('No') && styles.errorInterpretacion]}>
            {estadoInterpretacion}
          </Text>
        )}
        {!!interpretacion && <Text style={styles.textoAnalisis}>{interpretacion}</Text>}
        {decisionVisible && (
          <View style={styles.bloqueDecision}>
            <Text style={styles.tituloDecision}>Toma de decisión</Text>
            {!!estadoDecision && (
              <Text style={[styles.estadoInterpretacion, estadoDecision.startsWith('No') && styles.errorInterpretacion]}>
                {estadoDecision}
              </Text>
            )}
            {!!decision && <Text style={styles.textoAnalisis}>{decision}</Text>}
          </View>
        )}
      </View>

      {/* Esta nota aclara el criterio para evitar que pedidos cancelados se confundan con ventas. */}
      <Text style={styles.nota}>
        Las ventas y productos vendidos excluyen pedidos cancelados; el conteo de pedidos sí los incluye.
      </Text>
      </ScrollView>

      {/* El modal conserva la configuración de Groq, permite cambiar el modelo y borrar la clave guardada. */}
      <Modal
        visible={modalApiVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalApiVisible(false)}
      >
        <View style={styles.fondoModal}>
          <View style={styles.modalApi}>
            <View style={styles.encabezadoModal}>
              <Text style={styles.tituloModal}>Configurar Groq</Text>
              <Pressable accessibilityRole="button" onPress={() => setModalApiVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#515563" />
              </Pressable>
            </View>
            <Text style={styles.textoAyudaModal}>
              En el móvil la API key se guarda de forma protegida; se envía directamente a Groq para generar el análisis.
            </Text>
            <Text style={styles.etiquetaModal}>Modelo de Groq</Text>
            <Selector
              titulo=""
              opciones={[
                { id: MODELOS_GROQ[0], etiqueta: 'GPT OSS 20B' },
                { id: MODELOS_GROQ[1], etiqueta: 'GPT OSS Safeguard' },
                { id: MODELOS_GROQ[2], etiqueta: 'Qwen 3.8 27B' },
              ]}
              valor={modeloDraft}
              alCambiar={setModeloDraft}
            />
            <Text style={styles.etiquetaModal}>API key</Text>
            <TextInput
              value={apiKeyDraft}
              onChangeText={setApiKeyDraft}
              placeholder="API key de Groq"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.campoApiKey}
            />
            <View style={styles.accionesModal}>
              <Pressable accessibilityRole="button" onPress={eliminarConfiguracionApi} style={styles.botonEliminarApi}>
                <Text style={styles.textoEliminarApi}>Eliminar clave</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setModalApiVisible(false)} style={styles.botonSecundario}>
                <Text style={styles.textoBotonSecundario}>Cancelar</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={guardarConfiguracionApi} style={styles.botonPrimario}>
                <Text style={styles.textoBotonPrimario}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Estos estilos definen la jerarquía visual, tarjetas y filtros del dashboard.
const styles = StyleSheet.create({
  contenedor: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 44,
    paddingBottom: 28,
    backgroundColor: '#f5f6f8',
  },
  encabezado: {
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accionesEncabezado: { alignItems: 'flex-end', gap: 8 },
  encabezadoTexto: { flex: 1 },
  eyebrow: { color: '#c90014', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  titulo: { marginTop: 3, color: '#242630', fontSize: 27, fontWeight: '800' },
  subtitulo: { marginTop: 5, color: '#777b86', fontSize: 13, lineHeight: 18 },
  botonReporte: {
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#ffe0e3',
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  textoBotonApi: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  botonDeshabilitado: { opacity: 0.6 },
  textoBotonReporte: { color: '#ed0016', fontSize: 12, fontWeight: '800' },
  estadoApi: { marginTop: -8, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  indicadorApi: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#94a3b8' },
  indicadorApiActivo: { backgroundColor: '#16a34a' },
  textoEstadoApi: { color: '#64748b', fontSize: 12 },
  tarjeta: {
    marginBottom: 14,
    padding: 16,
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
  tituloSeccion: { marginBottom: 6, color: '#242630', fontSize: 16, fontWeight: '800' },
  bloqueSelector: { marginTop: 13 },
  etiquetaCampo: { marginBottom: 8, color: '#777b86', fontSize: 12, fontWeight: '700' },
  opcionesSelector: { gap: 8, paddingRight: 4 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 12,
    backgroundColor: '#f8f9fb',
  },
  chipActivo: { borderColor: '#ffd0d5', backgroundColor: '#fff0f1' },
  textoChip: { color: '#686d79', fontSize: 12, fontWeight: '700' },
  textoChipActivo: { color: '#c90014' },

  // Las tarjetas de indicadores se acomodan en dos columnas en pantallas estrechas.
  contenedorIndicadores: { marginBottom: 2, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tarjetaIndicador: {
    width: '48.5%',
    minHeight: 120,
    marginBottom: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: '#eceef2',
    borderRadius: 17,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#222',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  iconoIndicador: {
    width: 34,
    height: 34,
    marginBottom: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#fff0f1',
  },
  tituloIndicador: { color: '#777b86', fontSize: 11, fontWeight: '600' },
  valorIndicador: { marginTop: 5, color: '#242630', fontSize: 18, fontWeight: '800' },

  // El contenedor desplaza gráficos anchos horizontalmente sin aplastar sus etiquetas.
  graficoVertical: { alignItems: 'flex-start' },
  encabezadoGrafico: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  subtituloGrafico: { color: '#858a95', fontSize: 11, fontWeight: '600' },
  leyendaGrafico: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 4 },
  elementoLeyenda: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 5 },
  puntoLeyenda: { width: 8, height: 8, borderRadius: 4 },
  textoLeyenda: { flex: 1, color: '#515563', fontSize: 10 },
  valorLeyenda: { color: '#242630', fontSize: 10, fontWeight: '700' },
  estado: { minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 10 },
  textoEstado: { color: '#777b86', fontSize: 13, textAlign: 'center' },
  textoError: { color: '#b42318', fontSize: 13, lineHeight: 19, textAlign: 'center' },

  // El bloque de análisis muestra los estados de Groq, la interpretación y la decisión.
  encabezadoAnalisis: { gap: 8 },
  tituloAnalisis: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accionesAnalisis: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  iconoAnalisis: {
    width: 33,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#f2ecff',
  },
  textoAnalisis: { color: '#515563', fontSize: 13, lineHeight: 20 },
  bloqueDecision: { marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: '#eceef2' },
  tituloDecision: { marginBottom: 6, color: '#242630', fontSize: 13, fontWeight: '800' },
  estadoInterpretacion: { marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: 12, lineHeight: 18 },
  errorInterpretacion: { backgroundColor: '#fee2e2', color: '#991b1b' },
  botonPrimario: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 9, backgroundColor: '#2563eb' },
  textoBotonPrimario: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  botonSecundario: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 9, backgroundColor: '#e2e8f0' },
  textoBotonSecundario: { color: '#1e293b', fontSize: 12, fontWeight: '700' },

  // El modal facilita editar, guardar o quitar la configuración de Groq desde el dispositivo.
  fondoModal: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15, 23, 42, .55)' },
  modalApi: { padding: 20, borderRadius: 16, backgroundColor: '#ffffff' },
  encabezadoModal: { marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tituloModal: { color: '#242630', fontSize: 20, fontWeight: '800' },
  textoAyudaModal: { marginBottom: 14, color: '#64748b', fontSize: 12, lineHeight: 18 },
  etiquetaModal: { marginTop: 10, color: '#242630', fontSize: 13, fontWeight: '700' },
  campoApiKey: { minHeight: 46, marginTop: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 9, color: '#242630' },
  accionesModal: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  botonEliminarApi: { marginRight: 'auto', justifyContent: 'center', paddingHorizontal: 8 },
  textoEliminarApi: { color: '#991b1b', fontSize: 12, fontWeight: '700' },
  nota: { marginHorizontal: 2, marginBottom: 6, color: '#858a95', fontSize: 11, lineHeight: 16 },
});
