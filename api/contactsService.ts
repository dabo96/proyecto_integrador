import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/services/firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';

export interface Contacto {
  id: string;
  usuarioID: string;
  nombre: string;
  descripcion?: string;
  tiempo?: string;
  avatar?: string | null;
  carrera?: string;
  codigo?: string;
}

export interface SolicitudContacto {
  id: string;
  solicitanteID: string;
  nombre: string;
  descripcion?: string;
  tiempo?: string;
  avatar?: string | null;
  carrera?: string;
  codigo?: string;
}

export type SolicitudEstado = 'enviada' | 'pendiente' | 'ya_sigue' | 'error';

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatRelativeTime = (rawDate: any): string | undefined => {
  const date = toDate(rawDate);
  if (!date) return undefined;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return 'Hace un momento';
  if (diffSeconds < 3600) return `Hace ${Math.floor(diffSeconds / 60)} min`;
  if (diffSeconds < 86400) return `Hace ${Math.floor(diffSeconds / 3600)} h`;
  if (diffSeconds < 2592000) return `Hace ${Math.floor(diffSeconds / 86400)} días`;

  return date.toLocaleDateString();
};

const buildNombreCompleto = (data: Record<string, any>): string => {
  const nombreCompleto =
    data.nombreCompleto ||
    data.nombre ||
    [data.nombres, data.apellidos].filter(Boolean).join(' ');

  return String(nombreCompleto || '').replace(/\s+/g, ' ').trim();
};

const obtenerUsuarioID = async (usuarioID?: string | null): Promise<string | null> => {
  if (usuarioID) return usuarioID;
  return AsyncStorage.getItem('usuarioID');
};

const obtenerPerfilBasico = async (usuarioID: string) => {
  const usuarioRef = doc(db, 'Usuarios', usuarioID);
  const usuarioSnap = await getDoc(usuarioRef);
  if (!usuarioSnap.exists()) {
    return null;
  }

  const data = usuarioSnap.data() || {};
  return {
    id: usuarioID,
    nombreCompleto: buildNombreCompleto(data),
    carrera: data.carrera || 'Sin carrera',
    codigo: data.codigoUniversitario || data.codigo,
    fotoPerfil: data.fotoPerfil || null,
  };
};

export const obtenerContactos = async (usuarioID?: string) => {
  const currentUserId = await obtenerUsuarioID(usuarioID);

  if (!currentUserId) {
    return { contactos: [] as Contacto[], solicitudes: [] as SolicitudContacto[] };
  }

  const contactosRef = collection(db, 'Usuarios', currentUserId, 'contactos');
  const contactosSnapshot = await getDocs(contactosRef);

  const contactos = (
    await Promise.all(
      contactosSnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data() || {};
        if (!data.seguidoID) return null;

        const perfil = await obtenerPerfilBasico(data.seguidoID);
        if (!perfil) return null;

        return {
          id: docSnapshot.id,
          usuarioID: data.seguidoID,
          nombre: perfil.nombreCompleto,
          descripcion: perfil.carrera,
          avatar: perfil.fotoPerfil,
          tiempo: formatRelativeTime(data.fechaSeguimiento),
          carrera: perfil.carrera,
          codigo: perfil.codigo,
        } as Contacto;
      })
    )
  ).filter(Boolean) as Contacto[];

  const solicitudesRef = collection(db, 'Usuarios', currentUserId, 'solicitudes');
  const solicitudesSnapshot = await getDocs(solicitudesRef);

  const solicitudes = (
    await Promise.all(
      solicitudesSnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data() || {};
        if (!data.solicitanteID) return null;

        const perfil = await obtenerPerfilBasico(data.solicitanteID);
        if (!perfil) return null;

        return {
          id: docSnapshot.id,
          solicitanteID: data.solicitanteID,
          nombre: perfil.nombreCompleto,
          descripcion: perfil.carrera,
          avatar: perfil.fotoPerfil,
          tiempo: formatRelativeTime(data.createdAt),
          carrera: perfil.carrera,
          codigo: perfil.codigo,
        } as SolicitudContacto;
      })
    )
  ).filter(Boolean) as SolicitudContacto[];

  return { contactos, solicitudes };
};

export const aceptarSolicitud = async (usuarioID: string, solicitudID: string) => {
  const solicitudRef = doc(db, 'Usuarios', usuarioID, 'solicitudes', solicitudID);
  const solicitudSnap = await getDoc(solicitudRef);

  if (!solicitudSnap.exists()) {
    return;
  }

  const data = solicitudSnap.data() || {};
  const solicitanteID = data.solicitanteID;

  if (!solicitanteID) {
    await deleteDoc(solicitudRef);
    return;
  }

  const contactosSolicitanteRef = collection(db, 'Usuarios', solicitanteID, 'contactos');
  await addDoc(contactosSolicitanteRef, {
    seguidoID: usuarioID,
    fechaSeguimiento: serverTimestamp(),
  });

  await deleteDoc(solicitudRef);
};

export const rechazarSolicitud = async (usuarioID: string, solicitudID: string) => {
  const solicitudRef = doc(db, 'Usuarios', usuarioID, 'solicitudes', solicitudID);
  await deleteDoc(solicitudRef);
};

export const enviarSolicitudSeguimiento = async (
  solicitanteID: string,
  usuarioObjetivoID: string
): Promise<SolicitudEstado> => {
  if (solicitanteID === usuarioObjetivoID) {
    return 'error';
  }

  const contactosRef = collection(db, 'Usuarios', solicitanteID, 'contactos');
  const contactoQuery = query(contactosRef, where('seguidoID', '==', usuarioObjetivoID));
  const contactoSnapshot = await getDocs(contactoQuery);

  if (!contactoSnapshot.empty) {
    return 'ya_sigue';
  }

  const solicitudesRef = collection(db, 'Usuarios', usuarioObjetivoID, 'solicitudes');
  const solicitudQuery = query(solicitudesRef, where('solicitanteID', '==', solicitanteID));
  const solicitudSnapshot = await getDocs(solicitudQuery);

  if (!solicitudSnapshot.empty) {
    return 'pendiente';
  }

  const perfilSolicitante = await obtenerPerfilBasico(solicitanteID);

  await addDoc(solicitudesRef, {
    solicitanteID,
    createdAt: serverTimestamp(),
    nombre: perfilSolicitante?.nombreCompleto ?? null,
    carrera: perfilSolicitante?.carrera ?? null,
    codigo: perfilSolicitante?.codigo ?? null,
    fotoPerfil: perfilSolicitante?.fotoPerfil ?? null,
  });

  return 'enviada';
};

export const verificarSolicitudPendiente = async (
  solicitanteID: string,
  usuarioObjetivoID: string
): Promise<boolean> => {
  const solicitudesRef = collection(db, 'Usuarios', usuarioObjetivoID, 'solicitudes');
  const solicitudQuery = query(solicitudesRef, where('solicitanteID', '==', solicitanteID));
  const snapshot = await getDocs(solicitudQuery);
  return !snapshot.empty;
};

export const cancelarSolicitudPendiente = async (
  solicitanteID: string,
  usuarioObjetivoID: string
) => {
  const solicitudesRef = collection(db, 'Usuarios', usuarioObjetivoID, 'solicitudes');
  const solicitudQuery = query(solicitudesRef, where('solicitanteID', '==', solicitanteID));
  const snapshot = await getDocs(solicitudQuery);

  const batchDeletes = snapshot.docs.map((docSnapshot) =>
    deleteDoc(doc(db, 'Usuarios', usuarioObjetivoID, 'solicitudes', docSnapshot.id))
  );

  await Promise.all(batchDeletes);
};

export const obtenerNumeroContactos = async (usuarioID?: string) => {
  const data = await obtenerContactos(usuarioID);
  return data.contactos.length;
};
