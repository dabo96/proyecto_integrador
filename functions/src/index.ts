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
        // validarConGoogleVision ya maneja sus propios errores y retorna un resultado
        const result = await validarConGoogleVision(imageUrl);
        return result;

    } catch (error: any) {
        // Si el error es un HttpsError, relanzarlo
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        console.error('Error en proceso de validación:', error);

        // Si hay un error técnico, permitir la imagen por defecto (más permisivo)
        // Esto evita que errores técnicos bloqueen todas las imágenes
        console.warn('⚠️ Error técnico en validación, permitiendo imagen por defecto:', {
            imageUrl: request.data?.imageUrl,
            error: error.message,
            timestamp: new Date().toISOString()
        });

        return {
            valida: true,
            motivo: null,
            detalles: { nivelRiesgo: 'bajo' },
        };
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

        // Analizar contenido con SafeSearch y Labels
        let safeSearchResult, labelResult;
        try {
            [safeSearchResult] = await client.safeSearchDetection(imageUrl);
            [labelResult] = await client.labelDetection(imageUrl);
        } catch (apiError: any) {
            console.error('Error llamando a Google Vision API:', {
                imageUrl,
                error: apiError.message,
                code: apiError.code,
                timestamp: new Date().toISOString()
            });
            // Si hay un error de API, permitir la imagen por defecto
            throw new Error(`Error en API de Google Vision: ${apiError.message}`);
        }

        const detections = safeSearchResult.safeSearchAnnotation;
        const labels = labelResult.labelAnnotations || [];

        // ========================================
        // LOGGING MEJORADO PARA DEBUGGING
        // ========================================
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🔍 ANÁLISIS DE IMAGEN INICIADO');
        console.log('═══════════════════════════════════════════════════════════');

        // Logging de SafeSearch con scores numéricos
        console.log('📊 RESULTADOS SAFESEARCH:', {
            adult: detections?.adult,
            racy: detections?.racy,
            violence: detections?.violence,
            medical: detections?.medical,
            spoof: detections?.spoof
        });

        // LOG PROMINENTE DE TODAS LAS ETIQUETAS DETECTADAS
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🏷️  LABELS DETECTADOS POR GOOGLE VISION');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`Total de labels: ${labels.length}`);
        console.log('-----------------------------------------------------------');

        if (labels && labels.length > 0) {
            labels.forEach((label, index) => {
                console.log(`${index + 1}. ${label.description} | Confianza: ${((label.score || 0) * 100).toFixed(1)}% | Topicality: ${((label.topicality || 0) * 100).toFixed(1)}%`);
            });
        } else {
            console.log('⚠️  NO SE DETECTARON LABELS');
        }

        console.log('═══════════════════════════════════════════════════════════');

        // Advertencia si no hay etiquetas o hay muy pocas
        if (!labels || labels.length === 0) {
            console.warn('⚠️ ADVERTENCIA: No se detectaron etiquetas en la imagen:', {
                imageUrl,
                timestamp: new Date().toISOString()
            });
        } else if (labels.length < 3) {
            console.warn('⚠️ ADVERTENCIA: Pocas etiquetas detectadas (< 3):', {
                imageUrl,
                cantidadEtiquetas: labels.length,
                etiquetas: labels.map(l => `${l.description} (${(l.score || 0).toFixed(2)})`),
                timestamp: new Date().toISOString()
            });
        }

        // Log de todas las etiquetas con sus scores de confianza (formato JSON)
        console.log('🏷️ Etiquetas detectadas (JSON):', {
            total: labels.length,
            etiquetas: labels.map(l => ({
                descripcion: l.description,
                confianza: (l.score || 0).toFixed(2),
                topicality: (l.topicality || 0).toFixed(2)
            })),
            etiquetasTexto: labels.map(l => `${l.description} (${(l.score || 0).toFixed(2)})`).join(', ')
        });

        // Validar que detections existe
        if (!detections) {
            console.warn('🚫 IMAGEN RECHAZADA - No se pudo completar el análisis:', {
                imageUrl,
                motivo: 'No se pudo validar el contenido de la imagen',
                nivelRiesgo: 'alto',
                etiquetas: labels.map(l => l.description).slice(0, 10),
                timestamp: new Date().toISOString()
            });
            return {
                valida: false,
                motivo: 'No se pudo validar el contenido de la imagen',
                detalles: { nivelRiesgo: 'alto' },
            };
        }

        // NUEVA VALIDACIÓN: Rechazar imágenes con muy pocas etiquetas (sospechoso)
        // Si Google Vision no puede detectar etiquetas, puede ser contenido problemático
        if (!labels || labels.length < 3) {
            const motivo = 'La imagen no pudo ser validada correctamente';
            console.warn('🚫 IMAGEN RECHAZADA - Pocas o ninguna etiqueta detectada:', {
                imageUrl,
                motivo,
                nivelRiesgo: 'alto',
                cantidadEtiquetas: labels?.length || 0,
                etiquetas: labels?.map(l => l.description) || [],
                detecciones: {
                    adult: detections.adult,
                    racy: detections.racy,
                    violence: detections.violence
                },
                timestamp: new Date().toISOString()
            });
            return {
                valida: false,
                motivo,
                detalles: { nivelRiesgo: 'alto' },
            };
        }

        // Evaluar nivel de riesgo - más estricto para contenido sugerente
        const isInappropriate = (level: string | null | undefined) => {
            if (!level) return false;
            return level === 'POSSIBLE' || level === 'LIKELY' || level === 'VERY_LIKELY';
        };

        // Para contenido "racy" (sugerente), ser MÁS ESTRICTO
        // Rechazar si es UNLIKELY o superior (no solo POSSIBLE)
        // Esto es crítico para rechazar fotos con poca ropa (bikini, etc.)
        const isRacyStrict = (level: string | null | undefined) => {
            if (!level) return false;
            // Rechazar si es UNLIKELY o superior (MÁS ESTRICTO)
            if (level === 'UNLIKELY' || level === 'POSSIBLE' || level === 'LIKELY' || level === 'VERY_LIKELY') {
                return true;
            }
            return false;
        };

        // Rechazar también si es UNLIKELY pero hay otros indicadores
        const isRacyUnlikely = (level: string | null | undefined) => {
            if (!level) return false;
            return level === 'UNLIKELY';
        };

        // Verificar contenido para adultos
        if (isInappropriate(detections.adult as string)) {
            const motivo = 'La imagen contiene contenido para adultos';
            console.warn('🚫 IMAGEN RECHAZADA - Contenido para adultos:', {
                imageUrl,
                motivo,
                nivelRiesgo: 'alto',
                detecciones: {
                    adult: detections.adult,
                    racy: detections.racy,
                    violence: detections.violence
                },
                etiquetas: labels.map(l => l.description).slice(0, 10),
                timestamp: new Date().toISOString()
            });
            return {
                valida: false,
                motivo,
                detalles: { nivelRiesgo: 'alto' },
            };
        }

        // Verificar contenido sugerente (más estricto)
        if (isRacyStrict(detections.racy as string)) {
            const motivo = 'La imagen contiene contenido sugerente o inapropiado';
            console.warn('🚫 IMAGEN RECHAZADA - Contenido sugerente:', {
                imageUrl,
                motivo,
                nivelRiesgo: 'alto',
                detecciones: {
                    adult: detections.adult,
                    racy: detections.racy,
                    violence: detections.violence
                },
                etiquetas: labels.map(l => l.description).slice(0, 10),
                timestamp: new Date().toISOString()
            });
            return {
                valida: false,
                motivo,
                detalles: { nivelRiesgo: 'alto' },
            };
        }

        // No rechazar automáticamente si es UNLIKELY - solo con otros indicadores

        // Lista completa de etiquetas que indican contenido inapropiado
        // Basado en etiquetas comunes detectadas por sistemas de visión por computadora

        // Etiquetas de trajes de baño y ropa reveladora (rechazo automático)
        // Incluye versiones en inglés y español
        const strictRejectionLabels = [
            // Trajes de baño (inglés)
            'bikini', 'swimsuit', 'swimwear', 'bathing suit', 'bikini bottom',
            'bikini top', 'two-piece', 'monokini', 'beachwear', 'swim briefs',
            'swim trunks', 'swimming costume', 'bathing costume', 'tankini',
            'one-piece swimsuit', 'swimming trunks',
            // Trajes de baño (español)
            'bikini', 'traje de baño', 'bañador', 'malla', 'bikini inferior',
            'bikini superior', 'dos piezas', 'monokini', 'ropa de playa', 'traje de baño',
            'malla de baño', 'bañador de hombre', 'bañador de mujer', 'tankini',
            'traje de baño de una pieza', 'pantalón de baño',
            // Ropa interior y lencería (inglés)
            'underwear', 'lingerie', 'bra', 'panties', 'thong', 'g-string',
            'briefs', 'boxers', 'intimate apparel', 'lingerie set', 'underclothes',
            'undergarment', 'underclothing', 'intimate wear', 'brassiere',
            'sports bra', 'push-up bra', 'strapless bra',
            // Ropa interior y lencería (español)
            'ropa interior', 'lencería', 'sostén', 'brasier', 'bra', 'panties',
            'bragas', 'calzones', 'tanga', 'hilo dental', 'boxer', 'boxers',
            'calzoncillos', 'prenda íntima', 'prenda interior', 'lencería íntima',
            'conjunto de lencería', 'ropa íntima', 'sujetador', 'sujetador deportivo',
            // Poca ropa / revelador (inglés)
            'revealing', 'scantily clad', 'scantily dressed', 'low cut', 'cleavage',
            'short skirt', 'miniskirt', 'crop top', 'tube top', 'halter top',
            'see-through', 'transparent', 'tight clothing', 'form-fitting',
            'sheer', 'cutout', 'backless', 'strapless', 'off-shoulder',
            'plunging neckline', 'deep v-neck', 'low-cut top', 'midriff',
            // Poca ropa / revelador (español)
            'revelador', 'reveladora', 'poca ropa', 'ropa ajustada', 'ropa ceñida',
            'escote', 'escote pronunciado', 'minifalda', 'falda corta', 'top corto',
            'transparente', 'ropa transparente', 'ropa ajustada al cuerpo',
            'transparencia', 'recorte', 'sin espalda', 'sin tirantes', 'hombros descubiertos',
            'escote profundo', 'escote en v', 'top de escote bajo', 'abdomen descubierto',
            // Partes del cuerpo expuestas (inglés)
            'abdomen', 'midriff', 'navel', 'belly button', 'thigh', 'thighs',
            'leg', 'legs', 'bare legs', 'shoulder', 'shoulders', 'bare shoulders',
            'back', 'bare back', 'chest', 'bust', 'bosom', 'decolletage',
            // Partes del cuerpo expuestas (español)
            'abdomen', 'vientre', 'ombligo', 'muslo', 'muslos', 'pierna', 'piernas',
            'piernas descubiertas', 'hombro', 'hombros', 'hombros descubiertos',
            'espalda', 'espalda descubierta', 'pecho', 'busto', 'escote',
            // Poses sugerentes (inglés)
            'pose', 'posing', 'seductive', 'seductive pose', 'provocative pose',
            'suggestive pose', 'lying down', 'reclining', 'leaning', 'bending over',
            // Poses sugerentes (español)
            'pose', 'posando', 'seductora', 'pose seductora', 'pose provocativa',
            'pose sugerente', 'acostada', 'reclinada', 'inclinada', 'agachada',
            // Desnudez (inglés)
            'nude', 'naked', 'topless', 'bottomless', 'nudity', 'nudism',
            'semi-nude', 'semi-naked', 'partially nude', 'partially naked',
            'bare', 'bare skin', 'exposed', 'unclothed', 'undressed',
            // Desnudez (español)
            'desnudo', 'desnuda', 'desnudos', 'desnudez', 'nudismo', 'nudista',
            'sin ropa', 'sin camisa', 'topless', 'semidesnudo', 'semidesnuda',
            'parcialmente desnudo', 'parcialmente desnuda', 'desnudo parcial',
            'piel desnuda', 'expuesto', 'expuesta', 'sin vestir', 'desvestido',
            'desvestida', 'desnudez parcial',
            // Contenido explícito (inglés)
            'explicit', 'pornographic', 'porn', 'adult content', 'nsfw',
            'erotic', 'erotica', 'sensual', 'provocative', 'sexual content',
            'sexually suggestive', 'sexual act', 'sexual activity', 'sexuality',
            'pornography', 'adult material', 'mature content',
            // Contenido explícito (español)
            'explícito', 'pornográfico', 'pornografía', 'porno', 'contenido para adultos',
            'contenido adulto', 'nsfw', 'erótico', 'erótica', 'sensual', 'provocativo',
            'provocativa', 'contenido sexual', 'sugerente sexual', 'acto sexual',
            'actividad sexual', 'sexualidad', 'material para adultos', 'contenido maduro',
            'contenido explícito', 'material pornográfico', 'contenido erótico'
        ];

        // Etiquetas de contexto que combinadas con otras pueden indicar contenido inapropiado
        // Incluye versiones en inglés y español
        const contextLabels = [
            // Contexto (inglés)
            'beach', 'pool', 'swimming pool', 'spa', 'sauna', 'bedroom',
            'bed', 'boudoir', 'fashion photography', 'glamour', 'pin-up',
            'model', 'fitness model', 'bodybuilder', 'bodybuilding',
            // Contexto (español)
            'playa', 'piscina', 'alberca', 'spa', 'sauna', 'dormitorio',
            'habitación', 'cama', 'boudoir', 'fotografía de moda', 'fotografía de glamour',
            'glamour', 'pin-up', 'modelo', 'modelo de fitness', 'fisicoculturista',
            'fisicoculturismo', 'culturista', 'culturismo', 'gimnasio', 'gym',
            'fotografía de desnudo', 'fotografía artística', 'sesión fotográfica'
        ];

        const detectedLabels = labels.map(l => l.description?.toLowerCase() || '').join(' ');
        const allDetectedLabels = labels.map(l => l.description?.toLowerCase() || '');

        // Verificar si hay etiquetas de rechazo estricto
        // Usar coincidencia más flexible pero precisa
        const hasStrictLabel = strictRejectionLabels.some(label => {
            const labelLower = label.toLowerCase().trim();
            return allDetectedLabels.some(detected => {
                const detectedLower = detected.toLowerCase().trim();
                // Coincidencia exacta
                if (detectedLower === labelLower) return true;
                // Coincidencia de palabra completa
                const words = detectedLower.split(/\s+/);
                if (words.some(word => word === labelLower || labelLower === word)) return true;
                // Coincidencia parcial para palabras compuestas (ej: "bikini" en "bikini bottom")
                if (detectedLower.includes(labelLower) && labelLower.length >= 4) return true;
                if (labelLower.includes(detectedLower) && detectedLower.length >= 4) return true;
                return false;
            });
        });

        // Si hay etiquetas estrictas, rechazar inmediatamente
        if (hasStrictLabel) {
            const motivo = 'La imagen contiene contenido inapropiado';
            const matchedLabels = allDetectedLabels.filter(detected =>
                strictRejectionLabels.some(label =>
                    detected.includes(label.toLowerCase()) || label.toLowerCase().includes(detected)
                )
            );
            console.warn('🚫 IMAGEN RECHAZADA - Etiquetas inapropiadas detectadas:', {
                imageUrl,
                motivo,
                nivelRiesgo: 'alto',
                etiquetasDetectadas: labels.map(l => l.description).slice(0, 20),
                etiquetasCoincidentes: matchedLabels,
                detecciones: {
                    adult: detections.adult,
                    racy: detections.racy,
                    violence: detections.violence
                },
                timestamp: new Date().toISOString()
            });
            return {
                valida: false,
                motivo,
                detalles: { nivelRiesgo: 'alto' },
            };
        }

        // Obtener niveles de detección
        const racyLevel = detections.racy as string;
        const adultLevel = detections.adult as string;

        // Verificar combinaciones de contexto con niveles racy/adult
        const hasContextLabel = contextLabels.some(label =>
            detectedLabels.includes(label.toLowerCase())
        );

        // Validación combinada: Si hay contexto Y el contenido es sugerente, rechazar
        // Rechazamos si es UNLIKELY o superior cuando hay contexto (más estricto)
        if (hasContextLabel) {
            const isRacySuggestive = racyLevel && racyLevel !== 'VERY_UNLIKELY';
            const isAdultSuggestive = adultLevel && adultLevel !== 'VERY_UNLIKELY';

            if (isRacySuggestive || isAdultSuggestive) {
                const motivo = 'La imagen contiene contenido inapropiado';
                const matchedContextLabels = contextLabels.filter(label =>
                    detectedLabels.includes(label.toLowerCase())
                );
                console.warn('🚫 IMAGEN RECHAZADA - Contexto inapropiado con contenido sugerente:', {
                    imageUrl,
                    motivo,
                    nivelRiesgo: 'alto',
                    contextoDetectado: matchedContextLabels,
                    etiquetas: labels.map(l => l.description).slice(0, 15),
                    detecciones: {
                        adult: detections.adult,
                        racy: detections.racy,
                        violence: detections.violence
                    },
                    timestamp: new Date().toISOString()
                });
                return {
                    valida: false,
                    motivo,
                    detalles: { nivelRiesgo: 'alto' },
                };
            }
        }

        // Validación adicional: Si racy/adult es UNLIKELY pero hay múltiples indicadores, rechazar
        const isAdultUnlikely = adultLevel === 'UNLIKELY';
        const hasMultipleIndicators =
            (racyLevel && racyLevel !== 'VERY_UNLIKELY') ||
            (adultLevel && adultLevel !== 'VERY_UNLIKELY') ||
            hasContextLabel ||
            hasStrictLabel;

        // Si hay múltiples indicadores aunque sean bajos (UNLIKELY), rechazar
        if (hasMultipleIndicators && (isRacyUnlikely(racyLevel) || isAdultUnlikely)) {
            const motivo = 'La imagen contiene contenido sugerente o inapropiado';
            console.warn('🚫 IMAGEN RECHAZADA - Múltiples indicadores de contenido inapropiado:', {
                imageUrl,
                motivo,
                nivelRiesgo: 'alto',
                detecciones: {
                    adult: detections.adult,
                    racy: detections.racy,
                    violence: detections.violence
                },
                tieneContexto: hasContextLabel,
                etiquetas: labels.map(l => l.description).slice(0, 15),
                timestamp: new Date().toISOString()
            });
            return {
                valida: false,
                motivo,
                detalles: { nivelRiesgo: 'alto' },
            };
        }

        // Verificar contenido violento
        if (isInappropriate(detections.violence as string)) {
            const motivo = 'La imagen contiene contenido violento';
            console.warn('🚫 IMAGEN RECHAZADA - Contenido violento:', {
                imageUrl,
                motivo,
                nivelRiesgo: 'alto',
                detecciones: {
                    adult: detections.adult,
                    racy: detections.racy,
                    violence: detections.violence
                },
                etiquetas: labels.map(l => l.description).slice(0, 10),
                timestamp: new Date().toISOString()
            });
            return {
                valida: false,
                motivo,
                detalles: { nivelRiesgo: 'alto' },
            };
        }

        // Imagen válida
        console.log('✅ IMAGEN APROBADA:', {
            imageUrl,
            detecciones: {
                adult: detections.adult,
                racy: detections.racy,
                violence: detections.violence,
                medical: detections.medical,
                spoof: detections.spoof
            },
            etiquetasDetectadas: labels.map(l => l.description).slice(0, 10),
            timestamp: new Date().toISOString()
        });
        return {
            valida: true,
            motivo: null,
            detalles: { nivelRiesgo: 'bajo' },
        };
    } catch (error: any) {
        console.error('❌ ERROR EN VALIDACIÓN DE IMAGEN:', {
            imageUrl,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Si hay un error técnico (no de contenido), permitir la imagen por defecto
        // Esto evita que errores de API o configuración bloqueen todas las imágenes
        // Solo rechazamos si es un error de autenticación o configuración crítica
        const isCriticalError = error.message?.includes('authentication') ||
            error.message?.includes('permission') ||
            error.message?.includes('credentials') ||
            error.message?.includes('quota');

        if (isCriticalError) {
            console.warn('🚫 IMAGEN RECHAZADA - Error crítico en validación:', {
                imageUrl,
                motivo: 'Error al validar el contenido de la imagen',
                nivelRiesgo: 'alto',
                errorType: 'critical',
                timestamp: new Date().toISOString()
            });
            return {
                valida: false,
                motivo: 'Error al validar el contenido de la imagen',
                detalles: { nivelRiesgo: 'alto' },
            };
        }

        // Para errores técnicos no críticos, permitir la imagen
        console.warn('⚠️ Error técnico no crítico, permitiendo imagen:', {
            imageUrl,
            error: error.message,
            timestamp: new Date().toISOString()
        });
        return {
            valida: true,
            motivo: null,
            detalles: { nivelRiesgo: 'bajo' },
        };
    }
}
