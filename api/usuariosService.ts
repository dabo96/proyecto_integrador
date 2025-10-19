import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/services/firebase";

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
