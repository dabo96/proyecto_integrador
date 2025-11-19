# Guía de Moderación de Imágenes

Este proyecto incluye tres opciones para moderar imágenes antes de que se publiquen en la aplicación.

## Opciones Disponibles

### 1. Google Cloud Vision API (Recomendada si ya usas Firebase)
**Archivo:** `services/imageModeration.ts`

**Ventajas:**
- Integración natural con Firebase/Google Cloud
- Alta precisión
- Detecta: contenido adulto, violencia, contenido sugerente, contenido médico, spoofing

**Desventajas:**
- Requiere configuración de credenciales
- Puede ser más costoso a gran escala

**Configuración:**
1. Habilitar Cloud Vision API en [Google Cloud Console](https://console.cloud.google.com/)
2. Crear una Service Account y descargar el JSON de credenciales
3. Instalar: `npm install @google-cloud/vision`
4. Configurar variable de entorno: `GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/archivo.json`

**Costo:** ~$1.50 por 1,000 imágenes

---

### 2. Cloudinary (Más fácil de integrar)
**Archivo:** `services/imageModerationCloudinary.ts`

**Ventajas:**
- Muy fácil de usar
- Moderación automática al subir
- Incluye CDN y optimización de imágenes
- Plan gratuito generoso (25GB almacenamiento, 25GB ancho de banda)

**Desventajas:**
- Requiere migrar de Firebase Storage a Cloudinary (o usar ambos)

**Configuración:**
1. Crear cuenta en [cloudinary.com](https://cloudinary.com/)
2. Instalar: `npm install cloudinary`
3. Configurar variables de entorno:
   ```
   CLOUDINARY_CLOUD_NAME=tu_cloud_name
   CLOUDINARY_API_KEY=tu_api_key
   CLOUDINARY_API_SECRET=tu_api_secret
   ```

**Costo:** Gratis hasta 25GB, luego planes desde $89/mes

---

### 3. Sightengine (Más económica)
**Archivo:** `services/imageModerationSightengine.ts`

**Ventajas:**
- Muy económica (plan gratuito: 1,000 requests/mes)
- API simple y rápida
- No requiere migración de Storage
- Buena precisión

**Desventajas:**
- Plan gratuito limitado
- Menos características que las otras opciones

**Configuración:**
1. Crear cuenta en [sightengine.com](https://sightengine.com/)
2. Obtener API User y API Secret
3. Configurar variables de entorno:
   ```
   SIGHTENGINE_API_USER=tu_api_user
   SIGHTENGINE_API_SECRET=tu_api_secret
   ```

**Costo:** Gratis 1,000/mes, luego $0.001 por imagen

---

## Cómo Integrar

### Opción A: Moderar después de subir (Recomendada)

Modifica tus funciones de subida existentes:

```typescript
// En app/tabs/newPost.tsx
import { validarYSubirImagen } from '@/services/imageModerationHelper';

const handlePublicar = async () => {
  // ... código existente ...
  
  let imagenUrl: string | null = null;
  if (imagen) {
    const result = await validarYSubirImagen(imagen, subirImagenAFirebase);
    if (!result.success) {
      // La imagen fue rechazada, no continuar con la publicación
      return;
    }
    imagenUrl = result.url || null;
  }
  
  // Continuar con la publicación...
};
```

### Opción B: Moderar antes de subir (Más eficiente)

Modera la imagen local antes de subirla a Firebase:

```typescript
import { moderarImagenDesdeBase64 } from '@/services/imageModerationSightengine';
import * as FileSystem from 'expo-file-system';

const handlePublicar = async () => {
  if (imagen) {
    // Convertir a base64
    const base64 = await FileSystem.readAsStringAsync(imagen, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Moderar
    const moderation = await moderarImagenDesdeBase64(base64);
    
    if (!moderation.isSafe) {
      Alert.alert('Imagen rechazada', `Razón: ${moderation.reason}`);
      return;
    }
    
    // Si es segura, subir normalmente
    imagenUrl = await subirImagenAFirebase(imagen);
  }
};
```

---

## Recomendación Final

Para tu caso, recomiendo **Sightengine** porque:
1. ✅ No requiere cambiar tu infraestructura actual (Firebase Storage)
2. ✅ Muy económica para empezar
3. ✅ Fácil de integrar
4. ✅ Suficiente para una app universitaria

Puedes empezar con el plan gratuito y escalar cuando sea necesario.

---

## Próximos Pasos

1. Elige el servicio que prefieras
2. Configura las credenciales necesarias
3. Integra en `app/tabs/newPost.tsx`, `app/tabs/newCommunity.tsx`, y `app/tabs/profile.tsx`
4. Prueba con diferentes tipos de imágenes
5. Ajusta los umbrales según tus necesidades

---

## Notas Importantes

- ⚠️ La moderación automática no es 100% precisa, siempre revisa casos dudosos manualmente
- ⚠️ Considera implementar un sistema de reportes para contenido que se escape
- ⚠️ Guarda logs de imágenes rechazadas para mejorar el sistema
- ⚠️ Informa a los usuarios sobre las políticas de contenido

