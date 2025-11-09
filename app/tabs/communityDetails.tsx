import ModButton from '@/components/ModButton';
import PostCard from '@/components/cards/PostCard';
import { db } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

interface Comunidad {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
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

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
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
      console.error('Error cargando comunidad:', error);
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
      console.error('Error cargando publicaciones de la comunidad:', error);
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
      console.error('Error procesando publicación:', error);
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
      console.error('Error al gestionar like:', error);
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
      console.error('Error actualizando conteos:', error);
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
      console.error('Error cargando comentarios:', error);
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
        console.error('Error enviando comentario:', error);
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
      console.error('Error enviando comentario:', error);
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
      console.error('Error enviando reporte:', error);
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
      await setDoc(doc(db, 'usuarios', userId, 'comunidades', comunidad.id), payload).catch(() => {});
    } catch (error) {
      console.warn('No se pudo registrar la membresía:', error);
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
      console.error('Error al unirse a la comunidad:', error);
      Alert.alert('Error', 'No se pudo completar la operación.');
    } finally {
      setGestionando(false);
    }
  };

  const manejarSalida = async () => {
    if (!community || !usuarioID || gestionando) return;

    if (community.creadorID === usuarioID) {
      Alert.alert('Administrador', 'Como creador debes eliminar la comunidad desde la pantalla anterior.');
      return;
    }

    Alert.alert(
      'Salir de la comunidad',
      `¿Deseas salir de ${community.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            setGestionando(true);
            try {
              const comunidadRef = doc(db, 'comunidades', community.id);
              await updateDoc(comunidadRef, {
                miembros: arrayRemove(usuarioID),
              });

              await eliminarMembresiaUsuario(usuarioID, community.id);
              Alert.alert('Saliste de la comunidad', `Ya no perteneces a ${community.nombre}.`);
              await cargarDatos();
            } catch (error) {
              console.error('Error al salir de la comunidad:', error);
              Alert.alert('Error', 'No se pudo completar la operación.');
            } finally {
              setGestionando(false);
            }
          },
        },
      ]
    );
  };

  const eliminarMembresiaUsuario = async (userId: string, comunidadId: string) => {
    await deleteDoc(doc(db, 'Usuarios', userId, 'comunidades', comunidadId)).catch(() => {});
    await deleteDoc(doc(db, 'usuarios', userId, 'comunidades', comunidadId)).catch(() => {});
  };

  const handleCreatePost = () => {
    if (!community) return;
    router.push({
      pathname: './newPost',
      params: { communityId: community.id, communityName: community.nombre },
    });
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.header}>
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
            title={puedeInteractuar ? (esMiembro ? 'Salir' : 'Unirme') : 'Unirme'}
            onPress={esMiembro ? manejarSalida : manejarUnion}
            backgroundColor={esMiembro ? '#dc2626' : '#16a34a'}
            style={styles.headerButton}
          />
        </View>
      </LinearGradient>

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
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
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
  header: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  communityName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  communityDescription: {
    color: '#f1f5f9',
    fontSize: 16,
    marginBottom: 20,
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

