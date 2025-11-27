/**
 * Firebase Cloud Functions para validación de contenido de imágenes
 * 
 * Esta función valida el contenido de imágenes según las políticas de la plataforma
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// Inicializar Firebase Admin
admin.initializeApp();

// Configuración global
functions.setGlobalOptions({ maxInstances: 10 });

/**
 * Función para validar contenido de imágenes
 * 
 * Esta función recibe una URL de imagen y valida su contenido
 * según las políticas de contenido de la plataforma
 * 
 * CORS está configurado automáticamente con functions.https.onCall()
 */
export const validarContenidoImagen = functions.https.onCall(async (request) => {
    try {
        // Validar que se recibió la URL de la imagen
        const { imageUrl } = request.data;

        if (!imageUrl || typeof imageUrl !== 'string') {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Se requiere una URL de imagen válida'
            );
        }

        console.log('Iniciando validación de contenido:', imageUrl);

        // Validar contenido de la imagen
        const result = await validarConGoogleVision(imageUrl);
        return result;

    } catch (error: any) {
        console.error('Error en proceso de validación:', error);

        // Por seguridad, rechazamos la imagen si hay un error
        throw new functions.https.HttpsError(
            'internal',
            'Error al validar el contenido de la imagen',
            error.message
        );
    }
});


/**
 * Validar contenido de imagen según políticas de la plataforma
 */
async function validarConGoogleVision(
    imageUrl: string
): Promise<{ valida: boolean; motivo: string | null; detalles: { nivelRiesgo: string } }> {
    try {
        // Importar módulo de análisis
        const vision = await import('@google-cloud/vision');
        const client = new vision.ImageAnnotatorClient();

        console.log('Analizando contenido de la imagen...');

        // Analizar contenido
        const [result] = await client.safeSearchDetection(imageUrl);
        const detections = result.safeSearchAnnotation;

        console.log('Análisis completado:', JSON.stringify(detections, null, 2));

        // Validar que detections existe
        if (!detections) {
            console.warn('No se pudo completar el análisis de contenido');
            return {
                valida: true,
                motivo: null,
                detalles: { nivelRiesgo: 'bajo' },
            };
        }

        // Evaluar nivel de riesgo
        const isInappropriate = (level: string | null | undefined) => {
            if (!level) return false;
            return level === 'LIKELY' || level === 'VERY_LIKELY';
        };

        // Verificar contenido inapropiado
        if (isInappropriate(detections.adult as string) || isInappropriate(detections.racy as string)) {
            return {
                valida: false,
                motivo: 'La imagen contiene contenido inapropiado',
                detalles: { nivelRiesgo: 'alto' },
            };
        }

        if (isInappropriate(detections.violence as string)) {
            return {
                valida: false,
                motivo: 'La imagen contiene contenido violento',
                detalles: { nivelRiesgo: 'alto' },
            };
        }

        // Imagen válida
        return {
            valida: true,
            motivo: null,
            detalles: { nivelRiesgo: 'bajo' },
        };
    } catch (error: any) {
        console.error('Error en el sistema de validación:', error);

        // Si el sistema de validación no está disponible, permitir por defecto
        // (puedes cambiar esto según tus necesidades)
        console.warn('Sistema de validación no disponible, permitiendo imagen por defecto');
        return {
            valida: true,
            motivo: null,
            detalles: { nivelRiesgo: 'bajo' },
        };
    }
}
