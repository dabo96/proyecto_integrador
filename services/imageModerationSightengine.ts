/**
 * Servicio de moderación de imágenes usando Sightengine
 * 
 * Ventajas:
 * - Muy económico (plan gratuito: 1000 requests/mes)
 * - API simple y rápida
 * - Buena precisión
 * 
 * Requisitos:
 * 1. Crear cuenta en sightengine.com
 * 2. Obtener API key y secret
 * 3. No requiere instalación de paquetes adicionales (solo fetch)
 */

export interface SightengineModerationResult {
  isSafe: boolean;
  nudity: number; // 0-1, donde 1 es completamente desnudo
  weapons: number; // 0-1
  alcohol: number; // 0-1
  drugs: number; // 0-1
  offensive: number; // 0-1
  text: {
    profanity: number;
    personal_attack: number;
  };
  reason?: string;
}

const SIGHTENGINE_API_URL = 'https://api.sightengine.com/1.0/check.json';
const API_USER = process.env.SIGHTENGINE_API_USER || '';
const API_SECRET = process.env.SIGHTENGINE_API_SECRET || '';

/**
 * Modera una imagen desde una URL
 */
export const moderarImagenDesdeURL = async (imageUrl: string): Promise<SightengineModerationResult> => {
  try {
    const params = new URLSearchParams({
      models: 'nudity-2.0,offensive,text-content,wad,celebrities,scam,face-attributes',
      api_user: API_USER,
      api_secret: API_SECRET,
      url: imageUrl
    });

    const response = await fetch(`${SIGHTENGINE_API_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error(data.error?.message || 'Error en la API de Sightengine');
    }

    // Umbrales de seguridad (ajustables)
    const NUDITY_THRESHOLD = 0.5;
    const WEAPONS_THRESHOLD = 0.5;
    const OFFENSIVE_THRESHOLD = 0.5;

    const isSafe = 
      (data.nudity?.raw || 0) < NUDITY_THRESHOLD &&
      (data.weapon || 0) < WEAPONS_THRESHOLD &&
      (data.offensive?.prob || 0) < OFFENSIVE_THRESHOLD;

    const reasons: string[] = [];
    if ((data.nudity?.raw || 0) >= NUDITY_THRESHOLD) {
      reasons.push('contenido inapropiado');
    }
    if ((data.weapon || 0) >= WEAPONS_THRESHOLD) {
      reasons.push('armas');
    }
    if ((data.offensive?.prob || 0) >= OFFENSIVE_THRESHOLD) {
      reasons.push('contenido ofensivo');
    }

    return {
      isSafe,
      nudity: data.nudity?.raw || 0,
      weapons: data.weapon || 0,
      alcohol: data.alcohol || 0,
      drugs: data.drugs || 0,
      offensive: data.offensive?.prob || 0,
      text: {
        profanity: data.text?.profanity || 0,
        personal_attack: data.text?.personal_attack || 0
      },
      reason: reasons.length > 0 ? reasons.join(', ') : undefined
    };
  } catch (error: any) {
    console.error('Error moderando imagen:', error);
    throw new Error(`Error al moderar imagen: ${error.message}`);
  }
};

/**
 * Modera una imagen desde base64
 */
export const moderarImagenDesdeBase64 = async (base64Image: string): Promise<SightengineModerationResult> => {
  try {
    const formData = new FormData();
    formData.append('media', base64Image);
    formData.append('models', 'nudity-2.0,offensive,text-content,wad');
    formData.append('api_user', API_USER);
    formData.append('api_secret', API_SECRET);

    const response = await fetch(SIGHTENGINE_API_URL, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error(data.error?.message || 'Error en la API de Sightengine');
    }

    const NUDITY_THRESHOLD = 0.5;
    const WEAPONS_THRESHOLD = 0.5;
    const OFFENSIVE_THRESHOLD = 0.5;

    const isSafe = 
      (data.nudity?.raw || 0) < NUDITY_THRESHOLD &&
      (data.weapon || 0) < WEAPONS_THRESHOLD &&
      (data.offensive?.prob || 0) < OFFENSIVE_THRESHOLD;

    const reasons: string[] = [];
    if ((data.nudity?.raw || 0) >= NUDITY_THRESHOLD) {
      reasons.push('contenido inapropiado');
    }
    if ((data.weapon || 0) >= WEAPONS_THRESHOLD) {
      reasons.push('armas');
    }
    if ((data.offensive?.prob || 0) >= OFFENSIVE_THRESHOLD) {
      reasons.push('contenido ofensivo');
    }

    return {
      isSafe,
      nudity: data.nudity?.raw || 0,
      weapons: data.weapon || 0,
      alcohol: data.alcohol || 0,
      drugs: data.drugs || 0,
      offensive: data.offensive?.prob || 0,
      text: {
        profanity: data.text?.profanity || 0,
        personal_attack: data.text?.personal_attack || 0
      },
      reason: reasons.length > 0 ? reasons.join(', ') : undefined
    };
  } catch (error: any) {
    console.error('Error moderando imagen:', error);
    throw new Error(`Error al moderar imagen: ${error.message}`);
  }
};

