import { db } from "@/services/firebase";
import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";

export interface Publicacion {
  texto: string;
  usuarioNombre: string;
  imagenUrl?: string | null;
  creadoEn?: any;
}

/**
 * Crea una nueva publicación en Firestore
 */
export const crearPublicacion = async (data: Publicacion): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, "publicaciones"), {
      ...data,
      creadoEn: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al crear publicación:", error);
    throw error;
  }
};

export const listarPublicaciones = async (): Promise<void> => {
  try {
    const publicacionesRef = collection(db, "publicaciones");
    const snapshot = await getDocs(publicacionesRef);

    const publicaciones: Publicacion[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Publicacion, "id">),
    }));

    console.log("📄 Publicaciones encontradas:", publicaciones);
  } catch (error) {
    console.error("❌ Error al listar publicaciones:", error);
  }
};

export const eliminarPublicacion = async (id: string): Promise<void> => {
  // Implementar la lógica para eliminar una publicación por su ID
};

export const actualizarPublicacion = async (
  id: string,
  data: Partial<Publicacion>
): Promise<void> => {
  // Implementar la lógica para actualizar una publicación por su ID
};
