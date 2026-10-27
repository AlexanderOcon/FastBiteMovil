import { createClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const bucketName = process.env.EXPO_PUBLIC_SUPABASE_BUCKET;
const tiposImagenPermitidos = new Set(['image/jpeg', 'image/png', 'image/webp']);
const tamanoMaximoImagen = 8 * 1024 * 1024;
let clienteSupabase;

function obtenerClienteSupabase() {
  const faltantes = [];
  if (!supabaseUrl) faltantes.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) faltantes.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!bucketName) faltantes.push('EXPO_PUBLIC_SUPABASE_BUCKET');

  if (faltantes.length > 0) {
    throw new Error(`Falta configurar en .env: ${faltantes.join(', ')}.`);
  }

  if (!clienteSupabase) {
    clienteSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return clienteSupabase;
}

function obtenerExtensionImagen(tipoMime) {
  if (tipoMime === 'image/png') return 'png';
  if (tipoMime === 'image/webp') return 'webp';
  return 'jpg';
}

export async function subirImagenProducto(asset) {
  const cliente = obtenerClienteSupabase();
  const tipoMime = asset.mimeType || asset.file?.type || 'image/jpeg';

  if (!tiposImagenPermitidos.has(tipoMime)) {
    throw new Error('Elige una imagen JPG, PNG o WebP.');
  }

  const contenidoBase64 = asset.base64;
  if (!contenidoBase64) {
    throw new Error('No se pudo leer la imagen. Selecciónala nuevamente.');
  }

  const tamanoArchivo = Math.floor((contenidoBase64.length * 3) / 4)
    - (contenidoBase64.endsWith('==') ? 2 : contenidoBase64.endsWith('=') ? 1 : 0);
  if (tamanoArchivo && tamanoArchivo > tamanoMaximoImagen) {
    throw new Error('La imagen supera el límite de 8 MB.');
  }

  const archivo = decode(contenidoBase64);
  const nombreArchivo = `productos/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${obtenerExtensionImagen(tipoMime)}`;
  const { data, error } = await cliente.storage
    .from(bucketName)
    .upload(nombreArchivo, archivo, {
      cacheControl: '3600',
      contentType: tipoMime,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase no pudo subir la imagen: ${error.message}`);
  }

  const { data: urlPublica } = cliente.storage.from(bucketName).getPublicUrl(data.path);
  return { path: data.path, url: urlPublica.publicUrl };
}

export async function eliminarImagenProducto(path) {
  const cliente = obtenerClienteSupabase();
  const { error } = await cliente.storage.from(bucketName).remove([path]);
  if (error) throw new Error(`No se pudo limpiar la imagen subida: ${error.message}`);
}
