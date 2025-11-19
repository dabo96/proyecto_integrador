/**
 * Servicio de moderación de imágenes usando Google Cloud Vision API
 * 
 * Requisitos:
 * 1. Instalar: npm install @google-cloud/vision
 * 2. Habilitar Cloud Vision API en Google Cloud Console
 * 3. Configurar credenciales (service account key)
 * 
 * Alternativa más simple: Usar Cloudinary o Sightengine (ver abajo)
 */

import { ImageAnnotatorClient } from '@google-cloud/vision';

// Configuración
const client = new ImageAnnotatorClient({
  // Opción 1: Usar variable de entorno con ruta al archivo JSON de credenciales
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  // Opción 2: O usar credenciales directamente (no recomendado para producción)
  // credentials: { ... }
});

export interface ModerationResult {
  isSafe: boolean;
  adult: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  violence: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  racy: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  medical: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  spoof: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
  reason?: string;
}

/**
 * Modera una imagen desde una URL
 */
export const moderarImagenDesdeURL = async (imageUrl: string): Promise<ModerationResult> => {
  try {
    const [result] = await client.safeSearchDetection(imageUrl);
    const safeSearch = result.safeSearchAnnotation;

    if (!safeSearch) {
      return {
        isSafe: false,
        adult: 'POSSIBLE',
        violence: 'POSSIBLE',
        racy: 'POSSIBLE',
        medical: 'POSSIBLE',
        spoof: 'POSSIBLE',
        reason: 'No se pudo analizar la imagen'
      };
    }

    // Considerar inseguro si alguna categoría es LIKELY o VERY_LIKELY
    const isSafe = 
      safeSearch.adult !== 'LIKELY' && safeSearch.adult !== 'VERY_LIKELY' &&
      safeSearch.violence !== 'LIKELY' && safeSearch.violence !== 'VERY_LIKELY' &&
      safeSearch.racy !== 'LIKELY' && safeSearch.racy !== 'VERY_LIKELY';

    const reasons: string[] = [];
    if (safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY') {
      reasons.push('contenido para adultos');
    }
    if (safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY') {
      reasons.push('violencia');
    }
    if (safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY') {
      reasons.push('contenido sugerente');
    }

    return {
      isSafe,
      adult: safeSearch.adult as any,
      violence: safeSearch.violence as any,
      racy: safeSearch.racy as any,
      medical: safeSearch.medical as any,
      spoof: safeSearch.spoof as any,
      reason: reasons.length > 0 ? reasons.join(', ') : undefined
    };
  } catch (error: any) {
    console.error('Error moderando imagen:', error);
    throw new Error(`Error al moderar imagen: ${error.message}`);
  }
};

/**
 * Modera una imagen desde un buffer/base64
 */
export const moderarImagenDesdeBuffer = async (imageBuffer: Buffer | Uint8Array): Promise<ModerationResult> => {
  try {
    const [result] = await client.safeSearchDetection({
      image: { content: imageBuffer }
    });
    const safeSearch = result.safeSearchAnnotation;

    if (!safeSearch) {
      return {
        isSafe: false,
        adult: 'POSSIBLE',
        violence: 'POSSIBLE',
        racy: 'POSSIBLE',
        medical: 'POSSIBLE',
        spoof: 'POSSIBLE',
        reason: 'No se pudo analizar la imagen'
      };
    }

    const isSafe = 
      safeSearch.adult !== 'LIKELY' && safeSearch.adult !== 'VERY_LIKELY' &&
      safeSearch.violence !== 'LIKELY' && safeSearch.violence !== 'VERY_LIKELY' &&
      safeSearch.racy !== 'LIKELY' && safeSearch.racy !== 'VERY_LIKELY';

    const reasons: string[] = [];
    if (safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY') {
      reasons.push('contenido para adultos');
    }
    if (safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY') {
      reasons.push('violencia');
    }
    if (safeSearch.racy === 'LIKELY' || safeSearch.racy === 'VERY_LIKELY') {
      reasons.push('contenido sugerente');
    }

    return {
      isSafe,
      adult: safeSearch.adult as any,
      violence: safeSearch.violence as any,
      racy: safeSearch.racy as any,
      medical: safeSearch.medical as any,
      spoof: safeSearch.spoof as any,
      reason: reasons.length > 0 ? reasons.join(', ') : undefined
    };
  } catch (error: any) {
    console.error('Error moderando imagen:', error);
    throw new Error(`Error al moderar imagen: ${error.message}`);
  }
};

