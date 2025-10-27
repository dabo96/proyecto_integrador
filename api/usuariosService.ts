import { db } from "@/services/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc } from "firebase/firestore";

export type Usuario = {
  id: string;
  nombres?: string;
  apellidos?: string;
  nombre?: string;
  email?: string;
  fotoPerfil?: string | null;
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
      const data = usuarioSnap.data();
      console.log("👤 Datos del usuario actual:", data);
      return { id: usuarioID, ...data } as Usuario;
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

        snapshot.forEach((doc) => {
            usuarios.push({ ...doc.data(), id: doc.id } as Usuario);
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

        const data = snapshot.data() as Usuario;
        const usuario: Usuario = { ...data, uid: userId };

        return usuario;
    } catch (error) {
        console.error("Error al obtener usuario por ID:", error);
        return null;
    }
};