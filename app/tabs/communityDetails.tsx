import ModButton from '@/components/ModButton';
import PostCard from '@/components/cards/PostCard';
import { db } from '@/services/firebase';
import { validarYSubirImagen } from '@/services/imageModerationClient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Comunidad {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  fotoPortada?: string;
  creadorID: string;
  miembros: string[];
}

interface Post {
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
}

interface Comentario {
  id: string;
  usuarioID: string;
  comentario: string;
  fecha: any;
  autor: {
    nombres: string;
    apellidos: string;
    fotoPerfil?: string;
  };
}

const formatRelativeTime = (timestamp: any) => {
  if (!timestamp) return 'Hace un momento';

  const now = new Date();
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Hace un momento';
  if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
  return date.toLocaleDateString();
};

const CommunityDetails = () => {
  const { communityId } = useLocalSearchParams<{ communityId?: string }>();
  const router = useRouter();

  const [community, setCommunity] = useState<Comunidad | null>(null);
  const [usuarioID, setUsuarioID] = useState<string | null>(null);
  const [esMiembro, setEsMiembro] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [gestionando, setGestionando] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [comentarios, setComentarios] = useState<Record<string, Comentario[]>>({});
  const [showCommentInput, setShowCommentInput] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState<string | null>(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [reportMotivo, setReportMotivo] = useState('');
  const [reportDetalle, setReportDetalle] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showLeaveSuccessModal, setShowLeaveSuccessModal] = useState(false);
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
      
      // Escuchar cambios en la comunidad en tiempo real (para actualizar foto de portada)
      if (!communityId || typeof communityId !== 'string') return;

      const comunidadRef = doc(db, 'comunidades', communityId);
      const unsubscribe = onSnapshot(comunidadRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setCommunity((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              fotoPortada: data.fotoPortada || data.coverImage || data.imagenUrl || null,
            };
          });
        }
      }, (error) => {
        console.error('Error escuchando cambios en la comunidad:', error);
      });

      return () => unsubscribe();
    }, [communityId])
  );

  const cargarDatos = async () => {
    if (!communityId || typeof communityId !== 'string') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const storedUsuarioID = await AsyncStorage.getItem('usuarioID');
      setUsuarioID(storedUsuarioID);

      const comunidadSnap = await getDoc(doc(db, 'comunidades', communityId));
      if (comunidadSnap.exists()) {
        const data = comunidadSnap.data() || {};
        const comunidad: Comunidad = {
          id: communityId,
          nombre: data.nombre,
          descripcion: data.descripcion,
          imagen: data.imagenUrl || 'https://picsum.photos/200/200',
          fotoPortada: data.fotoPortada || data.coverImage || data.imagenUrl || null,
          creadorID: data.creadorID,
          miembros: data.miembros || [],
        };
        setCommunity(comunidad);
        if (storedUsuarioID) {
          setEsMiembro(comunidad.miembros.includes(storedUsuarioID));
        }
      }

      await cargarPublicaciones(storedUsuarioID, communityId);
    } catch (error) {
      // console.error('Error cargando comunidad:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la comunidad.');
    } finally {
      setLoading(false);
    }
  };

  const cargarPublicaciones = async (userId: string | null, comunidadId: string) => {
    try {
      const publicacionesRef = collection(db, 'publicaciones');
      const q = query(
        publicacionesRef,
        where('comunidadID', '==', comunidadId),
        where('estado', '==', 'activo')
      );
      const snapshot = await getDocs(q);

      const publicacionesProcesadas: Post[] = [];
      const nuevosLikes: Record<string, boolean> = {};

      for (const docSnapshot of snapshot.docs) {
        const post = await procesarPublicacion(docSnapshot, userId);
        if (post) {
          publicacionesProcesadas.push(post);
          if (userId) {
            const likeQuery = query(
              collection(db, 'interacciones'),
              where('usuarioID', '==', userId),
              where('publicacionID', '==', post.id),
              where('tipo', '==', 'like')
            );
            const likeSnapshot = await getDocs(likeQuery);
            if (!likeSnapshot.empty) {
              nuevosLikes[post.id] = true;
            }
          }
        }
      }

      publicacionesProcesadas.sort((a, b) => {
        const fechaA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaCreacion);
        const fechaB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaCreacion);
        return fechaB.getTime() - fechaA.getTime();
      });

      setPosts(publicacionesProcesadas);
      setLikedPosts(nuevosLikes);
    } catch (error) {
      // console.error('Error cargando publicaciones de la comunidad:', error);
      Alert.alert('Error', 'No se pudieron cargar las publicaciones.');
    }
  };

  const procesarPublicacion = async (docSnapshot: any, userId: string | null): Promise<Post | null> => {
    try {
      const data = docSnapshot.data();
      const usuarioRef = doc(db, 'Usuarios', data.usuarioID);
      const usuarioDoc = await getDoc(usuarioRef);

      if (!usuarioDoc.exists()) return null;

      const usuarioData = usuarioDoc.data() || {};
      const nombreFuente = usuarioData.nombreCompleto || usuarioData.nombre || '';
      const partesNombre = nombreFuente.trim().split(' ');
      const nombresAutor = usuarioData.nombres || partesNombre[0] || '';
      const apellidosAutor = usuarioData.apellidos || partesNombre.slice(1).join(' ') || '';

      const likesQuery = query(
        collection(db, 'interacciones'),
        where('publicacionID', '==', docSnapshot.id),
        where('tipo', '==', 'like')
      );
      const likesSnapshot = await getDocs(likesQuery);

      const comentariosQuery = query(
        collection(db, 'interacciones'),
        where('publicacionID', '==', docSnapshot.id),
        where('tipo', '==', 'comentario')
      );
      const comentariosSnapshot = await getDocs(comentariosQuery);

      return {
        id: docSnapshot.id,
        usuarioID: data.usuarioID,
        contenido: data.texto,
        fechaCreacion: data.fechaCreacion,
        imagen: data.imagenUrl,
        autor: {
          nombres: nombresAutor,
          apellidos: apellidosAutor,
          fotoPerfil: usuarioData.fotoPerfil,
        },
        likes: likesSnapshot.size,
        comentarios: comentariosSnapshot.size,
      };
    } catch (error) {
      // console.error('Error procesando publicación:', error);
      return null;
    }
  };

  const handleLike = async (postId: string) => {
    if (!usuarioID) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para interactuar.');
      return;
    }

    try {
      const likeQuery = query(
        collection(db, 'interacciones'),
        where('usuarioID', '==', usuarioID),
        where('publicacionID', '==', postId),
        where('tipo', '==', 'like')
      );
      const likeSnapshot = await getDocs(likeQuery);

      if (likeSnapshot.empty) {
        await addDoc(collection(db, 'interacciones'), {
          usuarioID: usuarioID,
          publicacionID: postId,
          tipo: 'like',
          fecha: new Date(),
        });
        setLikedPosts((prev) => ({ ...prev, [postId]: true }));
      } else {
        await deleteDoc(likeSnapshot.docs[0].ref);
        setLikedPosts((prev) => {
          const updated = { ...prev };
          delete updated[postId];
          return updated;
        });
      }

      await actualizarConteosPublicacion(postId);
    } catch (error) {
      // console.error('Error al gestionar like:', error);
    }
  };

  const actualizarConteosPublicacion = async (postId: string) => {
    try {
      const likesQuery = query(
        collection(db, 'interacciones'),
        where('publicacionID', '==', postId),
        where('tipo', '==', 'like')
      );
      const likesSnapshot = await getDocs(likesQuery);

      const comentariosQuery = query(
        collection(db, 'interacciones'),
        where('publicacionID', '==', postId),
        where('tipo', '==', 'comentario')
      );
      const comentariosSnapshot = await getDocs(comentariosQuery);

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, likes: likesSnapshot.size, comentarios: comentariosSnapshot.size }
            : post
        )
      );
    } catch (error) {
      // console.error('Error actualizando conteos:', error);
    }
  };

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

      for (const docSnapshot of comentariosSnapshot.docs) {
        const data = docSnapshot.data();
        const usuarioRef = doc(db, 'Usuarios', data.usuarioID);
        const usuarioDoc = await getDoc(usuarioRef);

        if (usuarioDoc.exists()) {
          const usuarioData = usuarioDoc.data() || {};
          const nombreFuente = usuarioData.nombreCompleto || usuarioData.nombre || '';
          const partesNombre = nombreFuente.trim().split(' ');
          const nombres = usuarioData.nombres || partesNombre[0] || '';
          const apellidos = usuarioData.apellidos || partesNombre.slice(1).join(' ') || '';

          comentariosList.push({
            id: docSnapshot.id,
            usuarioID: data.usuarioID,
            comentario: data.comentario,
            fecha: data.fecha,
            autor: {
              nombres,
              apellidos,
              fotoPerfil: usuarioData.fotoPerfil,
            },
          });
        }
      }

      comentariosList.sort((a, b) => {
        const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return fechaB.getTime() - fechaA.getTime();
      });

      setComentarios((prev) => ({ ...prev, [postId]: comentariosList }));
    } catch (error) {
      // console.error('Error cargando comentarios:', error);
    } finally {
      setLoadingComments(null);
    }
  };

  const handleComment = async (postId: string) => {
    if (!usuarioID) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para comentar.');
      return;
    }

    if (showCommentInput === postId) {
      if (!commentText.trim()) {
        setShowCommentInput(null);
        return;
      }

      try {
        await addDoc(collection(db, 'interacciones'), {
          usuarioID,
          publicacionID: postId,
          tipo: 'comentario',
          comentario: commentText.trim(),
          fecha: new Date(),
        });

        setCommentText('');
        setShowCommentInput(null);
        await actualizarConteosPublicacion(postId);
        await cargarComentarios(postId);
      } catch (error) {
        // console.error('Error enviando comentario:', error);
      }
    } else {
      setShowCommentInput(postId);
      await cargarComentarios(postId);
    }
  };

  const handleSendComment = async (postId: string) => {
    if (!commentText.trim() || !usuarioID) return;

    try {
      await addDoc(collection(db, 'interacciones'), {
        usuarioID,
        publicacionID: postId,
        tipo: 'comentario',
        comentario: commentText.trim(),
        fecha: new Date(),
      });

      setCommentText('');
      await actualizarConteosPublicacion(postId);
      await cargarComentarios(postId);
    } catch (error) {
      // console.error('Error enviando comentario:', error);
    }
  };

  const manejarReporte = async () => {
    if (!usuarioID || !selectedPostId) return;

    if (!reportMotivo.trim()) {
      Alert.alert('Falta motivo', 'Selecciona un motivo para el reporte.');
      return;
    }

    if (!reportDetalle.trim()) {
      Alert.alert('Faltan detalles', 'Describe brevemente el motivo del reporte.');
      return;
    }

    try {
      const reportesRef = collection(db, 'publicaciones', selectedPostId, 'reportes');
      await addDoc(reportesRef, {
        reportanteID: usuarioID,
        motivo: reportMotivo,
        detalle: reportDetalle,
        fechaReporte: new Date(),
        estado: 'activo',
      });

      Alert.alert('Reporte enviado', 'El equipo de moderación revisará la publicación.');
      setShowReportModal(false);
      setReportMotivo('');
      setReportDetalle('');
      setSelectedPostId('');
    } catch (error) {
      // console.error('Error enviando reporte:', error);
      Alert.alert('Error', 'No se pudo enviar el reporte. Inténtalo más tarde.');
    }
  };

  const handleReport = (postId: string) => {
    setSelectedPostId(postId);
    setShowReportModal(true);
  };

  const registrarMembresiaUsuario = async (userId: string, comunidad: Comunidad, rol: 'admin' | 'miembro') => {
    try {
      const payload = {
        comunidadID: comunidad.id,
        nombre: comunidad.nombre,
        descripcion: comunidad.descripcion,
        rol,
        fechaUnion: serverTimestamp(),
      };

      await setDoc(doc(db, 'Usuarios', userId, 'comunidades', comunidad.id), payload);
      await setDoc(doc(db, 'usuarios', userId, 'comunidades', comunidad.id), payload).catch(() => { });
    } catch (error) {
      // console.warn('No se pudo registrar la membresía:', error);
    }
  };

  const manejarUnion = async () => {
    if (!community || !usuarioID || gestionando) return;

    setGestionando(true);
    try {
      const comunidadRef = doc(db, 'comunidades', community.id);
      await updateDoc(comunidadRef, {
        miembros: arrayUnion(usuarioID),
      });

      await registrarMembresiaUsuario(
        usuarioID,
        community,
        usuarioID === community.creadorID ? 'admin' : 'miembro'
      );

      Alert.alert('¡Listo!', `Ahora eres parte de ${community.nombre}.`);
      await cargarDatos();
    } catch (error) {
      // console.error('Error al unirse a la comunidad:', error);
      Alert.alert('Error', 'No se pudo completar la operación.');
    } finally {
      setGestionando(false);
    }
  };

  const manejarSalida = () => {
    // console.log('🚪🚪🚪 manejarSalida INICIADO 🚪🚪🚪');
    // console.log('🚪 manejarSalida llamado', { 
    //   hasCommunity: !!community, 
    //   hasUsuarioID: !!usuarioID, 
    //   gestionando,
    //   esCreador: community?.creadorID === usuarioID,
    //   communityId: community?.id,
    //   communityName: community?.nombre
    // });

    // Verificar condiciones y mostrar mensajes apropiados
    if (!community) {
      // console.error('❌ No hay comunidad cargada - RETORNANDO');
      Alert.alert('Error', 'No se pudo cargar la información de la comunidad. Intenta nuevamente.');
      return;
    }
    // console.log('✅ Comunidad verificada');

    if (!usuarioID) {
      // console.error('❌ No hay usuarioID - RETORNANDO');
      Alert.alert('Sesión expirada', 'Inicia sesión nuevamente para gestionar comunidades.');
      return;
    }
    // console.log('✅ UsuarioID verificado');

    if (gestionando) {
      // console.log('⚠️ Ya se está procesando una operación - RETORNANDO');
      Alert.alert('Espera', 'Ya se está procesando una operación. Por favor espera.');
      return;
    }
    // console.log('✅ No hay operación en curso');

    if (community.creadorID === usuarioID) {
      // console.log('⚠️ Usuario es creador - RETORNANDO');
      Alert.alert('Administrador', 'Como creador debes eliminar la comunidad desde la pantalla anterior.');
      return;
    }
    // console.log('✅ Usuario no es creador');

    // Mostrar confirmación usando modal (funciona mejor en web)
    // console.log('📢 Mostrando modal de confirmación...');
    setShowLeaveModal(true);
    // console.log('✅ Modal de confirmación activado');
  };

  const eliminarMembresiaUsuario = async (userId: string, comunidadId: string) => {
    try {
      // Intentar eliminar de ambas posibles rutas (mayúsculas y minúsculas)
      const path1 = doc(db, 'Usuarios', userId, 'comunidades', comunidadId);
      const path2 = doc(db, 'usuarios', userId, 'comunidades', comunidadId);

      await Promise.all([
        deleteDoc(path1).catch((err) => {
          // console.log('⚠️ No se encontró membresía en Usuarios (mayúscula):', err.message);
        }),
        deleteDoc(path2).catch((err) => {
          // console.log('⚠️ No se encontró membresía en usuarios (minúscula):', err.message);
        })
      ]);

      // console.log('✅ Membresía eliminada correctamente');
    } catch (error) {
      // console.error('❌ Error eliminando membresía:', error);
      throw error;
    }
  };

  const confirmarSalida = async () => {
    if (!community || !usuarioID) return;

    // console.log('🎯🎯🎯 confirmarSalida EJECUTADO 🎯🎯🎯');
    // console.log('✅✅✅ Usuario confirmó la salida ✅✅✅');

    setShowLeaveModal(false);
    setGestionando(true);

    try {
      // console.log('🔒 Estableciendo gestionando = true');
      // console.log('✅ gestionando establecido');

      // console.log('📤 Removiendo usuario de la comunidad...');
      // console.log('📋 Datos:', { communityId: community.id, usuarioID });
      const comunidadRef = doc(db, 'comunidades', community.id);

      // console.log('📝 Ejecutando updateDoc...');
      await updateDoc(comunidadRef, {
        miembros: arrayRemove(usuarioID),
      });
      // console.log('✅ Usuario removido del array de miembros');

      // console.log('🗑️ Eliminando membresía del usuario...');
      await eliminarMembresiaUsuario(usuarioID, community.id);
      // console.log('✅ Membresía eliminada');

      // console.log('🔄 Recargando datos...');
      // Recargar datos inmediatamente
      await cargarDatos();
      // console.log('✅ Datos recargados');

      // console.log('📢 Mostrando modal de éxito...');
      setShowLeaveSuccessModal(true);
      // console.log('✅ Modal de éxito activado');
    } catch (error: any) {
      // console.error('❌❌❌ Error al salir de la comunidad ❌❌❌');
      // console.error('Error completo:', error);
      // console.error('Tipo de error:', typeof error);
      // console.error('Error es instancia de Error:', error instanceof Error);
      // console.error('Detalles del error:', {
      //   code: error?.code,
      //   message: error?.message,
      //   name: error?.name,
      //   stack: error?.stack
      // });
      Alert.alert(
        'Error',
        `No se pudo completar la operación.\n\n${error?.message || 'Error desconocido'}`
      );
    } finally {
      setGestionando(false);
    }
  };

  const performDeleteCommunity = async () => {
    if (!community || !usuarioID) return;

    setGestionando(true);
    try {
      // 1. Eliminar interacciones y publicaciones (Best effort)
      try {
        const publicacionesRef = collection(db, 'publicaciones');
        const publicacionesSnapshot = await getDocs(
          query(publicacionesRef, where('comunidadID', '==', community.id))
        );

        const interaccionesRef = collection(db, 'interacciones');

        // Eliminar interacciones de cada publicación
        for (const publicacionDoc of publicacionesSnapshot.docs) {
          const interaccionesSnapshot = await getDocs(
            query(interaccionesRef, where('publicacionID', '==', publicacionDoc.id))
          );
          await Promise.all(
            interaccionesSnapshot.docs.map((doc) => deleteDoc(doc.ref))
          );
        }

        // Eliminar publicaciones
        await Promise.all(
          publicacionesSnapshot.docs.map((doc) => deleteDoc(doc.ref))
        );
      } catch (e) {
        // console.warn('Error limpiando publicaciones:', e);
      }

      // 2. Eliminar membresías (Best effort)
      try {
        await Promise.all(
          (community.miembros || []).map((miembroId) => eliminarMembresiaUsuario(miembroId, community.id))
        );
      } catch (e) {
        // console.warn('Error limpiando membresías:', e);
      }

      // 3. Eliminar la comunidad (Critical)
      await deleteDoc(doc(db, 'comunidades', community.id));

      Alert.alert('Comunidad eliminada', `${community.nombre} fue eliminada correctamente.`);
      router.back();
    } catch (error) {
      Alert.alert('Error', `No pudimos eliminar la comunidad. ${error instanceof Error ? error.message : 'Inténtalo nuevamente.'}`);
    } finally {
      setGestionando(false);
    }
  };

  const handleDeleteCommunity = () => {
    Alert.alert(
      'Eliminar comunidad',
      `¿Seguro que deseas eliminar ${community?.nombre}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: performDeleteCommunity,
        },
      ]
    );
  };

  const handleCreatePost = () => {
    if (!community) return;
    router.push({
      pathname: './newPost',
      params: { communityId: community.id, communityName: community.nombre },
    });
  };

  // Función para cambiar la foto de portada
  const cambiarFotoPortada = async (source: 'camera' | 'library') => {
    if (!community || !usuarioID || community.creadorID !== usuarioID) {
      Alert.alert('Error', 'Solo el creador de la comunidad puede cambiar la foto de portada.');
      return;
    }

    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para tomar fotos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para seleccionar imágenes.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setUploadingCoverImage(true);
        const imageUri = result.assets[0].uri;

        try {
          // Validar y subir imagen
          const validacionResult = await validarYSubirImagen(
            imageUri,
            usuarioID
          );

          if (!validacionResult.success) {
            setUploadingCoverImage(false);
            Alert.alert(
              'Error',
              validacionResult.error || 'Contenido inapropiado detectado.'
            );
            return;
          }

          const downloadURL = validacionResult.url!;

          // Actualizar la comunidad en Firestore
          const comunidadRef = doc(db, 'comunidades', community.id);
          await updateDoc(comunidadRef, {
            fotoPortada: downloadURL,
          });

          // Actualizar el estado local
          setCommunity({
            ...community,
            fotoPortada: downloadURL,
          });

          setUploadingCoverImage(false);
          Alert.alert('Éxito', 'Foto de portada actualizada correctamente.');
        } catch (error) {
          console.error('Error subiendo imagen:', error);
          setUploadingCoverImage(false);
          Alert.alert('Error', 'No se pudo subir la imagen. Intenta nuevamente.');
        }
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

  const mostrarOpcionesFotoPortada = () => {
    if (!community || !usuarioID || community.creadorID !== usuarioID) {
      return;
    }

    Alert.alert(
      'Cambiar foto de portada',
      'Selecciona una opción',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tomar foto', onPress: () => cambiarFotoPortada('camera') },
        { text: 'Elegir de galería', onPress: () => cambiarFotoPortada('library') },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F4AA6" />
        <Text style={styles.loadingText}>Cargando comunidad...</Text>
      </View>
    );
  }

  if (!community) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No se encontró la comunidad solicitada.</Text>
      </View>
    );
  }

  const puedeInteractuar = esMiembro || community.creadorID === usuarioID;
  const esCreador = Boolean(usuarioID && community.creadorID && String(community.creadorID) === String(usuarioID));

  return (
    <View style={styles.container}>
      {/* Foto de portada */}
      <View style={styles.coverImageContainer}>
        {(community.fotoPortada && community.fotoPortada.trim() !== '') || (community.imagen && community.imagen.trim() !== '') ? (
          <Image
            source={{ uri: community.fotoPortada || community.imagen }}
            style={styles.coverImage}
            resizeMode="cover"
            onError={(error) => {
              console.error('Error cargando foto de portada:', error);
            }}
          />
        ) : (
          <LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.coverImageGradient} />
        )}
        {uploadingCoverImage && (
          <View style={styles.coverImageOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        {esCreador && !uploadingCoverImage && (
          <TouchableOpacity
            style={styles.coverImageEditButton}
            onPress={mostrarOpcionesFotoPortada}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.coverImageEditText}>Cambiar portada</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Header con información */}
      <View style={styles.headerContent}>
        <Text style={styles.communityName}>{community.nombre}</Text>
        <Text style={styles.communityDescription}>{community.descripcion}</Text>
        <View style={styles.headerButtons}>
          <ModButton
            title="Crear publicación"
            onPress={handleCreatePost}
            backgroundColor="#1d4ed8"
            style={styles.headerButton}
          />
          <ModButton
            title={puedeInteractuar ? (community.creadorID === usuarioID ? 'Eliminar' : (esMiembro ? 'Salir' : 'Unirme')) : 'Unirme'}
            onPress={() => {
              if (community.creadorID === usuarioID) {
                handleDeleteCommunity();
              } else if (esMiembro) {
                manejarSalida();
              } else {
                manejarUnion();
              }
            }}
            backgroundColor={community.creadorID === usuarioID ? '#dc2626' : (esMiembro ? '#dc2626' : '#16a34a')}
            style={styles.headerButton}
            disabled={gestionando}
          />
        </View>
      </View>

      {!puedeInteractuar && (
        <View style={styles.noticeContainer}>
          <Text style={styles.noticeText}>
            Únete a la comunidad para comentar y reaccionar en las publicaciones.
          </Text>
        </View>
      )}

      <ScrollView style={styles.postsContainer} showsVerticalScrollIndicator={false}>
        {posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin publicaciones</Text>
            <Text style={styles.emptySubtitle}>Sé el primero en publicar algo en esta comunidad.</Text>
          </View>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={likedPosts[post.id] || false}
              onLike={() => (puedeInteractuar ? handleLike(post.id) : Alert.alert('Únete', 'Debes unirte para reaccionar.'))}
              onComment={() => (puedeInteractuar ? handleComment(post.id) : Alert.alert('Únete', 'Debes unirte para comentar.'))}
              onReport={() => handleReport(post.id)}
              formatTime={formatRelativeTime}
              comentarios={comentarios[post.id]}
              loadingComments={loadingComments === post.id}
              showCommentInput={showCommentInput === post.id}
              commentText={commentText}
              onCommentTextChange={setCommentText}
              onSendComment={puedeInteractuar ? handleSendComment : undefined}
              onCloseComment={() => {
                setShowCommentInput(null);
                setCommentText('');
                setComentarios((prev) => {
                  const updated = { ...prev };
                  delete updated[post.id];
                  return updated;
                });
              }}
              currentUserId={usuarioID || undefined}
            />
          ))
        )}
      </ScrollView>

      {/* Modal de confirmación para salir de la comunidad */}
      <Modal
        visible={showLeaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Salir de la comunidad</Text>
            <Text style={styles.modalDescription}>
              ¿Deseas salir de {community?.nombre}?
            </Text>
            <View style={styles.modalActions}>
              <ModButton
                title="Cancelar"
                onPress={() => {
                  // console.log('❌ Usuario canceló la salida');
                  setShowLeaveModal(false);
                }}
                backgroundColor="#9ca3af"
                style={styles.modalActionButton}
              />
              <ModButton
                title="Salir"
                onPress={confirmarSalida}
                backgroundColor="#dc2626"
                style={styles.modalActionButton}
                disabled={gestionando}
              />
            </View>
            {gestionando && (
              <View style={{ marginTop: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#dc2626" />
                <Text style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>
                  Procesando...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de éxito al salir */}
      <Modal
        visible={showLeaveSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowLeaveSuccessModal(false);
          router.back();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Saliste de la comunidad</Text>
            <Text style={styles.modalDescription}>
              Ya no perteneces a {community?.nombre}.
            </Text>
            <View style={styles.modalActions}>
              <ModButton
                title="OK"
                onPress={() => {
                  // console.log('✅ Usuario salió de la comunidad - Proceso completado');
                  setShowLeaveSuccessModal(false);
                  router.back();
                }}
                backgroundColor="#16a34a"
                style={styles.modalActionButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
        accessibilityViewIsModal={true}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <View style={styles.modalContainer} accessibilityViewIsModal={true}>
            <Text style={styles.modalTitle}>Reportar publicación</Text>
            <Text style={styles.modalDescription}>
              Describe la razón por la cual deseas reportar esta publicación.
            </Text>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Motivo</Text>
              {['Spam', 'Contenido ofensivo', 'Información falsa', 'Acoso', 'Otro'].map((motivo) => (
                <ModButton
                  key={motivo}
                  title={motivo}
                  onPress={() => setReportMotivo(motivo)}
                  backgroundColor={reportMotivo === motivo ? '#2563eb' : '#e5e7eb'}
                  textColor={reportMotivo === motivo ? '#fff' : '#111827'}
                  style={styles.modalButton}
                />
              ))}
            </View>

            <Text style={styles.modalLabel}>Detalles adicionales</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Describe brevemente lo ocurrido..."
              placeholderTextColor="#929292"
              value={reportDetalle}
              onChangeText={setReportDetalle}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <ModButton
                title="Cancelar"
                onPress={() => setShowReportModal(false)}
                backgroundColor="#9ca3af"
                style={styles.modalActionButton}
              />
              <ModButton
                title="Enviar reporte"
                onPress={manejarReporte}
                backgroundColor="#dc2626"
                style={styles.modalActionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  coverImageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
    backgroundColor: '#2F4AA6',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImageGradient: {
    width: '100%',
    height: '100%',
  },
  coverImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageEditButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  coverImageEditText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerContent: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginTop: -40,
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  communityName: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  communityDescription: {
    color: '#4b5563',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    flex: 1,
    borderRadius: 16,
  },
  noticeContainer: {
    backgroundColor: '#fef3c7',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
  },
  noticeText: {
    color: '#92400e',
    fontSize: 14,
  },
  postsContainer: {
    flex: 1,
    marginTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalDescription: {
    fontSize: 14,
    color: '#4b5563',
  },
  modalSection: {
    gap: 8,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  modalButton: {
    borderRadius: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalActionButton: {
    flex: 1,
    borderRadius: 12,
  },
});

export default CommunityDetails;

