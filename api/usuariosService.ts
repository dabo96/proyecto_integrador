import { db } from "@/services/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";

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