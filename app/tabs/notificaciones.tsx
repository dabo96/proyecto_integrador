import { aceptarSolicitud, rechazarSolicitud } from '@/api/contactsService';
import { obtenerListaSeguidos, seguirUsuario, verificarSiSigue } from '@/api/profileService';
import { obtenerUsuarioPorId } from '@/api/usuariosService';
import PostCard from '@/components/cards/PostCard';
import { db } from '@/services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Notificacion = {
  id: string;
  tipo: 'publicacion' | 'comentario' | 'like' | 'seguidor' | 'solicitud_seguimiento';
  name: string;
  avatar?: string;
  publicacionID?: string;
  usuarioID: string;
  imagenUrl?: string;
  timestamp: number;
  publicacionTexto?: string;
  yaSeguido?: boolean;
  solicitudPendiente?: boolean;
  solicitudID?: string; // ID de la solicitud para aceptar/rechazar
};

const relTime = (ms: number) => {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'Hace un momento';
  if (s < 3600) return `Hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
  if (s < 2592000) return `Hace ${Math.floor(s / 86400)} días`;
  return new Date(ms).toLocaleDateString();
};

type Post = {
  id: string;
  usuarioID: string;
  contenido: string;
  fechaCreacion: any;
  imagen?: string;
  autor: {
    nombres: string;
    apellidos: string;
    fotoPerfil?: string;
  };
  likes: number;
  comentarios: number;
  isOwner?: boolean;
};

type Comentario = {
  id: string;
  usuarioID: string;
  comentario: string;
  fecha: any;
  autor: {
    nombres: string;
    apellidos: string;
    fotoPerfil?: string;
  };
};

export default function Notificaciones() {
  const router = useRouter();
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [currentUserID, setCurrentUserID] = useState<string>('');
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [likedPosts, setLikedPosts] = useState<{ [postId: string]: boolean }>({});
  const [comentarios, setComentarios] = useState<{ [postId: string]: Comentario[] }>({});
  const [loadingComments, setLoadingComments] = useState<string | null>(null);
  const [showCommentInput, setShowCommentInput] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const obtenerNotificaciones = async (userID?: string): Promise<Notificacion[]> => {
    const userId = userID || currentUserID;
    if (!userId) return [];

    const notificaciones: Notificacion[] = [];
    const usuarioCache = new Map<string, any>();

    const getUsuario = async (uid: string) => {
      if (usuarioCache.has(uid)) return usuarioCache.get(uid);
      const uRef = doc(db, 'Usuarios', uid);
      const uDoc = await getDoc(uRef);
      const data = uDoc.exists() ? uDoc.data() : null;
      usuarioCache.set(uid, data);
      return data;
    };

    // === Publicaciones de usuarios seguidos ===
    try {
      const seguidosIDs = await obtenerListaSeguidos(userId);
      if (seguidosIDs.length > 0) {
        const chunkSize = 10;
        for (let i = 0; i < seguidosIDs.length; i += chunkSize) {
          const chunk = seguidosIDs.slice(i, i + chunkSize);
          const publicacionesRef = collection(db, 'publicaciones');
          const qPub = query(publicacionesRef, where('usuarioID', 'in', chunk), where('estado', '==', 'activo'));
          const snapPub = await getDocs(qPub);
          for (const d of snapPub.docs) {
            const data = d.data() as any;
            const u = await getUsuario(data.usuarioID);
            if (!u) continue;
            const nombre = `${u.nombre || ''} ${u.apellido || u.apellidos || ''}`.trim();
            const ts = data.fechaCreacion?.toDate
              ? data.fechaCreacion.toDate().getTime()
              : new Date(data.fechaCreacion || Date.now()).getTime();
            notificaciones.push({
              id: `pub_${d.id}`,
              tipo: 'publicacion',
              name: nombre,
              avatar: u.fotoPerfil,
              publicacionID: d.id,
              usuarioID: data.usuarioID,
              imagenUrl: data.imagenUrl,
              timestamp: ts,
            });
          }
        }
      }
    } catch (e) {
      console.error('Error cargando publicaciones:', e);
    }

    // === Mis publicaciones (para filtrar interacciones) ===
    const misPublicacionesRef = collection(db, 'publicaciones');
    const qMis = query(misPublicacionesRef, where('usuarioID', '==', userId), where('estado', '==', 'activo'));
    const misSnap = await getDocs(qMis);
    const misIds = new Set<string>();
    const mapaMisPublicaciones = new Map<string, any>();
    for (const d of misSnap.docs) {
      misIds.add(d.id);
      mapaMisPublicaciones.set(d.id, d.data());
    }

    // === Comentarios (sin mostrar texto del comentario) ===
    try {
      const comentariosQ = query(collection(db, 'interacciones'), where('tipo', '==', 'comentario'));
      const comSnap = await getDocs(comentariosQ);
      for (const d of comSnap.docs) {
        const data = d.data() as any;
        if (!misIds.has(data.publicacionID)) continue;
        const u = await getUsuario(data.usuarioID);
        if (!u) continue;
        const ts = data.fecha?.toDate
          ? data.fecha.toDate().getTime()
          : new Date(data.fecha || Date.now()).getTime();
        const postData = mapaMisPublicaciones.get(data.publicacionID) || {};
        
        // Obtener solo el primer nombre y primer apellido
        let primerNombre = '';
        let primerApellido = '';
        
        // Intentar obtener desde campos separados primero (nombres y apellidos)
        if (u.nombres) {
          primerNombre = u.nombres.split(' ')[0]; // Solo el primer nombre
        }
        if (u.apellidos) {
          primerApellido = u.apellidos.split(' ')[0]; // Solo el primer apellido
        }
        
        // Si no hay campos separados, intentar desde nombreCompleto o nombre
        if (!primerNombre || !primerApellido) {
          const nombreFuente = u.nombreCompleto || u.nombre || '';
          const partesNombre = nombreFuente.trim().split(' ').filter(p => p.length > 0);
          if (!primerNombre && partesNombre.length > 0) {
            primerNombre = partesNombre[0];
          }
          if (!primerApellido && partesNombre.length > 1) {
            primerApellido = partesNombre[1]; // Primer apellido
          }
        }
        
        const nombre = `${primerNombre} ${primerApellido}`.trim();
        
        notificaciones.push({
          id: `com_${d.id}`,
          tipo: 'comentario',
          name: nombre,
          avatar: u.fotoPerfil,
          publicacionID: data.publicacionID,
          usuarioID: data.usuarioID,
          imagenUrl: postData.imagenUrl,
          timestamp: ts,
          publicacionTexto: postData.texto,
        });
      }
    } catch (e) {
      console.error('Error cargando comentarios:', e);
    }

    // === Likes ===
    try {
      const likesQ = query(collection(db, 'interacciones'), where('tipo', '==', 'like'));
      const likesSnap = await getDocs(likesQ);
      for (const d of likesSnap.docs) {
        const data = d.data() as any;
        if (!misIds.has(data.publicacionID)) continue;
        const u = await getUsuario(data.usuarioID);
        if (!u) continue;
        const ts = data.fecha?.toDate
          ? data.fecha.toDate().getTime()
          : new Date(data.fecha || Date.now()).getTime();
        const postData = mapaMisPublicaciones.get(data.publicacionID) || {};
        
        // Obtener solo el primer nombre y primer apellido
        let primerNombre = '';
        let primerApellido = '';
        
        // Intentar obtener desde campos separados primero
        if (u.nombres) {
          primerNombre = u.nombres.split(' ')[0]; // Solo el primer nombre
        }
        if (u.apellidos) {
          primerApellido = u.apellidos.split(' ')[0]; // Solo el primer apellido
        }
        
        // Si no hay campos separados, intentar desde nombreCompleto o nombre
        if (!primerNombre || !primerApellido) {
          const nombreFuente = u.nombreCompleto || u.nombre || '';
          const partesNombre = nombreFuente.trim().split(' ');
          if (!primerNombre && partesNombre.length > 0) {
            primerNombre = partesNombre[0];
          }
          if (!primerApellido && partesNombre.length > 1) {
            primerApellido = partesNombre[1];
          }
        }
        
        const nombre = `${primerNombre} ${primerApellido}`.trim();
        
        notificaciones.push({
          id: `like_${d.id}`,
          tipo: 'like',
          name: nombre,
          avatar: u.fotoPerfil,
          publicacionID: data.publicacionID,
          usuarioID: data.usuarioID,
          imagenUrl: postData.imagenUrl,
          timestamp: ts,
          publicacionTexto: postData.texto,
        });
      }
    } catch (e) {
      console.error('Error cargando likes:', e);
    }

    // === Seguidores ===
    try {
      const todosUsuarios = await getDocs(collection(db, 'Usuarios'));
      for (const usuarioDoc of todosUsuarios.docs) {
        const contactosRef = collection(db, 'Usuarios', usuarioDoc.id, 'contactos');
        const contactosSnapshot = await getDocs(contactosRef);
        for (const contactoDoc of contactosSnapshot.docs) {
          const contactoData = contactoDoc.data();
          if (contactoData.seguidoID === userId) {
            const u = await getUsuario(usuarioDoc.id);
            if (!u) continue;
            const yaLoEstoySiguiendo = await verificarSiSigue(userId, usuarioDoc.id);
            const ts = contactoData.fechaSeguimiento?.toDate
              ? contactoData.fechaSeguimiento.toDate().getTime()
              : new Date(contactoData.fechaSeguimiento || Date.now()).getTime();
            const nombre = `${u.nombre || ''} ${u.apellido || u.apellidos || ''}`.trim();
            notificaciones.push({
              id: `seguidor_${contactoDoc.id}`,
              tipo: 'seguidor',
              name: nombre,
              avatar: u.fotoPerfil,
              usuarioID: usuarioDoc.id,
              timestamp: ts,
              yaSeguido: yaLoEstoySiguiendo,
            });
          }
        }
      }
    } catch (e) {
      console.error('Error cargando seguidores:', e);
    }

    // === Solicitudes de seguimiento pendientes ===
    try {
      const solicitudesRef = collection(db, 'Usuarios', userId, 'solicitudes');
      const solicitudesSnapshot = await getDocs(solicitudesRef);
      
      for (const solicitudDoc of solicitudesSnapshot.docs) {
        const solicitudData = solicitudDoc.data();
        const solicitanteID = solicitudData.solicitanteID;
        
        if (solicitanteID) {
          const u = await getUsuario(solicitanteID);
          if (!u) continue;
          
          const ts = solicitudData.createdAt?.toDate
            ? solicitudData.createdAt.toDate().getTime()
            : new Date(solicitudData.createdAt || Date.now()).getTime();
          
          // Obtener solo el primer nombre y primer apellido
          let primerNombre = '';
          let primerApellido = '';
          
          // Intentar obtener desde campos separados primero (nombres y apellidos)
          if (u.nombres) {
            primerNombre = u.nombres.split(' ')[0]; // Solo el primer nombre
          }
          if (u.apellidos) {
            primerApellido = u.apellidos.split(' ')[0]; // Solo el primer apellido
          }
          
          // Si no hay campos separados, intentar desde nombreCompleto o nombre
          if (!primerNombre || !primerApellido) {
            const nombreFuente = solicitudData.nombre || u.nombreCompleto || u.nombre || '';
            const partesNombre = nombreFuente.trim().split(' ').filter(p => p.length > 0);
            if (!primerNombre && partesNombre.length > 0) {
              primerNombre = partesNombre[0];
            }
            if (!primerApellido && partesNombre.length > 1) {
              primerApellido = partesNombre[1]; // Primer apellido
            }
          }
          
          const nombre = `${primerNombre} ${primerApellido}`.trim();
          
          notificaciones.push({
            id: `solicitud_${solicitudDoc.id}`,
            tipo: 'solicitud_seguimiento',
            name: nombre,
            avatar: solicitudData.fotoPerfil || u.fotoPerfil,
            usuarioID: solicitanteID,
            timestamp: ts,
            solicitudID: solicitudDoc.id,
          });
        }
      }
    } catch (e) {
      console.error('Error cargando solicitudes de seguimiento:', e);
    }

    notificaciones.sort((a, b) => b.timestamp - a.timestamp);
    return notificaciones;
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const userID = await AsyncStorage.getItem('usuarioID');
      if (userID) {
        setCurrentUserID(userID);
        const datos = await obtenerNotificaciones(userID);
        setLista(datos);
      } else setLista([]);
    } catch (error) {
      console.error('Error en cargar:', error);
      setLista([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const getNotificationText = (n: Notificacion) => {
    if (n.tipo === 'publicacion') return 'hizo una publicación';
    if (n.tipo === 'comentario') return 'comentó en tu publicación';
    if (n.tipo === 'like') return 'le gustó tu publicación';
    if (n.tipo === 'seguidor') return 'comenzó a seguirte';
    if (n.tipo === 'solicitud_seguimiento') return 'te envió una solicitud de seguimiento';
    return '';
  };

  const handleSeguir = async (usuarioID: string, notificacionId: string) => {
    if (!currentUserID) return;
    try {
      const resultado = await seguirUsuario(currentUserID, usuarioID);

      if (resultado === 'enviada') {
        Alert.alert('Solicitud enviada', 'Tu solicitud de seguimiento ha sido enviada.');
      } else if (resultado === 'pendiente') {
        Alert.alert('Solicitud pendiente', 'Ya enviaste una solicitud que está pendiente.');
      } else if (resultado === 'ya_sigue') {
        Alert.alert('Éxito', 'Ahora sigues a este usuario.');
      }

      setLista(prev =>
        prev.map(n => {
          if (n.id !== notificacionId) return n;

          if (resultado === 'ya_sigue') {
            return { ...n, yaSeguido: true, solicitudPendiente: false };
          }

          if (resultado === 'enviada' || resultado === 'pendiente') {
            return { ...n, solicitudPendiente: true };
          }

          return n;
        })
      );
    } catch (error) {
      console.error('Error siguiendo usuario:', error);
    }
  };

  const handleAceptarSolicitud = async (solicitudID: string, usuarioID: string, notificacionId: string) => {
    if (!currentUserID || !solicitudID) return;
    
    try {
      await aceptarSolicitud(currentUserID, solicitudID);
      
      // Remover la notificación de solicitud y agregar una de seguidor
      setLista(prev => {
        const nuevaLista = prev.filter(n => n.id !== notificacionId);
        
        // Agregar notificación de nuevo seguidor
        const nuevaNotificacion: Notificacion = {
          id: `seguidor_${Date.now()}`,
          tipo: 'seguidor',
          name: prev.find(n => n.id === notificacionId)?.name || '',
          avatar: prev.find(n => n.id === notificacionId)?.avatar,
          usuarioID: usuarioID,
          timestamp: Date.now(),
          yaSeguido: false,
        };
        
        nuevaLista.unshift(nuevaNotificacion);
        return nuevaLista;
      });
      
      Alert.alert('Solicitud aceptada', 'Ahora este usuario te sigue.');
      
      // Recargar notificaciones para actualizar contadores
      await cargar();
    } catch (error) {
      console.error('Error aceptando solicitud:', error);
      Alert.alert('Error', 'No se pudo aceptar la solicitud. Intenta nuevamente.');
    }
  };

  const handleRechazarSolicitud = async (solicitudID: string, notificacionId: string) => {
    if (!currentUserID || !solicitudID) return;
    
    try {
      await rechazarSolicitud(currentUserID, solicitudID);
      
      // Remover la notificación
      setLista(prev => prev.filter(n => n.id !== notificacionId));
      
      Alert.alert('Solicitud rechazada', 'La solicitud ha sido rechazada.');
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      Alert.alert('Error', 'No se pudo rechazar la solicitud. Intenta nuevamente.');
    }
  };

  // Función para obtener una publicación por ID
  const obtenerPublicacionPorID = async (publicacionID: string): Promise<Post | null> => {
    try {
      console.log('🔍 Obteniendo publicación con ID:', publicacionID);
      setLoadingPost(true);
      const postRef = doc(db, 'publicaciones', publicacionID);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        console.error('❌ La publicación no existe:', publicacionID);
        return null;
      }

      const data = postDoc.data();
      console.log('📄 Datos de la publicación:', { id: postDoc.id, usuarioID: data.usuarioID, texto: data.texto?.substring(0, 50) });
      const usuario = await obtenerUsuarioPorId(data.usuarioID);
      
      if (!usuario) {
        console.error('❌ No se encontró el usuario:', data.usuarioID);
        return null;
      }
      
      console.log('👤 Usuario encontrado:', usuario.nombre);

      const nombreFuente = usuario.nombreCompleto || usuario.nombre || '';
      const partesNombre = nombreFuente.trim().split(' ');
      const nombresAutor = usuario.nombres || partesNombre[0] || '';
      const apellidosAutor = usuario.apellidos || partesNombre.slice(1).join(' ') || '';

      // Contar likes
      const likesQuery = query(
        collection(db, 'interacciones'),
        where('publicacionID', '==', publicacionID),
        where('tipo', '==', 'like')
      );
      const likesSnapshot = await getDocs(likesQuery);
      const likesCount = likesSnapshot.size;

      // Contar comentarios
      const comentariosQuery = query(
        collection(db, 'interacciones'),
        where('publicacionID', '==', publicacionID),
        where('tipo', '==', 'comentario')
      );
      const comentariosSnapshot = await getDocs(comentariosQuery);
      const comentariosCount = comentariosSnapshot.size;

      // Verificar si el usuario actual le dio like
      if (currentUserID) {
        const userLikeQuery = query(
          collection(db, 'interacciones'),
          where('usuarioID', '==', currentUserID),
          where('publicacionID', '==', publicacionID),
          where('tipo', '==', 'like')
        );
        const userLikeSnapshot = await getDocs(userLikeQuery);
        if (!userLikeSnapshot.empty) {
          setLikedPosts(prev => ({ ...prev, [publicacionID]: true }));
        }
      }

      const publicacion = {
        id: postDoc.id,
        usuarioID: data.usuarioID,
        contenido: data.texto,
        fechaCreacion: data.fechaCreacion,
        imagen: data.imagenUrl,
        autor: {
          nombres: nombresAutor,
          apellidos: apellidosAutor,
          fotoPerfil: usuario.fotoPerfil,
        },
        likes: likesCount,
        comentarios: comentariosCount,
        isOwner: data.usuarioID === currentUserID,
      };
      
      console.log('✅ Publicación procesada exitosamente:', {
        id: postDoc.id,
        autor: `${nombresAutor} ${apellidosAutor}`,
        likes: likesCount,
        comentarios: comentariosCount
      });
      
      return publicacion;
    } catch (error) {
      console.error('❌ Error obteniendo publicación:', error);
      return null;
    } finally {
      setLoadingPost(false);
    }
  };

  // Función para cargar comentarios
  const cargarComentarios = async (postId: string) => {
    setLoadingComments(postId);
    try {
      const comentariosQuery = query(
        collection(db, 'interacciones'),
        where('publicacionID', '==', postId),
        where('tipo', '==', 'comentario')
      );
      const comentariosSnapshot = await getDocs(comentariosQuery);
      const comentariosList: Comentario[] = [];

      for (const comentarioDoc of comentariosSnapshot.docs) {
        const data = comentarioDoc.data();
        const usuario = await obtenerUsuarioPorId(data.usuarioID);
        
        if (usuario) {
          const nombreFuente = usuario.nombreCompleto || usuario.nombre || '';
          const partesNombre = nombreFuente.trim().split(' ');
          const nombresAutor = usuario.nombres || partesNombre[0] || '';
          const apellidosAutor = usuario.apellidos || partesNombre.slice(1).join(' ') || '';

          comentariosList.push({
            id: comentarioDoc.id,
            usuarioID: data.usuarioID,
            comentario: data.comentario || data.texto || '',
            fecha: data.fecha,
            autor: {
              nombres: nombresAutor,
              apellidos: apellidosAutor,
              fotoPerfil: usuario.fotoPerfil,
            },
          });
        }
      }

      setComentarios(prev => ({ ...prev, [postId]: comentariosList }));
    } catch (error) {
      console.error('Error cargando comentarios:', error);
    } finally {
      setLoadingComments(null);
    }
  };

  // Función para manejar like
  const handleLike = async (postId: string) => {
    if (!currentUserID) return;

    try {
      const likeQuery = query(
        collection(db, 'interacciones'),
        where('usuarioID', '==', currentUserID),
        where('publicacionID', '==', postId),
        where('tipo', '==', 'like')
      );
      const likeSnapshot = await getDocs(likeQuery);

      if (!likeSnapshot.empty) {
        // Quitar like
        for (const likeDoc of likeSnapshot.docs) {
          await deleteDoc(doc(db, 'interacciones', likeDoc.id));
        }
        setLikedPosts(prev => ({ ...prev, [postId]: false }));
        
        // Actualizar contador
        if (selectedPost) {
          setSelectedPost({ ...selectedPost, likes: Math.max(0, selectedPost.likes - 1) });
        }
      } else {
        // Agregar like
        await addDoc(collection(db, 'interacciones'), {
          usuarioID: currentUserID,
          publicacionID: postId,
          tipo: 'like',
          fecha: serverTimestamp(),
        });
        setLikedPosts(prev => ({ ...prev, [postId]: true }));
        
        // Actualizar contador
        if (selectedPost) {
          setSelectedPost({ ...selectedPost, likes: selectedPost.likes + 1 });
        }
      }
    } catch (error) {
      console.error('Error en like:', error);
    }
  };

  // Función para enviar comentario
  const handleSendComment = async (postId: string) => {
    if (!currentUserID || !commentText.trim()) return;

    try {
      await addDoc(collection(db, 'interacciones'), {
        usuarioID: currentUserID,
        publicacionID: postId,
        tipo: 'comentario',
        comentario: commentText.trim(),
        fecha: serverTimestamp(),
      });

      setCommentText('');
      setShowCommentInput(null);
      
      // Recargar comentarios
      await cargarComentarios(postId);
      
      // Actualizar contador
      if (selectedPost) {
        setSelectedPost({ ...selectedPost, comentarios: selectedPost.comentarios + 1 });
      }
    } catch (error) {
      console.error('Error enviando comentario:', error);
      Alert.alert('Error', 'No se pudo enviar el comentario');
    }
  };

  // Función para formatear tiempo
  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'Hace un momento';
    const now = new Date();
    const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    return postDate.toLocaleDateString();
  };

  const handleNotificationPress = async (n: Notificacion) => {
    console.log('🔔 Notificación clickeada:', {
      tipo: n.tipo,
      publicacionID: n.publicacionID,
      usuarioID: n.usuarioID,
      name: n.name
    });

    // Si la notificación tiene una publicación asociada, abrir modal
    if (n.publicacionID && (n.tipo === 'like' || n.tipo === 'comentario' || n.tipo === 'publicacion')) {
      console.log('📝 Abriendo modal para publicación:', n.publicacionID);
      const post = await obtenerPublicacionPorID(n.publicacionID);
      console.log('📝 Publicación obtenida:', post ? post.id : 'null');
      if (post) {
        setSelectedPost(post);
        setShowPostModal(true);
        // Cargar comentarios automáticamente
        await cargarComentarios(n.publicacionID);
      } else {
        Alert.alert('Error', 'No se pudo cargar la publicación');
      }
    } else if (n.tipo === 'seguidor' || n.tipo === 'solicitud_seguimiento') {
      // Para seguidores, navegar al perfil del usuario
      if (currentUserID === n.usuarioID) {
        router.push('./profile');
      } else {
        router.push({ pathname: './otherProfile', params: { userId: n.usuarioID } });
      }
    } else {
      // Para otros tipos, navegar al perfil del usuario
      if (currentUserID === n.usuarioID) {
        router.push('./profile');
      } else {
        router.push({ pathname: './otherProfile', params: { userId: n.usuarioID } });
      }
    }
  };

  const Item = ({ n }: { n: Notificacion }) => {
    // Si tiene publicacionID, el clic principal abre el modal, no navega al perfil
    const hasPublication = n.publicacionID && (n.tipo === 'like' || n.tipo === 'comentario' || n.tipo === 'publicacion');
    
    return (
      <TouchableOpacity 
        style={styles.rowItem}
        onPress={() => handleNotificationPress(n)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfoContainer}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation(); // Evitar que se propague al TouchableOpacity padre
              if (currentUserID === n.usuarioID) {
                router.push('./profile');
              } else {
                router.push({ pathname: './otherProfile', params: { userId: n.usuarioID } });
              }
            }}
            activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {n.avatar ? (
            <Image source={{ uri: n.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#ccc' }]} />
          )}
        </View>
          </TouchableOpacity>

        <View style={styles.rowInfo}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation(); // Evitar que se propague al TouchableOpacity padre
                if (currentUserID === n.usuarioID) {
                  router.push('./profile');
                } else {
                  router.push({ pathname: './otherProfile', params: { userId: n.usuarioID } });
                }
              }}
              activeOpacity={0.7}
            >
          <Text style={styles.rowTitle}>{n.name}</Text>
            </TouchableOpacity>
          <Text style={styles.rowTime}>
            {getNotificationText(n)} • {relTime(n.timestamp)}
          </Text>
          {n.publicacionTexto && n.tipo !== 'publicacion' && (
            <Text style={styles.postPreview} numberOfLines={1}>
              En: {n.publicacionTexto}
            </Text>
          )}
        </View>
        </View>

      {/* ✅ Miniatura restaurada */}
      {n.imagenUrl ? (
        <Image source={{ uri: n.imagenUrl }} style={styles.thumbnail} />
      ) : null}

      {/* ✅ Botón seguir con degradado */}
      {n.tipo === 'seguidor' && (
        n.yaSeguido ? (
          <View style={[styles.followButton, styles.followingButton]}>
            <Text style={[styles.followButtonText, styles.followingButtonText]}>Siguiendo</Text>
          </View>
        ) : n.solicitudPendiente ? (
          <View style={[styles.followButton, styles.pendingButton]}>
            <Text style={[styles.followButtonText, styles.pendingButtonText]}>Solicitud enviada</Text>
          </View>
        ) : (
          <LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.gradientButton}>
            <TouchableOpacity
              style={styles.followButton}
              onPress={() => handleSeguir(n.usuarioID, n.id)}
            >
              <Text style={styles.followButtonText}>Seguir</Text>
            </TouchableOpacity>
          </LinearGradient>
        )
      )}

      {/* ✅ Botones de aceptar/rechazar para solicitudes de seguimiento */}
      {n.tipo === 'solicitud_seguimiento' && n.solicitudID && (
        <View style={styles.requestButtonsContainer}>
          <TouchableOpacity
            style={[styles.requestButton, styles.acceptButton]}
            onPress={() => handleAceptarSolicitud(n.solicitudID!, n.usuarioID, n.id)}
          >
            <Text style={styles.requestButtonText}>Aceptar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.requestButton, styles.rejectButton]}
            onPress={() => handleRechazarSolicitud(n.solicitudID!, n.id)}
          >
            <Text style={[styles.requestButtonText, styles.rejectButtonText]}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      )}
      </TouchableOpacity>
  );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1e3c72" barStyle="light-content" />
      <LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.header} />
      <Text style={styles.mainTitle}>Notificaciones</Text>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.section}>
          <Text style={styles.Subtitulos}>Todas las Notificaciones</Text>
          {cargando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2F4AA6" />
              <Text style={styles.loadingText}>Cargando notificaciones...</Text>
            </View>
          ) : lista.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay publicaciones</Text>
              <Text style={styles.emptySubtext}>Aún no hay actividad reciente</Text>
            </View>
          ) : (
            lista.map(n => <Item key={n.id} n={n} />)
          )}
        </View>
      </ScrollView>

      {/* Modal de publicación */}
      <Modal
        visible={showPostModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPostModal(false);
          setSelectedPost(null);
          setCommentText('');
          setShowCommentInput(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Publicación</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPostModal(false);
                  setSelectedPost(null);
                  setCommentText('');
                  setShowCommentInput(null);
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {loadingPost ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2F4AA6" />
                  <Text style={styles.loadingText}>Cargando publicación...</Text>
                </View>
              ) : selectedPost ? (
                <PostCard
                  post={selectedPost}
                  liked={likedPosts[selectedPost.id] || false}
                  onLike={() => handleLike(selectedPost.id)}
                  onComment={() => {
                    if (showCommentInput === selectedPost.id) {
                      setShowCommentInput(null);
                    } else {
                      setShowCommentInput(selectedPost.id);
                      cargarComentarios(selectedPost.id);
                    }
                  }}
                  formatTime={formatRelativeTime}
                  comentarios={comentarios[selectedPost.id] || []}
                  loadingComments={loadingComments === selectedPost.id}
                  showCommentInput={showCommentInput === selectedPost.id}
                  commentText={commentText}
                  onCommentTextChange={setCommentText}
                  onSendComment={() => handleSendComment(selectedPost.id)}
                  onCloseComment={() => {
                    setShowCommentInput(null);
                    setCommentText('');
                  }}
                  currentUserId={currentUserID}
                />
              ) : (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>No se pudo cargar la publicación</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center' },
  mainTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#111',
    backgroundColor: 'white',
    paddingVertical: 12,
    textAlign: 'center',
  },
  Subtitulos: {
    paddingTop: 10,
    paddingLeft: 15,
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    backgroundColor: 'white',
  },
  scrollContainer: { flex: 1 },
  section: { backgroundColor: 'white', marginBottom: 10, paddingVertical: 10 },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    justifyContent: 'space-between',
  },
  userInfoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarContainer: { marginRight: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 },
  rowTime: { fontSize: 13, color: '#666' },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  gradientButton: {
    borderRadius: 20,
    marginLeft: 10,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  followingButton: {
    backgroundColor: '#d3d3d3',
    marginLeft: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followingButtonText: { color: '#555' },
  pendingButton: {
    backgroundColor: '#e5e7eb',
    marginLeft: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pendingButtonText: {
    color: '#555',
  },
  requestButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 10,
  },
  requestButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  requestButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButtonText: {
    color: 'white',
  },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 8, fontSize: 16, color: '#666' },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 18, color: '#666', marginBottom: 8, fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#999' },
  postPreview: { fontSize: 12, color: '#888', marginTop: 2, fontStyle: 'italic' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '95%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
});
