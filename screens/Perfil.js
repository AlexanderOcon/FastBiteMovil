import { useContext } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { CarritoContext } from '../context/CarritoContext';
import AccesoCuenta from '../components/perfil/AccesoCuenta';
import TarjetaCuenta from '../components/perfil/TarjetaCuenta';
import SeccionDirecciones from '../components/perfil/SeccionDirecciones';
import useDatosPerfil from '../hooks/useDatosPerfil';
import usePerfilAuth from '../hooks/usePerfilAuth';

export default function Perfil() {
  const { user } = useAuth();
  const { cerrarSesion } = useContext(CarritoContext);
  const autenticacion = usePerfilAuth();
  const datos = useDatosPerfil(user);

  if (!user) {
    return (
      <KeyboardAvoidingView
        style={styles.contenedorTeclado}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.authContenedor}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <AccesoCuenta {...autenticacion} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.contenedorTeclado}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.contenedor}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <TarjetaCuenta
          user={user}
          perfil={datos.perfil}
          editandoPerfil={datos.editandoPerfil}
          nombreUsuarioPerfil={datos.nombreUsuarioPerfil}
          setNombreUsuarioPerfil={datos.setNombreUsuarioPerfil}
          telefonoPerfil={datos.telefonoPerfil}
          setTelefonoPerfil={datos.setTelefonoPerfil}
          correoPerfil={datos.correoPerfil}
          setCorreoPerfil={datos.setCorreoPerfil}
          guardandoPerfil={datos.guardandoPerfil}
          guardarPerfil={datos.guardarPerfil}
          editarPerfil={datos.editarPerfil}
          cancelarEdicion={() => datos.setEditandoPerfil(false)}
          cerrarSesion={cerrarSesion}
        />
        <SeccionDirecciones
          idDireccionEditando={datos.idDireccionEditando}
          etiqueta={datos.etiqueta}
          setEtiqueta={datos.setEtiqueta}
          direccion={datos.direccion}
          setDireccion={datos.setDireccion}
          referencia={datos.referencia}
          setReferencia={datos.setReferencia}
          telefono={datos.telefono}
          setTelefono={datos.setTelefono}
          guardarDireccion={datos.guardarDireccion}
          limpiarFormularioDireccion={datos.limpiarFormularioDireccion}
          direcciones={datos.direcciones}
          direccionPerfilSeleccionada={datos.direccionPerfilSeleccionada}
          idDireccionSeleccionada={datos.idDireccionSeleccionada}
          setIdDireccionSeleccionada={datos.setIdDireccionSeleccionada}
          direccionesAbiertas={datos.direccionesAbiertas}
          setDireccionesAbiertas={datos.setDireccionesAbiertas}
          editarDireccion={datos.editarDireccion}
          eliminarDireccion={datos.eliminarDireccion}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedorTeclado: { flex: 1 },
  authContenedor: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
    backgroundColor: '#f5f6f8',
  },
  contenedor: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 36,
    paddingBottom: 40,
    backgroundColor: '#f6f7f9',
  },
});
