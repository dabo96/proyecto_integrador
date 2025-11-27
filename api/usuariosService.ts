import { db } from "@/services/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";


export type Usuario = {
  id: string;
  nombres?: string;
  apellidos?: string;
  nombre?: string;
  nombreCompleto?: string;
  correo?: string;
  codigoUniversitario?: string;
  carrera?: string;
  facultad?: string;
  verificado?: boolean;
  fotoPerfil?: string | null;
  indice_conducta?: number;
  uid?: string;
  [key: string]: any;
};


export const obtenerUsuarioActual = async (): Promise<Usuario | null> => {
  try {
    const usuarioID = await AsyncStorage.getItem("usuarioID");

    if (!usuarioID) {
      console.warn("⚠️ No hay usuarioID guardado en AsyncStorage.");
      return null;
    }

    console.log("🔹 UsuarioID obtenido:", usuarioID);

    const usuarioRef = doc(db, "Usuarios", usuarioID);
    const usuarioSnap = await getDoc(usuarioRef);
    
    if (usuarioSnap.exists()) {
      const data = usuarioSnap.data() || {};
      const nombreCompleto =
        data.nombreCompleto ||
        [data.nombres, data.apellidos].filter(Boolean).join(" ").trim();

      const usuario: Usuario = {
        id: usuarioID,
        ...data,
        nombreCompleto,
        nombre: nombreCompleto,
        correo: data.correo,
        uid: usuarioID,
      };

      console.log("👤 Datos del usuario actual:", usuario);
      return usuario;
    } else {
      console.warn("⚠️ No se encontró el usuario en Firestore.");
      return null;
    }
  } catch (error) {
    console.error("❌ Error al obtener usuario:", error);
    return null;
  }
};

export const obtenerTodosLosUsuarios = async (): Promise<Usuario[]> => {
    const { collection, getDocs } = await import("firebase/firestore");
    try {
        const usuariosRef = collection(db, "Usuarios");
        const snapshot = await getDocs(usuariosRef);
        const usuarios: Usuario[] = [];

        snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data() || {};
            const nombreCompleto =
              data.nombreCompleto ||
              [data.nombres, data.apellidos].filter(Boolean).join(" ").trim();

            usuarios.push({
              id: docSnapshot.id,
              ...data,
              nombreCompleto,
              nombre: nombreCompleto,
              correo: data.correo,
              uid: docSnapshot.id,
            } as Usuario);
        });
        
        return usuarios;
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        return [];
    }
};

export const obtenerUsuarioPorId = async (userId: string): Promise<Usuario | null> => {
    try {
        const userRef = doc(db, "Usuarios", userId);
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
            console.warn("No se encontró el usuario con ID:", userId);
            return null;
        }

        const data = snapshot.data() || {};
        const nombreCompleto =
          data.nombreCompleto ||
          [data.nombres, data.apellidos].filter(Boolean).join(" ").trim();

        const usuario: Usuario = {
          id: userId,
          ...data,
          nombreCompleto,
          nombre: nombreCompleto,
          correo: data.correo,
          uid: userId,
        };

        return usuario;
    } catch (error) {
        console.error("Error al obtener usuario por ID:", error);
        return null;
    }
};

export const actualizarEstadoOnline = async (usuarioID: string): Promise<void> => {
  try {
    const userRef = doc(db, "Usuarios", usuarioID);
    await updateDoc(userRef, {
      online: true,
      lastSeen: serverTimestamp(),
    });
    console.log("✅ Estado online actualizado para:", usuarioID);
  } catch (error) {
    console.error("Error actualizando estado online:", error);
    throw error;
  }
};

// Actualizar estado de conexión del usuario (desconectado)
export const actualizarEstadoOffline = async (usuarioID: string): Promise<void> => {
  try {
    const userRef = doc(db, "Usuarios", usuarioID);
    await updateDoc(userRef, {
      online: false,
      lastSeen: serverTimestamp(),
    });
    console.log("✅ Estado offline actualizado para usuario:", usuarioID);
  } catch (error) {
    console.error("Error actualizando estado offline:", error);
    throw error;
  }
};

// Escuchar cambios en el estado de conexión de un usuario
// Usa tiempo real de Firestore para detectar cambios inmediatos
export const escucharEstadoUsuario = (
  usuarioID: string,
  callback: (online: boolean, lastSeen: any) => void
): (() => void) => {
  const userRef = doc(db, "Usuarios", usuarioID);
  // Umbral más largo para usuarios que tienen online=true (pueden estar en proceso de actualizar lastSeen)
  const OFFLINE_THRESHOLD_STRICT = 120000; // 2 minutos sin actualización = offline (más tolerante)
  const OFFLINE_THRESHOLD_LOOSE = 30000; // 30 segundos para usuarios con online=false
  
  console.log("👂 Iniciando listener de estado para usuario:", usuarioID);
  
  return onSnapshot(
    userRef,
    { includeMetadataChanges: true }, // Incluir cambios de metadata para mejor sincronización
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const online = data.online || false;
        const lastSeen = data.lastSeen;
        
        // Si online es true, confiar más en ese campo y ser más tolerante con lastSeen
        let isActuallyOnline = online;
        
        if (lastSeen) {
          try {
            const lastSeenTime = lastSeen.toDate ? lastSeen.toDate().getTime() : new Date(lastSeen).getTime();
            const now = Date.now();
            const timeSinceLastSeen = now - lastSeenTime;
            
            // Usar umbral diferente según el estado de online
            const threshold = online ? OFFLINE_THRESHOLD_STRICT : OFFLINE_THRESHOLD_LOOSE;
            
            if (timeSinceLastSeen > threshold) {
              // Solo marcar como offline si el tiempo es muy largo
              isActuallyOnline = false;
              console.log(`⏰ Usuario ${usuarioID} offline por inactividad (${Math.round(timeSinceLastSeen / 1000)}s, online=${online})`);
            } else {
              // Si online es true, confiar en ese campo incluso si lastSeen es un poco antiguo
              isActuallyOnline = online;
              if (online) {
                console.log(`✅ Usuario ${usuarioID} online (última actualización hace ${Math.round(timeSinceLastSeen / 1000)}s)`);
              } else {
                console.log(`📴 Usuario ${usuarioID} offline (última actualización hace ${Math.round(timeSinceLastSeen / 1000)}s)`);
              }
            }
          } catch (error) {
            console.error("Error procesando lastSeen:", error);
            // Si hay error, confiar completamente en el campo online
            isActuallyOnline = online;
          }
        } else {
          // Si no hay lastSeen, confiar completamente en el campo online
          isActuallyOnline = online;
          if (online) {
            console.log(`🟢 Usuario ${usuarioID} online (sin lastSeen pero online=true)`);
          } else {
            console.log(`📴 Usuario ${usuarioID} offline (sin lastSeen y online=false)`);
          }
        }
        
        callback(isActuallyOnline, lastSeen);
      } else {
        console.log(`❌ Usuario ${usuarioID} no existe en Firestore`);
        callback(false, null);
      }
    },
    (error) => {
      console.error("❌ Error escuchando estado del usuario:", error);
      callback(false, null);
    }
  );
};