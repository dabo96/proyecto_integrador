import { cancelarSolicitudSeguimiento, dejarDeSeguirUsuario, obtenerListaSeguidos, obtenerPerfilUsuario, obtenerPublicacionesPerfil, PerfilUsuario, seguirUsuario, verificarSiSigue, verificarSolicitudPendiente } from '@/api/profileService';
import { escucharEstadoUsuario, obtenerUsuarioPorId } from '@/api/usuariosService';
import PostCard from '@/components/cards/PostCard';
import ModButton from '@/components/ModButton';
import { db } from '@/services/firebase';
import { formatShortName } from '@/utils/nameFormatter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

interface Usuario {
    id: string;
    nombre: string;
    codigo?: string;
    carrera?: string;
    correo?: string;
    fotoPerfil?: string;
}

export default function OtherProfileScreen() {
    const router = useRouter();
    const { userId: usuarioIDObjetivo } = useLocalSearchParams();
    const [currentUserID, setCurrentUserID] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<PerfilUsuario | null>(null);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'following'>('none');
    const [showCommentInput, setShowCommentInput] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [comentarios, setComentarios] = useState<{ [postId: string]: Comentario[] }>({});
    const [loadingComments, setLoadingComments] = useState<string | null>(null);
    const [likedPosts, setLikedPosts] = useState<{ [postId: string]: boolean }>({});
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [modalType, setModalType] = useState<'seguidos' | 'seguidores'>('seguidos');
    const [usersList, setUsersList] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [isUserOnline, setIsUserOnline] = useState(false);

    // Función para formatear fecha relativa
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

    // Cargar datos del usuario
    const loadUserData = async () => {
        try {
            setLoading(true);

            const storedUsuarioID = await AsyncStorage.getItem('usuarioID');
            if (!storedUsuarioID) {                return;
            }

            setCurrentUserID(storedUsuarioID);

            // Si es el mismo usuario, redirigir a profile
            if (storedUsuarioID === usuarioIDObjetivo) {
                router.replace('./profile');
                return;
            }

            // Obtener perfil del usuario objetivo
            const perfil = await obtenerPerfilUsuario(usuarioIDObjetivo as string);
            if (!perfil) return            setUserProfile(perfil);

            // Verificar si el usuario actual sigue al usuario objetivo
            const sigue = await verificarSiSigue(storedUsuarioID, usuarioIDObjetivo as string);
            if (sigue) {
                setFollowStatus('following');
            } else {
                const pendiente = await verificarSolicitudPendiente(storedUsuarioID, usuarioIDObjetivo as string);
                setFollowStatus(pendiente ? 'pending' : 'none');
            }

            // Obtener publicaciones del usuario
            const publicacionesData = await obtenerPublicacionesPerfil(usuarioIDObjetivo as string);

            // Convertir publicaciones al formato esperado por PostCard
            const posts: Post[] = publicacionesData.map((pub) => ({
                id: pub.id,
                usuarioID: pub.usuarioID,
                contenido: pub.texto,
                fechaCreacion: pub.fechaCreacion,
                imagen: pub.imagenUrl,
                autor: {
                    nombres: perfil.nombre,
                    apellidos: perfil.apellido,
                    fotoPerfil: perfil.fotoPerfil
                },
                likes: pub.likes,
                comentarios: pub.comentarios
            }));

            // Verificar likes del usuario actual
            for (const post of posts) {
                const likeQuery = query(
                    collection(db, 'interacciones'),
                    where('usuarioID', '==', storedUsuarioID),
                    where('publicacionID', '==', post.id),
                    where('tipo', '==', 'like')
                );
                const likeSnapshot = await getDocs(likeQuery);
                if (!likeSnapshot.empty) {
                    setLikedPosts(prev => ({ ...prev, [post.id]: true }));
                }
            }

            setUserPosts(posts);
        } catch (error) {        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUserData();
    }, [usuarioIDObjetivo]);

    // Escuchar estado de conexión del usuario
    useEffect(() => {
        if (!usuarioIDObjetivo) return;        
        const unsubscribe = escucharEstadoUsuario(String(usuarioIDObjetivo), (online) => {            setIsUserOnline(online);
        });

        return () => {            unsubscribe();
        };
    }, [usuarioIDObjetivo]);

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

            for (const docSnapshot of comentariosSnapshot.docs) {
                const data = docSnapshot.data();

                const usuarioRef = doc(db, 'Usuarios', data.usuarioID);
                const usuarioDoc = await getDoc(usuarioRef);

                if (usuarioDoc.exists()) {
                    const usuarioData = usuarioDoc.data() as any;
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
                            nombres: nombres,
                            apellidos: apellidos,
                            fotoPerfil: usuarioData.fotoPerfil
                        }
                    });
                }
            }

            comentariosList.sort((a, b) => {
                const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
                const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
                return fechaB.getTime() - fechaA.getTime();
            });

            setComentarios(prev => ({ ...prev, [postId]: comentariosList }));
        } catch (error) {        } finally {
            setLoadingComments(null);
        }
    };

    const handleComment = async (postId: string) => {
        if (showCommentInput === postId) {
            if (!commentText.trim()) {
                setShowCommentInput(null);
                return;
            }

            if (!currentUserID) return;

            try {
                await addDoc(collection(db, 'interacciones'), {
                    usuarioID: currentUserID,
                    publicacionID: postId,
                    tipo: 'comentario',
                    comentario: commentText.trim(),
                    fecha: new Date()
                });

                setCommentText('');
                setShowCommentInput(null);

                // Actualizar conteos
                await actualizarConteos(postId);
                await cargarComentarios(postId);
            } catch (error) {            }
        } else {
            setShowCommentInput(postId);
            await cargarComentarios(postId);
        }
    };

    const handleSendComment = async (postId: string) => {
        if (!commentText.trim()) return;
        if (!currentUserID) return;

        try {
            await addDoc(collection(db, 'interacciones'), {
                usuarioID: currentUserID,
                publicacionID: postId,
                tipo: 'comentario',
                comentario: commentText.trim(),
                fecha: new Date()
            });

            setCommentText('');
            await actualizarConteos(postId);
            await cargarComentarios(postId);
        } catch (error) {        }
    };

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

            if (likeSnapshot.empty) {
                await addDoc(collection(db, 'interacciones'), {
                    usuarioID: currentUserID,
                    publicacionID: postId,
                    tipo: 'like',
                    fecha: new Date()
                });
                setLikedPosts(prev => ({ ...prev, [postId]: true }));
                await actualizarConteos(postId);
            } else {
                const likeDoc = likeSnapshot.docs[0];
                await deleteDoc(likeDoc.ref);
                setLikedPosts(prev => ({ ...prev, [postId]: false }));
                await actualizarConteos(postId);
            }
        } catch (error) {        }
    };

    const handleViewLikes = (postId: string) => {        // Aquí luego puedes:
        // - navegar a otra pantalla
        // - abrir un modal con la lista de usuarios
        // por ahora solo dejamos el log
    };
    

    const actualizarConteos = async (postId: string) => {
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

            setUserPosts(prevPosts =>
                prevPosts.map(post =>
                    post.id === postId
                        ? { ...post, likes: likesSnapshot.size, comentarios: comentariosSnapshot.size }
                        : post
                )
            );
        } catch (error) {        }
    };

    const handleFollow = async () => {
        if (!currentUserID || !usuarioIDObjetivo) return;

        try {
            if (followStatus === 'following') {
                await dejarDeSeguirUsuario(currentUserID, usuarioIDObjetivo as string);
                setFollowStatus('none');
                await loadUserData();
            } else if (followStatus === 'pending') {
                await cancelarSolicitudSeguimiento(currentUserID, usuarioIDObjetivo as string);
                setFollowStatus('none');
            } else {
                const resultado = await seguirUsuario(currentUserID, usuarioIDObjetivo as string);
                if (resultado === 'ya_sigue') {
                    setFollowStatus('following');
                    await loadUserData();
                } else if (resultado === 'pendiente' || resultado === 'enviada') {
                    setFollowStatus('pending');
                }
            }
        } catch (error) {        }
    };

    const handleMessage = () => {    };

    const seleccionarUsuario = (usuario: Usuario) => {
        // Navegar a los detalles del chat con toda la información del usuario
        router.push({
            pathname: './chatDetails',
            params: {
                userId: usuario.id,
                name: usuario.nombre,
                codigo: usuario.codigo,
                carrera: usuario.carrera,
                correo: usuario.correo,
            }
        });
    };

  // Función para obtener lista de usuarios seguidos con datos completos
  const obtenerSeguidosCompletos = async (usuarioID: string): Promise<Usuario[]> => {
    try {
      setLoadingUsers(true);
      const seguidosIDs = await obtenerListaSeguidos(usuarioID);      
      // Usar un Map para evitar duplicados
      const usuariosUnicos = new Map<string, Usuario>();
      
      for (const seguidoID of seguidosIDs) {
        // Evitar procesar el mismo ID dos veces
        if (usuariosUnicos.has(seguidoID)) continue;
        
        const usuario = await obtenerUsuarioPorId(seguidoID);
        if (usuario) {
          usuariosUnicos.set(seguidoID, {
            id: usuario.id,
            nombre: usuario.nombreCompleto || usuario.nombre || 'Usuario',
            codigo: usuario.codigo || usuario.codigoUniversitario || undefined,
            carrera: usuario.carrera || undefined,
            correo: usuario.correo || undefined,
            fotoPerfil: usuario.fotoPerfil || undefined,
          });
        }
      }

      const usuarios = Array.from(usuariosUnicos.values());      return usuarios;
    } catch (error) {      return [];
    } finally {
      setLoadingUsers(false);
    }
  };

    // Función para obtener lista de seguidores con datos completos
    const obtenerSeguidoresCompletos = async (usuarioID: string): Promise<Usuario[]> => {
        try {
            setLoadingUsers(true);
            const todosUsuarios = await getDocs(collection(db, 'Usuarios'));
            const seguidores: Usuario[] = [];

            for (const usuarioDoc of todosUsuarios.docs) {
                const contactosRef = collection(db, 'Usuarios', usuarioDoc.id, 'contactos');
                const contactosSnapshot = await getDocs(contactosRef);

                let esSeguidor = false;
                contactosSnapshot.forEach((contactoDoc) => {
                    const data = contactoDoc.data();
                    if (data.seguidoID === usuarioID) {
                        esSeguidor = true;
                    }
                });

                if (esSeguidor) {
                    const usuario = await obtenerUsuarioPorId(usuarioDoc.id);
                    if (usuario) {
                        seguidores.push({
                            id: usuario.id,
                            nombre: usuario.nombreCompleto || usuario.nombre || 'Usuario',
                            codigo: usuario.codigo || usuario.codigoUniversitario || undefined,
                            carrera: usuario.carrera || undefined,
                            correo: usuario.correo || undefined,
                            fotoPerfil: usuario.fotoPerfil || undefined,
                        });
                    }
                }
            }

            return seguidores;
        } catch (error) {            return [];
        } finally {
            setLoadingUsers(false);
        }
    };

  // Función para abrir modal de seguidos
  const handleOpenSeguidos = async () => {
    if (!usuarioIDObjetivo) return;
    setModalType('seguidos');
    setShowUsersModal(true);
    const usuarios = await obtenerSeguidosCompletos(usuarioIDObjetivo as string);
    setUsersList(usuarios);
    // Recargar perfil para actualizar contadores
    await loadUserData();
  };

  // Función para abrir modal de seguidores
  const handleOpenSeguidores = async () => {
    if (!usuarioIDObjetivo) return;
    setModalType('seguidores');
    setShowUsersModal(true);
    const usuarios = await obtenerSeguidoresCompletos(usuarioIDObjetivo as string);
    setUsersList(usuarios);
    // Recargar perfil para actualizar contadores
    await loadUserData();
  };

    if (loading || !userProfile) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2F4AA6" />
                <Text style={styles.loadingText}>Cargando perfil...</Text>
            </View>
        );
    }

    const renderItem = ({ item }: { item: Post }) => (
        <PostCard
            post={item}
            liked={likedPosts[item.id] || false}
            onLike={handleLike}
            onComment={handleComment}
            onReport={() => { }}
            onDelete={() => { }}
            formatTime={formatRelativeTime}
            comentarios={comentarios[item.id]}
            loadingComments={loadingComments === item.id}
            showCommentInput={showCommentInput === item.id}
            commentText={commentText}
            onCommentTextChange={setCommentText}
            onSendComment={handleSendComment}
            onCloseComment={() => {
                setShowCommentInput(null);
                setCommentText('');
                const newComentarios = { ...comentarios };
                delete newComentarios[item.id];
                setComentarios(newComentarios);
            }}
            currentUserId={currentUserID}
        />
    );

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#2F4AA6" barStyle="light-content" />

            <FlatList
                data={userPosts}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <>
                        <LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.header}>
                            <Image
                                source={
                                    userProfile.fotoPerfil
                                        ? { uri: userProfile.fotoPerfil }
                                        : require('@/assets/images/react-logo.png')
                                }
                                style={styles.avatar}
                            />
                            <View style={styles.nameContainer}>
                                <Text style={styles.name}>
                                    {formatShortName({
                                      nombre: userProfile.nombre,
                                      apellido: userProfile.apellido,
                                      nombres: userProfile.nombre,
                                      apellidos: userProfile.apellido
                                    })}
                                </Text>
                                <View style={styles.statusContainer}>
                                    <View style={[
                                        styles.statusDot,
                                        isUserOnline ? styles.statusDotOnline : styles.statusDotOffline
                                    ]} />
                                    <Text style={[
                                        styles.statusText,
                                        isUserOnline ? styles.statusTextOnline : styles.statusTextOffline
                                    ]}>
                                        {isUserOnline ? "en línea" : "desactivado"}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.profession}>{userProfile.carrera || 'Sin carrera'}</Text>

                            <View style={styles.statsContainer}>
                                <TouchableOpacity 
                                    style={styles.statBox}
                                    onPress={handleOpenSeguidores}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.statNumber}>{userProfile.seguidores}</Text>
                                    <Text style={styles.statLabel}>Seguidores</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.statBox}
                                    onPress={handleOpenSeguidos}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.statNumber}>{userProfile.seguidos}</Text>
                                    <Text style={styles.statLabel}>Seguidos</Text>
                                </TouchableOpacity>
                                <View style={styles.statBox}>
                                    <Text style={styles.statNumber}>{userProfile.totalPublicaciones}</Text>
                                    <Text style={styles.statLabel}>Publicaciones</Text>
                                </View>
                            </View>

                            <View style={styles.buttonsContainer}>
                                <ModButton
                                    title={
                                        followStatus === 'following'
                                            ? 'Dejar de seguir'
                                            : followStatus === 'pending'
                                                ? 'Cancelar solicitud'
                                                : 'Seguir'
                                    }
                                    onPress={handleFollow}
                                    iconName="user-plus"
                                    iconLib="Feather"
                                    backgroundColor={
                                        followStatus === 'following'
                                            ? "#e74c3c"
                                            : followStatus === 'pending'
                                                ? "#9ca3af"
                                                : "#2563eb"
                                    }
                                    style={styles.button}
                                />
                                <ModButton
                                    title="Mensaje"
                                    onPress={() => seleccionarUsuario({
                                        id: usuarioIDObjetivo as string,
                                        nombre: userProfile.nombre + ' ' + userProfile.apellido,
                                        codigo: userProfile.codigo,
                                        carrera: userProfile.carrera,
                                        correo: userProfile.correo
                                    })}
                                    iconName="message-plus-outline"
                                    iconLib="MaterialCommunityIcons"
                                    backgroundColor="#1d4ed8"
                                    style={styles.button}
                                />

                            </View>
                        </LinearGradient>
                    </>
                } contentContainerStyle={styles.scrollContent} />

            {/* Modal de lista de usuarios */}
            <Modal
                visible={showUsersModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowUsersModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {modalType === 'seguidos' ? 'Seguidos' : 'Seguidores'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowUsersModal(false)}
                                style={styles.closeButton}
                            >
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingUsers ? (
                            <View style={styles.modalLoadingContainer}>
                                <ActivityIndicator size="large" color="#2F4AA6" />
                                <Text style={styles.modalLoadingText}>Cargando...</Text>
                            </View>
                        ) : usersList.length === 0 ? (
                            <View style={styles.modalEmptyContainer}>
                                <Text style={styles.modalEmptyText}>
                                    {modalType === 'seguidos' 
                                        ? 'Este usuario no sigue a nadie' 
                                        : 'Este usuario no tiene seguidores'}
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={usersList}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.userItem}
                                        onPress={() => {
                                            setShowUsersModal(false);
                                            if (item.id === currentUserID) {
                                                router.push('./profile');
                                            } else {
                                                router.push({
                                                    pathname: './otherProfile',
                                                    params: { userId: item.id }
                                                });
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Image
                                            source={
                                                item.fotoPerfil
                                                    ? { uri: item.fotoPerfil }
                                                    : require('@/assets/images/react-logo.png')
                                            }
                                            style={styles.userAvatar}
                                        />
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>{item.nombre}</Text>
                                            {item.carrera && (
                                                <Text style={styles.userCarrera}>{item.carrera}</Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                )}
                                style={styles.modalList}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    header: {
        paddingBottom: 20,
        paddingTop: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 60,
        borderBottomRightRadius: 60,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: 'white',
        marginBottom: 15,
    },
    nameContainer: {
        alignItems: 'center',
        marginBottom: 5,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
        textAlign: 'center',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    statusDotOnline: {
        backgroundColor: '#22c55e',
    },
    statusDotOffline: {
        backgroundColor: '#ef4444',
    },
    statusText: {
        fontSize: 13,
        fontWeight: '500',
    },
    statusTextOnline: {
        color: '#22c55e',
    },
    statusTextOffline: {
        color: '#ef4444',
    },
    profession: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 20,
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 25,
        justifyContent: 'center',
    },
    statBox: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    statNumber: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    statLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 15,
        paddingHorizontal: 20,
    },
    button: {
        flex: 1,
        maxWidth: 150,
    },
    scrollContent: {
        paddingBottom: 40,
        backgroundColor: '#fff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        width: '90%',
        maxHeight: '80%',
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
    modalLoadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    modalLoadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    modalEmptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    modalEmptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    modalList: {
        flex: 1,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    userCarrera: {
        fontSize: 14,
        color: '#666',
    },
});
