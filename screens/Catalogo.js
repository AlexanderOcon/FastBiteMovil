import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import BuscadorCatalogo from '../components/catalogo/BuscadorCatalogo';
import CarruselOfertas from '../components/catalogo/CarruselOfertas';
import ListaCatalogo from '../components/catalogo/ListaCatalogo';
import { adaptarProductos } from '../components/catalogo/catalogoUtils';

export default function Catalogo({ navigation }) {
  const { width: anchoVentana } = useWindowDimensions();
  const catalogoEnfocado = useIsFocused();
  const scrollOfertasRef = useRef(null);
  const [productos, setProductos] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [indiceOferta, setIndiceOferta] = useState(0);
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const anchoOferta = anchoVentana - 20;

  useEffect(() => {
    if (!catalogoEnfocado || ofertas.length < 2) return undefined;

    const siguienteIndice =
      indiceOferta >= ofertas.length - 1 ? 0 : indiceOferta + 1;
    const temporizador = setTimeout(() => {
      scrollOfertasRef.current?.scrollTo({
        x: siguienteIndice * (anchoOferta + 12),
        animated: true,
      });
      setIndiceOferta(siguienteIndice);
    }, 4000);

    return () => clearTimeout(temporizador);
  }, [anchoOferta, catalogoEnfocado, indiceOferta, ofertas.length]);

  const categorias = [
    'Todos',
    ...new Set(productos.map((producto) => producto.categoria).filter(Boolean)),
  ];

  useEffect(() => onSnapshot(
    collection(db, 'productos'),
    (consulta) => setProductos(adaptarProductos(consulta)),
    (error) => console.error('Error obteniendo productos:', error),
  ), []);

  useEffect(() => {
    const consultaOfertas = query(collection(db, 'ofertas'), where('activa', '==', true));
    return onSnapshot(
      consultaOfertas,
      (snapshot) => {
        setOfertas(snapshot.docs.map((documento) => ({
          ...documento.data(),
          id: documento.id,
        })));
        setIndiceOferta(0);
        scrollOfertasRef.current?.scrollTo({ x: 0, animated: false });
      },
      (error) => {
        console.error('Error obteniendo ofertas activas:', error);
        Alert.alert('No se pudieron cargar las ofertas', 'Verifica los permisos de Firestore.');
      },
    );
  }, []);

  const productosFiltrados = productos.filter((producto) => {
    const coincideCategoria =
      categoriaActiva === 'Todos' || producto.categoria === categoriaActiva;
    const textoProducto =
      `${producto.nombre || ''} ${producto.categoria || ''} ${producto.descripcion || ''}`;
    const coincideBusqueda = textoProducto
      .toLowerCase()
      .includes(busqueda.trim().toLowerCase());

    return coincideCategoria && coincideBusqueda;
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#ed0016" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <BuscadorCatalogo busqueda={busqueda} setBusqueda={setBusqueda} />
        <CarruselOfertas
          ofertas={ofertas}
          productos={productos}
          anchoOferta={anchoOferta}
          indiceOferta={indiceOferta}
          setIndiceOferta={setIndiceOferta}
          scrollOfertasRef={scrollOfertasRef}
          navigation={navigation}
        />
        <ListaCatalogo
          categorias={categorias}
          categoriaActiva={categoriaActiva}
          setCategoriaActiva={setCategoriaActiva}
          productosFiltrados={productosFiltrados}
          navigation={navigation}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
});
