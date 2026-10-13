import { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('user');
  const [authReady, setAuthReady] = useState(false);
  const [roleReady, setRoleReady] = useState(false);

  useEffect(() => {
    let activeUserId = null;

    return onAuthStateChanged(auth, async (nextUser) => {
      activeUserId = nextUser?.uid ?? null;
      setUser(nextUser);
      setRoleReady(false);

      if (!nextUser) {
        setRole('user');
        setRoleReady(true);
        setAuthReady(true);
        return;
      }

      try {
        // Lee el documento del usuario en Firestore para validar si tiene el rol de administrador.
        const profile = await getDoc(doc(db, 'usuarios', nextUser.uid));
        if (activeUserId !== nextUser.uid) return;

        // Se considera administrador también al correo interno del usuario admin, aunque el documento
        // del perfil aún no haya sido creado o no incluya la propiedad role.
        const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
        const adminEmail = projectId ? `admin@${projectId}.firebaseapp.com` : null;
        const isAdminAccount = !!adminEmail && nextUser.email?.toLowerCase() === adminEmail.toLowerCase();
        const isAdminRole = profile.exists() && profile.data().role === 'admin';

        // Si cualquiera de estas condiciones es verdadera, la app redirige a Administración.
        setRole(isAdminRole || isAdminAccount ? 'admin' : 'user');
      } catch (error) {
        if (activeUserId !== nextUser.uid) return;
        console.error('No se pudo comprobar el rol del usuario:', error);
        setRole('user');
      } finally {
        if (activeUserId === nextUser.uid) {
          setRoleReady(true);
          setAuthReady(true);
        }
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, authReady, roleReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
