# Firebase Functions - Validación de Contenido

Esta carpeta contiene las Firebase Functions que manejan la validación de contenido de imágenes de forma completamente oculta para el cliente.

## 🔒 Privacidad

- ✅ El cliente **NO sabe** qué servicio de IA se usa
- ✅ Las credenciales API están **solo en el servidor**
- ✅ El cliente solo llama a una función genérica de "validación de contenido"
- ✅ Puedes cambiar el servicio de IA sin modificar el código del cliente

## 📋 Requisitos Previos

1. Instalar Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Iniciar sesión en Firebase:
   ```bash
   firebase login
   ```

3. Inicializar Firebase en el proyecto (si no lo has hecho):
   ```bash
   firebase init functions
   ```

## 🚀 Configuración

### 1. Instalar dependencias

```bash
cd functions
npm install
```

### 2. Configurar credenciales de Sightengine

```bash
firebase functions:config:set sightengine.user="TU_API_USER" sightengine.secret="TU_API_SECRET"
```

**Obtener credenciales:**
1. Ve a [sightengine.com](https://sightengine.com/)
2. Crea una cuenta gratuita
3. Ve a "API Credentials"
4. Copia el API User y API Secret

### 3. Compilar TypeScript

```bash
npm run build
```

## 🧪 Probar Localmente

```bash
npm run serve
```

Esto iniciará el emulador de Firebase Functions en `http://localhost:5001`

## 📤 Desplegar a Producción

```bash
npm run deploy
```

Esto desplegará la función `validarContenidoImagen` a Firebase.

## 🔄 Cambiar el Servicio de IA

Si quieres cambiar de Sightengine a Google Cloud Vision u otro servicio:

1. Edita `functions/src/index.ts`
2. Cambia la función `moderarConSightengine` por la que prefieras
3. O descomenta `moderarConGoogleVision` y configura las credenciales
4. Recompila y despliega:
   ```bash
   npm run build
   npm run deploy
   ```

El cliente **no necesita cambios** porque solo llama a `validarContenidoImagen`.

## 📝 Estructura

```
functions/
├── src/
│   └── index.ts          # Función principal de validación
├── package.json          # Dependencias
├── tsconfig.json         # Configuración TypeScript
└── README.md            # Este archivo
```

## 🔍 Ver Logs

```bash
firebase functions:log
```

## 💡 Notas

- La función está configurada para aceptar URLs de imágenes
- Puedes ajustar los umbrales de moderación en `functions/src/index.ts`
- Las credenciales se guardan de forma segura en Firebase Functions Config
- El cliente nunca ve las credenciales ni sabe qué servicio se usa

