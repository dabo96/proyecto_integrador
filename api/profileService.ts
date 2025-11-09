import { enviarSolicitudSeguimiento, verificarSolicitudPendiente as verificarSolicitudPendienteInterno, cancelarSolicitudPendiente, SolicitudEstado } from "./contactsService";
import { db } from "@/services/firebase";
import { collection, deleteDoc, doc, getDoc, getDocs, query, where } from "firebase/firestore";

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