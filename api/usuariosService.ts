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
  
  console.log("👂 Iniciando listener de estado para usuario:", usuarioID);
  
  // Variable para rastrear el último estado conocido
  let lastKnownOnline: boolean | null = null;
  let isFirstCall = true;
  
  // Configurar el listener de tiempo real
  const unsubscribe = onSnapshot(
    userRef,
    (snapshot) => {
      const isFromCache = snapshot.metadata.fromCache;
      const hasPendingWrites = snapshot.metadata.hasPendingWrites;
      
      console.log(`📥 [LISTENER] Snapshot recibido para ${usuarioID}:`, {
        exists: snapshot.exists(),
        fromCache: isFromCache,
        hasPendingWrites: hasPendingWrites,
        isFirstCall
      });
      
      if (!snapshot.exists()) {
        console.log(`❌ Usuario ${usuarioID} no existe en Firestore`);
        if (lastKnownOnline !== false) {
          lastKnownOnline = false;
          callback(false, null);
        }
        isFirstCall = false;
        return;
      }
      
      const data = snapshot.data();
      const online = Boolean(data.online); // Convertir explícitamente a boolean
      const lastSeen = data.lastSeen;
      
      console.log(`📊 [LISTENER] Datos del usuario ${usuarioID}:`, {
        online,
        lastKnownOnline,
        lastSeen: lastSeen ? (lastSeen.toDate ? lastSeen.toDate().toISOString() : lastSeen) : null
      });
      
      // En la primera llamada, siempre ejecutar el callback para establecer el estado inicial
      // Después, solo llamar al callback si el estado cambió
      const wasFirstCall = isFirstCall;
      if (isFirstCall || lastKnownOnline !== online) {
        lastKnownOnline = online;
        isFirstCall = false;
        
        if (online) {
          console.log(`✅ Usuario ${usuarioID} EN LÍNEA (tiempo real) - ${wasFirstCall ? 'Estado inicial' : 'Cambio detectado'}`);
        } else {
          console.log(`📴 Usuario ${usuarioID} DESCONECTADO (tiempo real) - ${wasFirstCall ? 'Estado inicial' : 'Cambio detectado'}`);
        }
        
        // Llamar al callback inmediatamente con el nuevo estado
        callback(online, lastSeen);
      } else {
        // Si el estado no cambió pero queremos verificar lastSeen para casos edge
        // Solo hacerlo si online es true y lastSeen es muy antiguo
        if (online && lastSeen) {
          try {
            const lastSeenTime = lastSeen.toDate ? lastSeen.toDate().getTime() : new Date(lastSeen).getTime();
            const now = Date.now();
            const timeSinceLastSeen = now - lastSeenTime;
            
            // Si online=true pero lastSeen es muy antiguo (más de 2 minutos), marcar como offline
            if (timeSinceLastSeen > 120000) {
              console.log(`⏰ Usuario ${usuarioID} offline por inactividad (${Math.round(timeSinceLastSeen / 1000)}s)`);
              if (lastKnownOnline !== false) {
                lastKnownOnline = false;
                callback(false, lastSeen);
              }
            }
          } catch (error) {
            console.error("Error procesando lastSeen:", error);
          }
        }
      }
    },
    (error) => {
      console.error("❌ Error escuchando estado del usuario:", error);
      console.error("Detalles del error:", {
        code: error.code,
        message: error.message
      });
      if (lastKnownOnline !== false) {
        lastKnownOnline = false;
        callback(false, null);
      }
    }
  );
  
  return unsubscribe;
};