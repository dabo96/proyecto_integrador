import { db } from "@/services/firebase";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export interface Usuario {
    uid: string;
    nombre: string;
    codigo: string;
    carrera: string;
    correo: string;
    contrasena?: string;
    verificado?: boolean;
    createdAt?: any;
    updatedAt?: any;
    [key: string]: any;
}

export const obtenerUsuarioActivo = async (): Promise<Usuario | null> => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
        console.warn("Usuario no autenticado");
        return null;
    }

    // Suponiendo que en Firestore guardaste el UID como ID del documento
    const userRef = doc(db, "Usuarios", user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        console.warn("No se encontró el usuario en la base de datos");
        return null;
    }

    const data = snapshot.data() as Usuario;
    const usuario: Usuario = { ...data, uid: user.uid };
    console.log("🧑 Usuario activo:", usuario);

    return usuario;
};

export const obtenerTodosLosUsuarios = async (): Promise<Usuario[]> => {
    const { collection, getDocs } = await import("firebase/firestore");
    try {
        const usuariosRef = collection(db, "Usuarios");
        const snapshot = await getDocs(usuariosRef);
        const usuarios: Usuario[] = [];
        
        snapshot.forEach((doc) => {
            usuarios.push({ ...doc.data(), uid: doc.id } as Usuario);
        });
        
        console.log("📋 Usuarios obtenidos:", usuarios.length);
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
        console.log("👤 Usuario obtenido por ID:", usuario);

        return usuario;
    } catch (error) {
        console.error("Error al obtener usuario por ID:", error);
        return null;
    }
};