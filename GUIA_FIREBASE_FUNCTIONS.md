# Guía Completa: Moderación Ocultada con Firebase Functions

Esta guía te muestra cómo implementar moderación de imágenes **sin que el código del cliente revele que usas IA**.

## 🎯 Objetivo

Ocultar completamente que estás usando servicios de IA para moderación, ideal para proyectos universitarios donde quieres mantener la implementación privada.

## 📁 Estructura Creada

```
proyecto/
├── functions/                    # Firebase Functions (servidor)
│   ├── src/
│   │   └── index.ts            # Función de validación (oculta la IA)
│   ├── package.json
│   └── tsconfig.json
├── services/
│   └── imageModerationClient.ts # Cliente que llama a la función
└── app/
    └── tabs/
        └── newPost.tsx         # Ejemplo de uso
```

## 🚀 Paso 1: Configurar Firebase Functions

### 1.1 Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### 1.2 Iniciar sesión

```bash
firebase login
```

### 1.3 Inicializar Functions (si no existe)

```bash
firebase init functions
```

Cuando te pregunte:
- ✅ TypeScript
- ✅ ESLint
- ✅ Instalar dependencias ahora

### 1.4 Instalar dependencias de Functions

```bash
cd functions
npm install
```

## 🔐 Paso 2: Configurar Credenciales

### Opción A: Sightengine (Recomendada - Gratis)

1. Crear cuenta en [sightengine.com](https://sightengine.com/)
2. Ir a "API Credentials"
3. Copiar API User y API Secret
4. Configurar en Firebase:

```bash
firebase functions:config:set sightengine.user="tu_api_user" sightengine.secret="tu_api_secret"
```

### Opción B: Google Cloud Vision

Si prefieres usar Google Cloud Vision (ya que usas Firebase):

1. Habilitar Cloud Vision API en [Google Cloud Console](https://console.cloud.google.com/)
2. Crear Service Account
3. Descargar JSON de credenciales
4. Subir a Firebase Functions (o usar variables de entorno)

## 📦 Paso 3: Compilar y Desplegar

```bash
cd functions
npm run build
npm run deploy
```

Esto desplegará la función `validarContenidoImagen` a Firebase.

## 💻 Paso 4: Integrar en tu App

### Ejemplo en `app/tabs/newPost.tsx`

```typescript
import { validarYSubirImagen } from '@/services/imageModerationClient';
import { Alert } from 'react-native';

const handlePublicar = async () => {
  // ... código existente ...
  
  let imagenUrl: string | null = null;
  
  if (imagen) {
    // Validar y subir (la validación es transparente)
    const result = await validarYSubirImagen(
      subirImagenAFirebase,  // Tu función existente
      imagen
    );
    
    if (!result.success) {
      Alert.alert(
        'Contenido no permitido',
        result.error || 'La imagen no cumple con nuestras políticas de contenido.'
      );
      setImagen(null); // Limpiar imagen
      return;
    }
    
    imagenUrl = result.url || null;
  }
  
  // Continuar con la publicación normalmente...
  // El código no menciona "IA" ni servicios externos
};
```

### Ejemplo en `app/tabs/profile.tsx` (foto de perfil)

```typescript
import { validarYSubirImagen } from '@/services/imageModerationClient';

const pickImage = async (source: 'camera' | 'library') => {
  // ... código existente para seleccionar imagen ...
  
  if (!result.canceled) {
    setUploadingImage(true);
    const imageUri = result.assets[0].uri;
    
    try {
      // Validar y subir
      const result = await validarYSubirImagen(
        (uri) => subirImagenPerfil(currentUserID, uri),
        imageUri
      );
      
      if (!result.success) {
        Alert.alert('Imagen rechazada', result.error);
        setUploadingImage(false);
        return;
      }
      
      // Actualizar perfil con la URL validada
      await actualizarFotoPerfil(currentUserID, result.url!);
      Alert.alert('Éxito', 'Foto de perfil actualizada correctamente.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploadingImage(false);
    }
  }
};
```

## 🔍 Cómo Funciona

1. **Cliente** sube imagen a Firebase Storage
2. **Cliente** llama a `validarContenidoImagen(imageUrl)`
3. **Firebase Function** (servidor) recibe la llamada
4. **Firebase Function** llama a Sightengine/Google Vision (oculto)
5. **Firebase Function** devuelve solo: `{ valida: true/false, motivo: "..." }`
6. **Cliente** nunca sabe qué servicio se usó

## 🎓 Para tu Proyecto Universitario

### Lo que el código muestra:
- ✅ "Validación de contenido"
- ✅ "Políticas de contenido"
- ✅ Función genérica de Firebase

### Lo que NO muestra:
- ❌ "IA" o "Inteligencia Artificial"
- ❌ "Sightengine" o "Google Vision"
- ❌ APIs externas
- ❌ Credenciales

### En tu documentación puedes decir:
> "El sistema valida automáticamente el contenido de las imágenes antes de publicarlas, asegurando que cumplan con las políticas de la plataforma."

## 🧪 Probar Localmente

```bash
cd functions
npm run serve
```

Esto inicia el emulador en `http://localhost:5001`

Luego en tu app, apunta a los emuladores:

```typescript
// En services/firebase.tsx o donde configures Firebase
import { connectFunctionsEmulator } from 'firebase/functions';

if (__DEV__) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

## 📊 Monitoreo

Ver logs de las funciones:

```bash
firebase functions:log
```

O en la consola de Firebase:
https://console.firebase.google.com/project/tu-proyecto/functions

## 🔧 Personalización

### Cambiar umbrales de moderación

Edita `functions/src/index.ts`:

```typescript
// Umbrales más estrictos
const NUDITY_THRESHOLD = 0.3;  // Era 0.5
const WEAPONS_THRESHOLD = 0.3;
const OFFENSIVE_THRESHOLD = 0.3;
```

### Cambiar el servicio de IA

Simplemente edita `functions/src/index.ts` y cambia la función que se llama. El cliente no necesita cambios.

### Agregar más validaciones

Puedes agregar validaciones adicionales en la función sin que el cliente lo sepa:

```typescript
// En functions/src/index.ts
export const validarContenidoImagen = functions.https.onCall(async (data, context) => {
  // ... validación de IA ...
  
  // Validación adicional: tamaño de imagen
  const imageSize = await obtenerTamañoImagen(imageUrl);
  if (imageSize > 10 * 1024 * 1024) { // 10MB
    return { valida: false, motivo: 'Imagen demasiado grande' };
  }
  
  // ... más validaciones ...
});
```

## ✅ Checklist de Implementación

- [ ] Instalar Firebase CLI
- [ ] Inicializar Firebase Functions
- [ ] Configurar credenciales (Sightengine o Google Vision)
- [ ] Compilar y desplegar functions
- [ ] Integrar `validarYSubirImagen` en `newPost.tsx`
- [ ] Integrar en `newCommunity.tsx`
- [ ] Integrar en `profile.tsx` (foto de perfil)
- [ ] Probar con diferentes tipos de imágenes
- [ ] Verificar que no aparezcan referencias a IA en el código cliente

## 🎉 Resultado Final

Tu código cliente se ve así:

```typescript
// Limpio, sin referencias a IA
const result = await validarYSubirImagen(subirImagen, imagen);
if (!result.success) {
  Alert.alert('Contenido no permitido', result.error);
  return;
}
```

Y la función en el servidor maneja toda la complejidad de forma oculta.

