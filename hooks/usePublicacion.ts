import { useState } from "react";
import { crearPublicacion, Publicacion } from "@/api/publicacionesService";

export const usePublicacion = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const publicar = async (texto: string, usuarioNombre: string, imagenUrl?: string | null) => {
    setLoading(true);
    setError(null);

    try {
      const data: Publicacion = {
        texto,
        usuarioNombre,
        imagenUrl: imagenUrl || null,
      };

      const id = await crearPublicacion(data);
      return id;
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { publicar, loading, error };
};
