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


// URL de la función de Firebase (onRequest en lugar de onCall)
const FUNCTION_URL = 'https://us-central1-apolo-marketplace.cloudfunctions.net/validarContenidoImagen';

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
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      throw new Error(`Error en la respuesta: ${response.status}`);
    }

    const resultado = await response.json();

    return {
      valida: resultado.valida,
      motivo: resultado.motivo,
      nivelRiesgo: resultado.detalles.nivelRiesgo as 'bajo' | 'alto',
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
 * Ejemplo de uso:
 * 
 * const imagenUrl = await subirImagenAFirebase(imagen);
 * const validacion = await validarContenidoImagen(imagenUrl);
 * 
 * if (!validacion.valida) {
 *   Alert.alert('Contenido no permitido', validacion.motivo || 'La imagen no cumple con nuestras políticas');
 *   // Eliminar imagen de Storage
 *   return;
 * }
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

