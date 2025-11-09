import { cancelarSolicitudSeguimiento, dejarDeSeguirUsuario, obtenerPerfilUsuario, obtenerPublicacionesPerfil, PerfilUsuario, seguirUsuario, verificarSiSigue, verificarSolicitudPendiente } from '@/api/profileService';
import PostCard from '@/components/cards/PostCard';
import ModButton from '@/components/ModButton';
import { db } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StatusBar, StyleSheet, Text, View } from 'react-native';

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
            if (!storedUsuarioID) {
                console.error('No se encontró usuarioID');
                return;
            }

            setCurrentUserID(storedUsuarioID);

            // Si es el mismo usuario, redirigir a profile
            if (storedUsuarioID === usuarioIDObjetivo) {
                router.replace('./profile');
                return;
            }

            // Obtener perfil del usuario objetivo
            const perfil = await obtenerPerfilUsuario(usuarioIDObjetivo as string);
            if (!perfil) return console.error('No se pudo cargar el perfil');
            setUserProfile(perfil);

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
        } catch (error) {
            console.error('Error cargando datos del perfil:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUserData();
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
        } catch (error) {
            console.error('Error cargando comentarios:', error);
        } finally {
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
            } catch (error) {
                console.error('Error enviando comentario:', error);
            }
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
        } catch (error) {
            console.error('Error enviando comentario:', error);
        }
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
        } catch (error) {
            console.error('Error dando like:', error);
        }
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
        } catch (error) {
            console.error('Error actualizando conteos:', error);
        }
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
        } catch (error) {
            console.error('Error manejando seguimiento:', error);
        }
    };

    const handleMessage = () => {
        console.log('Abrir chat con usuario');
    };

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
                            <Text style={styles.name}>
                                {userProfile.nombre} {userProfile.apellido}
                            </Text>
                            <Text style={styles.profession}>{userProfile.carrera || 'Sin carrera'}</Text>

                            <View style={styles.statsContainer}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statNumber}>{userProfile.seguidores}</Text>
                                    <Text style={styles.statLabel}>Seguidores</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statNumber}>{userProfile.seguidos}</Text>
                                    <Text style={styles.statLabel}>Seguidos</Text>
                                </View>
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
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
        textAlign: 'center',
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
});
