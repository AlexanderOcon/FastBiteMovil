# Creación de administradores

La función callable `createAdminUser` crea la cuenta de autenticación y registra el perfil con `role: 'admin'`. Solo puede invocarla un administrador autenticado. La contraseña se envía por el canal autenticado de Firebase Callable y no se guarda en Firestore.

Para habilitar esta opción:

1. Confirma que Cloud Functions esté habilitado para el proyecto Firebase.
2. Despliega la función desde la raíz del proyecto:

   ```sh
   npx firebase-tools deploy --only functions --project <FIREBASE_PROJECT_ID>
   ```

3. Abre la app con un build actualizado e inicia sesión como administrador. La pestaña **Equipo** permite crear otra cuenta admin.

El nuevo administrador inicia sesión usando el nombre de usuario y la contraseña definidos. El correo y teléfono que se capturan se guardan en su perfil.
