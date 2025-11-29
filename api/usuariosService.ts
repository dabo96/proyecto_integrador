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
  // Umbral más corto para respuesta más rápida
  const OFFLINE_THRESHOLD_STRICT = 60000; // 1 minuto sin actualización = offline
  const OFFLINE_THRESHOLD_LOOSE = 20000; // 20 segundos para usuarios con online=false
  
  console.log("👂 Iniciando listener de estado para usuario:", usuarioID);
  
  // Función para determinar el estado online basado en los datos
  const determineOnlineStatus = (data: any): boolean => {
    const online = data.online || false;
    const lastSeen = data.lastSeen;
    
    // Si el campo online es true, confiar en él inmediatamente (respuesta más rápida)
    if (online === true) {
      // Solo verificar lastSeen si es muy antiguo (más de 1 minuto)
      if (lastSeen) {
        try {
          const lastSeenTime = lastSeen.toDate ? lastSeen.toDate().getTime() : new Date(lastSeen).getTime();
          const now = Date.now();
          const timeSinceLastSeen = now - lastSeenTime;
          
          // Si online=true pero lastSeen es muy antiguo, marcar como offline
          if (timeSinceLastSeen > OFFLINE_THRESHOLD_STRICT) {
            console.log(`⏰ Usuario ${usuarioID} offline por inactividad (${Math.round(timeSinceLastSeen / 1000)}s)`);
            return false;
          }
        } catch (error) {
          console.error("Error procesando lastSeen:", error);
        }
      }
      // Si online=true y lastSeen es reciente o no existe, confiar en online
      return true;
    }
    
    // Si online es false, verificar lastSeen para confirmar
    if (lastSeen) {
      try {
        const lastSeenTime = lastSeen.toDate ? lastSeen.toDate().getTime() : new Date(lastSeen).getTime();
        const now = Date.now();
        const timeSinceLastSeen = now - lastSeenTime;
        
        // Si lastSeen es muy reciente (menos de 20 segundos), considerar online
        if (timeSinceLastSeen < OFFLINE_THRESHOLD_LOOSE) {
          console.log(`✅ Usuario ${usuarioID} online (lastSeen reciente: ${Math.round(timeSinceLastSeen / 1000)}s)`);
          return true;
        }
      } catch (error) {
        console.error("Error procesando lastSeen:", error);
      }
    }
    
    // Por defecto, usar el valor del campo online
    return online;
  };
  
  // Configurar el listener de tiempo real
  const unsubscribe = onSnapshot(
    userRef,
    (snapshot) => {
      // onSnapshot se ejecuta inmediatamente con el estado actual
      // y luego cada vez que hay un cambio
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        const isActuallyOnline = determineOnlineStatus(data);
        const lastSeen = data.lastSeen;
        
        // Determinar si es la primera ejecución o un cambio real
        const isInitialLoad = !snapshot.metadata.hasPendingWrites && snapshot.metadata.fromCache;
        
        if (isActuallyOnline) {
          console.log(`✅ Usuario ${usuarioID} EN LÍNEA ${isInitialLoad ? '(carga inicial)' : '(tiempo real)'}`);
        } else {
          console.log(`📴 Usuario ${usuarioID} DESCONECTADO ${isInitialLoad ? '(carga inicial)' : '(tiempo real)'}`);
        }
        
        // Llamar al callback inmediatamente con el nuevo estado
        // Esto se ejecuta tanto en la carga inicial como en cada cambio
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
  
  return unsubscribe;
};