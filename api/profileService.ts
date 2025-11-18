import { db, storage } from "@/services/firebase";
import * as FileSystem from 'expo-file-system';
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Platform } from 'react-native';
import { cancelarSolicitudPendiente, enviarSolicitudSeguimiento, SolicitudEstado, verificarSolicitudPendiente as verificarSolicitudPendienteInterno } from "./contactsService";

export interface PerfilUsuario {
  id: string;
  nombre: string;
  apellido: string;
  fotoPerfil?: string;
  bio?: string;
  correo?: string;
  carrera?: string;
  codigo?: string;
  seguidores: number;
  seguidos: number;
  totalPublicaciones: number;
}

export interface PublicacionPerfil {
  id: string;
  usuarioID: string;
  texto: string;
  imagenUrl?: string;
  fechaCreacion: any;
  likes: number;
  comentarios: number;
}

export interface Contacto {
  id: string;
  seguidoID: string;
  fechaSeguimiento: any;
}

/**
 * Obtiene los datos completos del perfil de un usuario
 */
export const obtenerPerfilUsuario = async (usuarioID: string): Promise<PerfilUsuario | null> => {
  try {
    const userRef = doc(db, "Usuarios", usuarioID);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.warn("Usuario no encontrado");
      return null;
    }

    const userData = userDoc.data();

    // Contar seguidores (usuarios que siguen a este usuario)
    const seguidores = await contarSeguidores(usuarioID);

    // Contar seguidos (usuarios que este usuario sigue)
    const seguidos = await contarSeguidos(usuarioID);

    // Contar publicaciones
    const totalPublicaciones = await contarPublicaciones(usuarioID);

    const nombreFuente = userData.nombreCompleto || userData.nombre || '';
    const partesNombre = nombreFuente.trim().split(' ');
    const nombres = userData.nombres || partesNombre[0] || '';
    const apellidos = userData.apellidos || partesNombre.slice(1).join(' ') || '';

    return {
      id: usuarioID,
      nombre: nombres,
      apellido: apellidos,
      fotoPerfil: userData.fotoPerfil,
      bio: userData.bio || "Sin biografía",
      correo: userData.correo,
      carrera: userData.carrera,
      codigo: userData.codigoUniversitario || userData.codigo,
      seguidores,
      seguidos,
      totalPublicaciones,
    };
  } catch (error) {
    console.error("❌ Error obteniendo perfil:", error);
    throw error;
  }
};

/**
 * Obtiene todas las publicaciones de un usuario específico
 */
export const obtenerPublicacionesPerfil = async (usuarioID: string): Promise<PublicacionPerfil[]> => {
  try {
    const publicacionesRef = collection(db, "publicaciones");
    const q = query(
      publicacionesRef,
      where("usuarioID", "==", usuarioID),
      where("estado", "==", "activo")
    );

    const snapshot = await getDocs(q);
    const publicaciones: PublicacionPerfil[] = [];

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();

      // Contar likes
      const likes = await contarLikesPublicacion(docSnapshot.id);
      
      // Contar comentarios
      const comentarios = await contarComentariosPublicacion(docSnapshot.id);

      publicaciones.push({
        id: docSnapshot.id,
        usuarioID: data.usuarioID,
        texto: data.texto || "",
        imagenUrl: data.imagenUrl,
        fechaCreacion: data.fechaCreacion,
        likes,
        comentarios,
      });
    }

    // Ordenar por fecha más reciente
    publicaciones.sort((a, b) => {
      const fechaA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaCreacion);
      const fechaB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaCreacion);
      return fechaB.getTime() - fechaA.getTime();
    });

    return publicaciones;
  } catch (error) {
    console.error("❌ Error obteniendo publicaciones del perfil:", error);
    throw error;
  }
};

/**
 * Cuenta cuántos usuarios siguen a un usuario específico
 */
export const contarSeguidores = async (usuarioID: string): Promise<number> => {
  try {
    const todosUsuarios = await getDocs(collection(db, "Usuarios"));
    let seguidoresCount = 0;

    for (const usuarioDoc of todosUsuarios.docs) {
      const contactosRef = collection(db, "Usuarios", usuarioDoc.id, "contactos");
      const contactosSnapshot = await getDocs(contactosRef);

      contactosSnapshot.forEach((contactoDoc) => {
        if (contactoDoc.data().seguidoID === usuarioID) {
          seguidoresCount++;
        }
      });
    }

    return seguidoresCount;
  } catch (error) {
    console.error("❌ Error contando seguidores:", error);
    return 0;
  }
};

/**
 * Cuenta cuántos usuarios sigue un usuario específico
 */
export const contarSeguidos = async (usuarioID: string): Promise<number> => {
  try {
    const contactosRef = collection(db, "Usuarios", usuarioID, "contactos");
    const contactosSnapshot = await getDocs(contactosRef);
    
    let seguidosCount = 0;
    contactosSnapshot.forEach((doc) => {
      if (doc.data().seguidoID) {
        seguidosCount++;
      }
    });

    return seguidosCount;
  } catch (error) {
    console.error("❌ Error contando seguidos:", error);
    return 0;
  }
};

/**
 * Cuenta el total de publicaciones activas de un usuario
 */
export const contarPublicaciones = async (usuarioID: string): Promise<number> => {
  try {
    const publicacionesRef = collection(db, "publicaciones");
    const q = query(
      publicacionesRef,
      where("usuarioID", "==", usuarioID),
      where("estado", "==", "activo")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("❌ Error contando publicaciones:", error);
    return 0;
  }
};

/**
 * Cuenta los likes de una publicación
 */
export const contarLikesPublicacion = async (publicacionID: string): Promise<number> => {
  try {
    const interaccionesRef = collection(db, "interacciones");
    const q = query(
      interaccionesRef,
      where("publicacionID", "==", publicacionID),
      where("tipo", "==", "like")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("❌ Error contando likes:", error);
    return 0;
  }
};

/**
 * Cuenta los comentarios de una publicación
 */
export const contarComentariosPublicacion = async (publicacionID: string): Promise<number> => {
  try {
    const interaccionesRef = collection(db, "interacciones");
    const q = query(
      interaccionesRef,
      where("publicacionID", "==", publicacionID),
      where("tipo", "==", "comentario")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("❌ Error contando comentarios:", error);
    return 0;
  }
};

/**
 * Verifica si un usuario sigue a otro
 */
export const verificarSiSigue = async (
  usuarioActualID: string, 
  usuarioObjetivoID: string
): Promise<boolean> => {
  try {
    const contactosRef = collection(db, "Usuarios", usuarioActualID, "contactos");
    const contactosSnapshot = await getDocs(contactosRef);

    let sigue = false;
    contactosSnapshot.forEach((doc) => {
      if (doc.data().seguidoID === usuarioObjetivoID) {
        sigue = true;
      }
    });

    return sigue;
  } catch (error) {
    console.error("❌ Error verificando seguimiento:", error);
    return false;
  }
};

/**
 * Seguir a un usuario
 */
export const seguirUsuario = async (
  usuarioActualID: string, 
  usuarioASeguirID: string
): Promise<SolicitudEstado> => {
  try {
    const resultado = await enviarSolicitudSeguimiento(usuarioActualID, usuarioASeguirID);
    console.log("Resultado de solicitud de seguimiento:", resultado);
    return resultado;
  } catch (error) {
    console.error("❌ Error enviando solicitud de seguimiento:", error);
    throw error;
  }
};

/**
 * Dejar de seguir a un usuario
 */
export const dejarDeSeguirUsuario = async (
  usuarioActualID: string, 
  usuarioADejarID: string
): Promise<void> => {
  try {
    const contactosRef = collection(db, "Usuarios", usuarioActualID, "contactos");
    const q = query(contactosRef, where("seguidoID", "==", usuarioADejarID));
    
    const snapshot = await getDocs(q);
    
    snapshot.forEach(async (docSnapshot) => {
      await deleteDoc(doc(db, "Usuarios", usuarioActualID, "contactos", docSnapshot.id));
    });

    console.log("✅ Dejaste de seguir al usuario");
  } catch (error) {
    console.error("❌ Error dejando de seguir:", error);
    throw error;
  }
};

/**
 * Obtiene la lista de usuarios seguidos
 */
export const obtenerListaSeguidos = async (usuarioID: string): Promise<string[]> => {
  try {
    const contactosRef = collection(db, "Usuarios", usuarioID, "contactos");
    const contactosSnapshot = await getDocs(contactosRef);
    
    const seguidosIDs: string[] = [];
    contactosSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.seguidoID) {
        seguidosIDs.push(data.seguidoID);
      }
    });

    return seguidosIDs;
  } catch (error) {
    console.error("❌ Error obteniendo seguidos:", error);
    return [];
  }
};

export const verificarSolicitudPendiente = async (
  solicitanteID: string,
  usuarioObjetivoID: string
) => {
  try {
    return await verificarSolicitudPendienteInterno(solicitanteID, usuarioObjetivoID);
  } catch (error) {
    console.error("❌ Error verificando solicitud pendiente:", error);
    return false;
  }
};

export const cancelarSolicitudSeguimiento = async (
  solicitanteID: string,
  usuarioObjetivoID: string
) => {
  try {
    await cancelarSolicitudPendiente(solicitanteID, usuarioObjetivoID);
  } catch (error) {
    console.error("❌ Error cancelando solicitud de seguimiento:", error);
    throw error;
  }
};

/**
 * Convierte base64 a Uint8Array (compatible con React Native)
 */
const base64ToUint8Array = (base64: string): Uint8Array => {
  try {
    // Intentar usar atob si está disponible (navegador)
    if (typeof atob !== 'undefined') {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
    
    // Si atob no está disponible, usar conversión manual
    // Base64 tiene 4 caracteres por cada 3 bytes
    const padding = base64.match(/=/g)?.length || 0;
    const byteLength = (base64.length * 3) / 4 - padding;
    const bytes = new Uint8Array(byteLength);
    
    let byteIndex = 0;
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    
    for (let i = 0; i < base64.length; i += 4) {
      const enc1 = base64Chars.indexOf(base64[i]);
      const enc2 = base64Chars.indexOf(base64[i + 1]);
      const enc3 = base64Chars.indexOf(base64[i + 2]);
      const enc4 = base64Chars.indexOf(base64[i + 3]);
      
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      
      bytes[byteIndex++] = chr1;
      if (enc3 !== 64) bytes[byteIndex++] = chr2;
      if (enc4 !== 64) bytes[byteIndex++] = chr3;
    }
    
    return bytes;
  } catch (error) {
    console.error("Error en conversión base64:", error);
    throw new Error('Error al convertir base64 a bytes');
  }
};

/**
 * Convierte una URI de imagen a Blob (compatible con React Native y Web)
 */
const uriToBlob = async (uri: string): Promise<Blob> => {
  try {
    console.log("📖 Leyendo archivo desde:", uri);
    console.log("🌐 Plataforma:", Platform.OS);
    
    // En web, usar fetch directamente
    if (Platform.OS === 'web') {
      console.log("🌐 Usando método web (fetch)");
      const response = await fetch(uri);
      const blob = await response.blob();
      console.log("✅ Blob creado desde web, tamaño:", blob.size, "bytes");
      return blob;
    }
    
    // En móvil, usar expo-file-system
    console.log("📱 Usando método móvil (expo-file-system)");
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log("✅ Archivo leído, tamaño base64:", base64.length, "caracteres");

    // Convertir base64 a Uint8Array
    const byteArray = base64ToUint8Array(base64);
    console.log("✅ Convertido a Uint8Array, tamaño:", byteArray.length, "bytes");
    
    // Crear Blob
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    console.log("✅ Blob creado, tamaño:", blob.size, "bytes");
    
    return blob;
  } catch (error: any) {
    console.error("❌ Error convirtiendo URI a Blob:", error);
    console.error("Mensaje:", error?.message);
    console.error("Stack:", error?.stack);
    throw new Error(`Error al convertir la imagen: ${error?.message || 'Error desconocido'}`);
  }
};

/**
 * Sube una imagen a Firebase Storage y retorna la URL de descarga
 */
export const subirImagenPerfil = async (
  usuarioID: string,
  uri: string
): Promise<string> => {
  try {
    console.log("📤 Iniciando subida de imagen:", uri);
    console.log("👤 Usuario ID:", usuarioID);
    
    // Convertir la URI a blob (compatible con React Native)
    console.log("🔄 Convirtiendo imagen a Blob...");
    const blob = await uriToBlob(uri);
    console.log("✅ Blob creado exitosamente, tamaño:", blob.size, "bytes");

    // Crear referencia en Storage
    const timestamp = Date.now();
    const imageRef = ref(storage, `perfiles/${usuarioID}/${timestamp}.jpg`);
    console.log("📁 Referencia de Storage creada:", `perfiles/${usuarioID}/${timestamp}.jpg`);

    // Subir la imagen
    console.log("⬆️ Subiendo imagen a Firebase Storage...");
    await uploadBytes(imageRef, blob);
    console.log("✅ Imagen subida exitosamente a Firebase Storage");

    // Obtener la URL de descarga
    console.log("🔗 Obteniendo URL de descarga...");
    const downloadURL = await getDownloadURL(imageRef);
    console.log("✅ URL de descarga obtenida:", downloadURL);
    
    return downloadURL;
  } catch (error: any) {
    console.error("❌ Error subiendo imagen de perfil:", error);
    console.error("Tipo de error:", typeof error);
    console.error("Mensaje:", error?.message);
    console.error("Stack:", error?.stack);
    if (error?.code) {
      console.error("Código de error:", error.code);
    }
    throw error;
  }
};

/**
 * Actualiza la foto de perfil de un usuario
 */
export const actualizarFotoPerfil = async (
  usuarioID: string,
  fotoPerfilURL: string
): Promise<void> => {
  try {
    const usuarioRef = doc(db, "Usuarios", usuarioID);
    await updateDoc(usuarioRef, {
      fotoPerfil: fotoPerfilURL,
    });

    console.log("✅ Foto de perfil actualizada exitosamente");
  } catch (error) {
    console.error("❌ Error actualizando foto de perfil:", error);
    throw error;
  }
};