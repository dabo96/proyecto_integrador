/**
 * Servicio de moderación de imágenes usando Cloudinary
 * 
 * Ventajas:
 * - Muy fácil de integrar
 * - Moderación automática al subir
 * - Incluye CDN y optimización de imágenes
 * - Plan gratuito generoso
 * 
 * Requisitos:
 * 1. Crear cuenta en cloudinary.com
 * 2. Instalar: npm install cloudinary
 * 3. Configurar variables de entorno
 */

import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

export interface CloudinaryModerationResult {
  isSafe: boolean;
  moderation: {
    adult?: number;
    violence?: number;
    racy?: number;
    medical?: number;
    spoof?: number;
  };
  reason?: string;
}

/**
 * Sube y modera una imagen automáticamente
 */
export const subirYModerarImagen = async (
  imageUri: string,
  folder: string = 'linku'
): Promise<{ url: string; moderation: CloudinaryModerationResult }> => {
  try {
    // Subir imagen con moderación automática
    const result = await cloudinary.uploader.upload(imageUri, {
      folder,
      moderation: 'aws_rek', // Usa AWS Rekognition para moderación
      // O usar: moderation: 'google_video_moderation' para Google
    });

    // Verificar resultado de moderación
    const moderationStatus = result.moderation?.[0];
    const isSafe = moderationStatus?.status === 'approved';

    return {
      url: result.secure_url,
      moderation: {
        isSafe,
        moderation: {
          adult: result.moderation?.[0]?.confidence,
          violence: result.moderation?.[0]?.confidence,
          racy: result.moderation?.[0]?.confidence,
        },
        reason: !isSafe ? moderationStatus?.status : undefined
      }
    };
  } catch (error: any) {
    // console.error('Error subiendo y moderando imagen:', error);
    throw new Error(`Error al procesar imagen: ${error.message}`);
  }
};

/**
 * Modera una imagen existente en Cloudinary
 */
export const moderarImagenExistente = async (publicId: string): Promise<CloudinaryModerationResult> => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      moderation: true
    });

    const moderationStatus = result.moderation?.[0];
    const isSafe = moderationStatus?.status === 'approved';

    return {
      isSafe,
      moderation: {
        adult: moderationStatus?.confidence,
        violence: moderationStatus?.confidence,
        racy: moderationStatus?.confidence,
      },
      reason: !isSafe ? moderationStatus?.status : undefined
    };
  } catch (error: any) {
    // console.error('Error moderando imagen existente:', error);
    throw new Error(`Error al moderar imagen: ${error.message}`);
  }
};

