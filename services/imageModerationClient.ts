/**
 * Cliente para validación de contenido de imágenes
 * 
 * Este servicio llama a Firebase Functions, ocultando completamente
 * qué tecnología se usa para la moderación.
 * 
 * Desde el punto de vista del cliente, solo hay una "validación de contenido"
 * sin mencionar IA, APIs externas, etc.
 */

import { deleteImageByUrl, subirImagenFinal, subirImagenTemporal } from "@/api/profileService";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app);

// Llamar a la función de Firebase usando httpsCallable
const validarContenidoImagenFunction = httpsCallable<
  { imageUrl: string },
  { valida: boolean; motivo: string | null; detalles: { nivelRiesgo: string } }
>(functions, 'validarContenidoImagen');

export interface ValidacionResultado {
  valida: boolean;
  motivo: string | null;
  nivelRiesgo: 'bajo' | 'alto';
}

/**
 * Valida el contenido de una imagen
 * 
 * @param imageUrl URL de la imagen a validar
 * @returns Resultado de la validación
 */
export const validarContenidoImagen = async (
  imageUrl: string
): Promise<ValidacionResultado> => {
  try {
    const resultado = await validarContenidoImagenFunction({ imageUrl });

    return {
      valida: resultado.data.valida,
      motivo: resultado.data.motivo,
      nivelRiesgo: resultado.data.detalles.nivelRiesgo as 'bajo' | 'alto',
    };
  } catch (error: any) {
    console.error('Error validando contenido:', error);

    // En caso de error, por seguridad rechazamos la imagen
    // Puedes cambiar esto según tus necesidades
    throw new Error(
      error.message || 'No se pudo validar el contenido de la imagen'
    );
  }
};

/**
 * Helper para integrar en el flujo de subida de imágenes
 * 
 * Versión para foto de perfil (usa subirImagenTemporal y subirImagenFinal)
 */
export const validarYSubirImagen = async (
  imageUri: string,
  usuarioID: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // 1. SUBIR TEMPORAL (pública)
    const tempUrl = await subirImagenTemporal(usuarioID, imageUri);

    // 2. VALIDAR
    const validacion = await validarContenidoImagen(tempUrl);

    if (!validacion.valida) {
      await deleteImageByUrl(tempUrl);
      return {
        success: false,
        error: validacion.motivo ?? "Contenido no permitido",
      };
    }

    // 3. SI SE APRUEBA → SUBIR FILE FINAL
    const finalUrl = await subirImagenFinal(usuarioID, imageUri);

    // 4. BORRAR TEMP
    await deleteImageByUrl(tempUrl);

    return { success: true, url: finalUrl };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Helper para publicaciones (usa función de subida personalizada)
 */
export const validarYSubirImagenPublicacion = async (
  subirImagenAFirebase: (uri: string) => Promise<string>,
  imageUri: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Primero subir la imagen
    const imageUrl = await subirImagenAFirebase(imageUri);

    // Luego validar el contenido
    const validacion = await validarContenidoImagen(imageUrl);

    if (!validacion.valida) {
      // TODO: Eliminar la imagen de Storage si es rechazada
      // await deleteImageByUrl(imageUrl);
      return {
        success: false,
        error: validacion.motivo || 'El contenido no cumple con nuestras políticas',
      };
    }

    return {
      success: true,
      url: imageUrl,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al procesar la imagen',
    };
  }
};

