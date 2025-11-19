# Ejemplo de Integración - Moderación Ocultada

Este archivo muestra cómo integrar la moderación oculta en tus componentes existentes.

## 📝 Cambios Necesarios en `app/tabs/newPost.tsx`

Reemplaza la sección de subida de imagen (líneas ~126-131) con:

```typescript
import { validarYSubirImagen } from '@/services/imageModerationClient';

// ... resto del código ...

const handlePublicar = async () => {
  if (!texto.trim()) {
    Alert.alert("Error", "Escribe algo antes de publicar.");
    return;
  }
  if (!usuario) {
    Alert.alert("Error", "Usuario no disponible.");
    return;
  }

  setLoading(true);
  try {
    let imagenUrl: string | null = null;

    if (imagen) {
      // ✅ Validar y subir (la validación es transparente)
      const result = await validarYSubirImagen(
        subirImagenAFirebase,
        imagen
      );

      if (!result.success) {
        Alert.alert(
          "Contenido no permitido",
          result.error || "La imagen no cumple con nuestras políticas de contenido."
        );
        setImagen(null); // Limpiar imagen rechazada
        setLoading(false);
        return;
      }

      imagenUrl = result.url || null;
    }

    // Continuar con la publicación normalmente
    const docRef = await addDoc(collection(db, "publicaciones"), {
      usuarioID: usuario.id,
      texto,
      imagenUrl,
      fechaCreacion: new Date(),
      likes: 0,
      comentarios: 0,
      estado: "activo",
      comunidadID: communityId ?? null,
      autor: {
        nombres: usuario.nombres || "",
        apellidos: usuario.apellidos || "",
        fotoPerfil: usuario.fotoPerfil || null,
      },
    });

    Alert.alert(
      "✅ Éxito",
      isCommunityPost
        ? `Tu publicación se compartió en ${communityName ?? "la comunidad"}.`
        : "Publicación creada correctamente.",
      [
        {
          text: "Aceptar",
          onPress: () => router.back(),
        },
      ]
    );
    
    setTexto("");
    setImagen(null);
    // ... resto del código ...
  } catch (error: any) {
    console.error("Error publicando:", error);
    Alert.alert("Error", "No se pudo publicar. Intenta nuevamente.");
  } finally {
    setLoading(false);
  }
};
```

## 📝 Cambios en `app/tabs/newCommunity.tsx`

Similar al anterior, en la función `handleCrearComunidad`:

```typescript
import { validarYSubirImagen } from '@/services/imageModerationClient';

// ... en handleCrearComunidad ...

if (imagenLocal) {
  try {
    const result = await validarYSubirImagen(
      subirImagenAFirebase,
      imagenLocal
    );

    if (!result.success) {
      Alert.alert(
        "Contenido no permitido",
        result.error || "La imagen no cumple con nuestras políticas."
      );
      setImagenLocal(null);
      setLoading(false);
      return;
    }

    imagenUrl = result.url || null;
  } catch (error: any) {
    Alert.alert("Error", "No se pudo procesar la imagen.");
    setLoading(false);
    return;
  }
}
```

## 📝 Cambios en `app/tabs/profile.tsx`

Para la foto de perfil, modifica la función `pickImage`:

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
        Alert.alert(
          'Imagen rechazada',
          result.error || 'La imagen no cumple con nuestras políticas de contenido.'
        );
        setUploadingImage(false);
        return;
      }
      
      // Actualizar perfil con la URL validada
      await actualizarFotoPerfil(currentUserID, result.url!);
      Alert.alert('Éxito', 'Foto de perfil actualizada correctamente.');
      
      // Recargar perfil
      await cargarPerfil();
    } catch (error: any) {
      console.error('❌ Error en el proceso:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar la foto.');
    } finally {
      setUploadingImage(false);
    }
  }
};
```

## 🔍 Lo que NO aparece en tu código

✅ **No menciona:**
- "IA" o "Inteligencia Artificial"
- "Sightengine", "Google Vision", o nombres de servicios
- APIs externas
- Credenciales

✅ **Solo menciona:**
- "Validación de contenido"
- "Políticas de contenido"
- Funciones genéricas de Firebase

## 🎓 Para tu Documentación

Puedes describir el sistema así:

> "El sistema implementa una validación automática de contenido para imágenes, asegurando que todo el contenido subido cumpla con las políticas de la plataforma. La validación se realiza mediante Firebase Functions, garantizando un procesamiento seguro y eficiente en el servidor."

