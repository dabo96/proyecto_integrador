/**
 * Helper para integrar moderación de imágenes en el flujo existente
 * 
 * Este archivo muestra cómo integrar la moderación en tus funciones
 * de subida de imágenes existentes.
 */

import { moderarImagenDesdeURL } from './imageModerationSightengine'; // Cambiar según el servicio que uses
import { Alert } from 'react-native';

/**
 * Wrapper para subir imagen con moderación
 * Integra con tu función existente de Firebase Storage
 */
export const subirImagenConModeracion = async (
  subirImagenAFirebase: (uri: string) => Promise<string>,
  imageUri: string,
  onReject?: () => void
): Promise<string | null> => {
  try {
    // Primero subir la imagen temporalmente (o usar una URL temporal)
    // Para Sightengine, puedes usar la URI local directamente si es accesible
    // O subir primero a un bucket temporal
    
    // Opción 1: Moderar antes de subir (requiere subir a un bucket temporal)
    // Opción 2: Moderar después de subir (más simple)
    
    // Por ahora, subimos primero y luego moderamos
    const imageUrl = await subirImagenAFirebase(imageUri);
    
    // Moderar la imagen
    const moderationResult = await moderarImagenDesdeURL(imageUrl);
    
    if (!moderationResult.isSafe) {
      // Si la imagen no es segura, eliminar de Storage y rechazar
      Alert.alert(
        'Imagen rechazada',
        `Tu imagen no cumple con nuestras políticas de contenido. Razón: ${moderationResult.reason || 'Contenido inapropiado'}`,
        [{ text: 'Entendido' }]
      );
      
      if (onReject) {
        onReject();
      }
      
      // TODO: Eliminar la imagen de Firebase Storage aquí
      // await deleteObject(ref(storage, imagePath));
      
      return null;
    }
    
    return imageUrl;
  } catch (error: any) {
    // console.error('Error en moderación:', error);
    // En caso de error, puedes decidir si rechazar o permitir
    // Por seguridad, es mejor rechazar
    Alert.alert(
      'Error de moderación',
      'No se pudo verificar la imagen. Por favor, intenta con otra imagen.'
    );
    return null;
  }
};

/**
 * Función helper para usar en tus componentes
 * Ejemplo de uso en newPost.tsx:
 * 
 * const imagenUrl = await subirImagenConModeracion(
 *   subirImagenAFirebase,
 *   imagen,
 *   () => setImagen(null) // Limpiar imagen si es rechazada
 * );
 */
export const validarYSubirImagen = async (
  imageUri: string,
  uploadFunction: (uri: string) => Promise<string>
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const url = await subirImagenConModeracion(uploadFunction, imageUri);
    
    if (!url) {
      return {
        success: false,
        error: 'La imagen fue rechazada por moderación'
      };
    }
    
    return {
      success: true,
      url
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Error al procesar la imagen'
    };
  }
};

