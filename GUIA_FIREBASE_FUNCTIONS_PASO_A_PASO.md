# Guía Paso a Paso: Configurar Firebase Functions para Moderación

Esta guía te llevará paso a paso para configurar Firebase Functions y activar la moderación de imágenes.

## 📋 Requisitos Previos

- Tener un proyecto Firebase creado
- Tener Node.js instalado (versión 18 o superior)
- Tener npm o yarn instalado

## 🚀 Paso 1: Instalar Firebase CLI

### Windows (Git Bash o PowerShell):
```bash
npm install -g firebase-tools
```

### Verificar instalación:
```bash
firebase --version
```

Deberías ver algo como: `13.0.0` o similar.

## 🔐 Paso 2: Iniciar Sesión en Firebase

```bash
firebase login
```

Esto abrirá tu navegador para autenticarte. Acepta los permisos.

## 📁 Paso 3: Inicializar Firebase Functions

### 3.1 Navegar a la raíz de tu proyecto

Asegúrate de estar en la carpeta raíz de tu proyecto (donde está `package.json`).

### 3.2 Inicializar Functions

```bash
firebase init functions
```

Te hará varias preguntas. Responde así:

1. **¿Qué lenguaje quieres usar?**
   - Selecciona: **TypeScript** (presiona la flecha y Enter)

2. **¿Quieres usar ESLint?**
   - Responde: **Yes** (Y)

3. **¿Quieres instalar dependencias ahora?**
   - Responde: **Yes** (Y)

4. **¿Qué proyecto Firebase quieres usar?**
   - Selecciona tu proyecto (el que tiene `apolo-marketplace`)

Esto creará la carpeta `functions/` con la estructura básica.

## 📦 Paso 4: Reemplazar Archivos de Functions

Ya tienes los archivos creados en `functions/`. Ahora necesitas:

### 4.1 Verificar que los archivos estén en su lugar

Asegúrate de que existan estos archivos:
```
functions/
├── src/
│   └── index.ts          ✅ Ya existe
├── package.json          ✅ Ya existe
├── tsconfig.json         ✅ Ya existe
└── .eslintrc.js         ✅ Ya existe
```

### 4.2 Instalar dependencias

```bash
cd functions
npm install
```

Esto instalará:
- `firebase-admin`
- `firebase-functions`
- `axios`
- Y otras dependencias necesarias

## 🔑 Paso 5: Configurar Credenciales de Sightengine

### 5.1 Crear cuenta en Sightengine

1. Ve a [https://sightengine.com/](https://sightengine.com/)
2. Haz clic en "Sign Up" (es gratis)
3. Verifica tu email
4. Inicia sesión

### 5.2 Obtener credenciales

1. Una vez dentro, ve a "API Credentials" o "Dashboard"
2. Verás:
   - **API User**: algo como `123456789`
   - **API Secret**: una cadena larga

### 5.3 Configurar en Firebase

Vuelve a la terminal y ejecuta (reemplaza con tus credenciales reales):

```bash
firebase functions:config:set sightengine.user="TU_API_USER" sightengine.secret="TU_API_SECRET"
```

**Ejemplo:**
```bash
firebase functions:config:set sightengine.user="123456789" sightengine.secret="abc123xyz456"
```

### 5.4 Verificar configuración

```bash
firebase functions:config:get
```

Deberías ver:
```
sightengine:
  user: "123456789"
  secret: "abc123xyz456"
```

## 🏗️ Paso 6: Compilar TypeScript

```bash
cd functions
npm run build
```

Esto compilará el código TypeScript a JavaScript en la carpeta `functions/lib/`.

Si hay errores, revísalos y corrígelos.

## 🧪 Paso 7: Probar Localmente (Opcional)

### 7.1 Iniciar emulador

```bash
cd functions
npm run serve
```

Esto iniciará el emulador en `http://localhost:5001`

### 7.2 Configurar app para usar emulador (solo desarrollo)

En `services/imageModerationClient.ts`, puedes agregar temporalmente:

```typescript
import { connectFunctionsEmulator } from 'firebase/functions';

if (__DEV__) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

## 📤 Paso 8: Desplegar a Producción

### 8.1 Asegúrate de estar en la carpeta functions

```bash
cd functions
```

### 8.2 Compilar

```bash
npm run build
```

### 8.3 Desplegar

```bash
npm run deploy
```

O desde la raíz del proyecto:

```bash
firebase deploy --only functions
```

### 8.4 Verificar despliegue

Deberías ver algo como:

```
✔  functions[validarContenidoImagen(us-central1)] Successful create operation.
Function URL: https://us-central1-apolo-marketplace.cloudfunctions.net/validarContenidoImagen
```

## ✅ Paso 9: Verificar que Funciona

### 9.1 Ver logs

```bash
firebase functions:log
```

### 9.2 Probar en tu app

1. Abre tu app
2. Intenta crear un post con una imagen
3. Si la imagen es inapropiada, debería rechazarse
4. Revisa los logs para ver si la función se está llamando

## 🔧 Solución de Problemas

### Error: "functions directory not found"

**Solución:** Asegúrate de estar en la raíz del proyecto y que la carpeta `functions/` existe.

### Error: "Permission denied" al desplegar

**Solución:** 
```bash
firebase login --reauth
```

### Error: "Config not found"

**Solución:** Verifica que configuraste las credenciales:
```bash
firebase functions:config:get
```

Si no aparecen, configúralas de nuevo.

### Error: "Module not found" al compilar

**Solución:**
```bash
cd functions
rm -rf node_modules
npm install
npm run build
```

### La función no se llama desde la app

**Verifica:**
1. Que desplegaste la función correctamente
2. Que el nombre de la función coincide en `functions/src/index.ts` y `services/imageModerationClient.ts`
3. Que tienes conexión a internet
4. Revisa los logs: `firebase functions:log`

## 📊 Monitoreo

### Ver logs en tiempo real

```bash
firebase functions:log --only validarContenidoImagen
```

### Ver en la consola web

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a "Functions" en el menú lateral
4. Haz clic en "validarContenidoImagen"
5. Ve a la pestaña "Logs"

## 💰 Costos

### Sightengine (Plan Gratuito)
- **1,000 requests/mes** gratis
- Después: $0.001 por imagen

### Firebase Functions
- **2 millones de invocaciones/mes** gratis
- Después: $0.40 por millón

**Total estimado para empezar:** $0/mes (dentro del plan gratuito)

## 🎯 Checklist Final

- [ ] Firebase CLI instalado
- [ ] Iniciado sesión en Firebase
- [ ] Functions inicializado
- [ ] Dependencias instaladas en `functions/`
- [ ] Credenciales de Sightengine configuradas
- [ ] Código compilado sin errores
- [ ] Función desplegada exitosamente
- [ ] Probado en la app
- [ ] Logs funcionando

## 🎉 ¡Listo!

Ahora tu app tiene moderación de imágenes completamente oculta. El código cliente solo ve "validación de contenido" sin mencionar IA ni servicios externos.

## 📝 Notas Adicionales

### Cambiar umbrales de moderación

Edita `functions/src/index.ts`:

```typescript
// Umbrales más estrictos (rechaza más contenido)
const NUDITY_THRESHOLD = 0.3;  // Era 0.5

// Umbrales más permisivos (rechaza menos contenido)
const NUDITY_THRESHOLD = 0.7;  // Era 0.5
```

Luego recompila y despliega:
```bash
cd functions
npm run build
npm run deploy
```

### Actualizar credenciales

Si necesitas cambiar las credenciales:

```bash
firebase functions:config:set sightengine.user="NUEVO_USER" sightengine.secret="NUEVO_SECRET"
npm run deploy
```

### Ver todas las funciones desplegadas

```bash
firebase functions:list
```

