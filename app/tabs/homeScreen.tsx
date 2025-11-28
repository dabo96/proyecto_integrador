import { actualizarEstadoOnline } from '@/api/usuariosService';
import IconButton from '@/components/IconButton';
import ImageButton from '@/components/ImageButton';
import PostCard from '@/components/cards/PostCard';
import { db } from '@/services/firebase';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
    nombres: string;
    apellidos: string;
    fotoPerfil?: string;
    usuarioID: string;
}

export default function MainPageScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ publicacionID?: string }>();
    const scrollViewRef = useRef<ScrollView>(null);
    const postRefs = useRef<{ [key: string]: number }>({});

    // Estados
    const [usuarioID, setUsuarioID] = useState<string>('');
    const [usuarioNombre, setUsuarioNombre] = useState<string>('');
    const [usuarioFotoPerfil, setUsuarioFotoPerfil] = useState<string | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [showCommentInput, setShowCommentInput] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [seguidoIDs, setSeguidoIDs] = useState<string[]>([]);
    const [seguidorIDs, setSeguidorIDs] = useState<string[]>([]);
    const [comentarios, setComentarios] = useState<{ [postId: string]: Comentario[] }>({});
    const [loadingComments, setLoadingComments] = useState<string | null>(null);
    const [likedPosts, setLikedPosts] = useState<{ [postId: string]: boolean }>({});
    const [searchText, setSearchText] = useState<string>('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
    const [showReportModal, setShowReportModal] = useState<boolean>(false);
    const [selectedPostId, setSelectedPostId] = useState<string>('');
    const [reportMotivo, setReportMotivo] = useState<string>('');
    const [reportDetalle, setReportDetalle] = useState<string>('');
    const [likesModalVisible, setLikesModalVisible] = useState(false);
    const [likesList, setLikesList] = useState<Usuario[]>([]);
    const [loadingLikes, setLoadingLikes] = useState(false);

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

    // Función para buscar usuarios
    const buscarUsuarios = async (texto: string) => {
        if (!texto.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        try {
            console.log('Buscando usuarios con texto:', texto);
            const usuariosRef = collection(db, 'Usuarios');
            const usuariosSnapshot = await getDocs(usuariosRef);
            const resultados: Usuario[] = [];

            console.log('Total de documentos en Usuarios:', usuariosSnapshot.size);

            usuariosSnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Documento encontrado - TODOS los campos:', {
                    id: doc.id,
                    allData: data,
                    keys: Object.keys(data)
                });

                // Usar el campo "nombre" que contiene el nombre completo
                const nombreOrigen = data.nombreCompleto || data.nombre || [data.nombres, data.apellidos].filter(Boolean).join(' ');
                const nombreCompleto = String(nombreOrigen || '').trim().toLowerCase();
                const textoBusqueda = texto.trim().toLowerCase();

                console.log('Comparando:', {
                    nombreCompleto,
                    textoBusqueda
                });

                // Buscar si el texto está en el nombre completo
                const coincideNombre = nombreCompleto.includes(textoBusqueda);

                console.log('Coincidencia:', { coincideNombre });

                if (coincideNombre) {
                    console.log('✓ Coincidencia encontrada:', data.nombre);

                    // Dividir el nombre completo para separar nombres y apellidos
                    const partesNombre = (nombreOrigen || '').trim().split(' ');
                    const nombres = data.nombres || partesNombre[0] || '';
                    const apellidos = data.apellidos || partesNombre.slice(1).join(' ') || '';

                    resultados.push({
                        id: doc.id,
                        usuarioID: doc.id,
                        nombres,
                        apellidos,
                        fotoPerfil: data.fotoPerfil
                    });
                }
            });

            console.log('Resultados encontrados:', resultados.length);
            console.log('Resultados:', resultados);
            setSearchResults(resultados);
            setShowSearchResults(resultados.length > 0);
        } catch (error) {
            console.error('Error buscando usuarios:', error);
        }
    };

    // Función para obtener contactos del usuario (usuarios que el usuario actual sigue)
    const getContactos = async (usuarioID: string): Promise<string[]> => {
        try {
            const contactosRef = collection(db, 'Usuarios', usuarioID, 'contactos');
            const contactosSnapshot = await getDocs(contactosRef);
            const seguidoIDs: string[] = [];

            contactosSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.seguidoID) {
                    seguidoIDs.push(data.seguidoID);
                }
            });

            return seguidoIDs;
        } catch (error) {
            console.error('Error obteniendo contactos:', error);
            return [];
        }
    };

    // Función para obtener seguidores del usuario (usuarios que siguen al usuario actual)
    const getSeguidores = async (usuarioID: string): Promise<string[]> => {
        try {
            const todosUsuarios = await getDocs(collection(db, 'Usuarios'));
            const seguidorIDs: string[] = [];

            for (const usuarioDoc of todosUsuarios.docs) {
                const contactosRef = collection(db, 'Usuarios', usuarioDoc.id, 'contactos');
                const contactosSnapshot = await getDocs(contactosRef);

                contactosSnapshot.forEach((contactoDoc) => {
                    const data = contactoDoc.data();
                    if (data.seguidoID === usuarioID) {
                        seguidorIDs.push(usuarioDoc.id);
                    }
                });
            }

            return seguidorIDs;
        } catch (error) {
            console.error('Error obteniendo seguidores:', error);
            return [];
        }
    };

    // Función para procesar una publicación y obtener datos del autor
    const procesarPublicacion = async (docSnapshot: any): Promise<Post | null> => {
        try {
            const data = docSnapshot.data();
            console.log('Procesando publicación:', data);
            const usuarioRef = doc(db, 'Usuarios', data.usuarioID);
            const usuarioDoc = await getDoc(usuarioRef);

            if (usuarioDoc.exists()) {
                const usuarioData = usuarioDoc.data() as any;
                console.log('Datos del usuario encontrados:', usuarioData);
                const nombreFuente = usuarioData.nombreCompleto || usuarioData.nombre || '';
                const partesNombre = nombreFuente.trim().split(' ');
                const nombresAutor = usuarioData.nombres || partesNombre[0] || '';
                const apellidosAutor = usuarioData.apellidos || partesNombre.slice(1).join(' ') || '';

                // Contar likes reales desde la colección interacciones
                const likesQuery = query(
                    collection(db, 'interacciones'),
                    where('publicacionID', '==', docSnapshot.id),
                    where('tipo', '==', 'like')
                );
                const likesSnapshot = await getDocs(likesQuery);
                const likesCount = likesSnapshot.size;

                // Contar comentarios reales desde la colección interacciones
                const comentariosQuery = query(
                    collection(db, 'interacciones'),
                    where('publicacionID', '==', docSnapshot.id),
                    where('tipo', '==', 'comentario')
                );
                const comentariosSnapshot = await getDocs(comentariosQuery);
                const comentariosCount = comentariosSnapshot.size;

                const publicacion = {
                    id: docSnapshot.id,
                    usuarioID: data.usuarioID,
                    contenido: data.texto,
                    fechaCreacion: data.fechaCreacion,
                    imagen: data.imagenUrl,
                    autor: {
                        nombres: nombresAutor,
                        apellidos: apellidosAutor,
                        fotoPerfil: usuarioData.fotoPerfil
                    },
                    likes: likesCount,
                    comentarios: comentariosCount
                };
                console.log('Publicación procesada exitosamente:', publicacion);

                // Verificar si el usuario actual le dio like a esta publicación
                if (usuarioID) {
                    const userLikeQuery = query(
                        collection(db, 'interacciones'),
                        where('usuarioID', '==', usuarioID),
                        where('publicacionID', '==', docSnapshot.id),
                        where('tipo', '==', 'like')
                    );
                    const userLikeSnapshot = await getDocs(userLikeQuery);
                    if (!userLikeSnapshot.empty) {
                        setLikedPosts(prev => ({ ...prev, [docSnapshot.id]: true }));
                    }
                }

                return publicacion;
            } else {
                console.log('Usuario no encontrado en la base de datos');
                return null;
            }
        } catch (error) {
            console.error('Error procesando publicación:', error);
            return null;
        }
    };

    // Función para configurar listener en tiempo real de publicaciones
    // Muestra las publicaciones del usuario actual, de los usuarios que sigue y de sus seguidores
    const configurarListenerPublicaciones = (usuarioID: string, seguidoIDs: string[], seguidorIDs: string[]) => {
        if (!usuarioID) return () => { };

        // Combinar todos los IDs únicos: usuario actual, usuarios seguidos y seguidores
        const allUserIDsSet = new Set([usuarioID, ...seguidoIDs, ...seguidorIDs]);
        const allUserIDs = Array.from(allUserIDsSet);
        console.log('Configurando listener para usuarios:', allUserIDs);
        console.log('  - Usuario actual:', usuarioID);
        console.log('  - Usuarios seguidos:', seguidoIDs.length);
        console.log('  - Seguidores:', seguidorIDs.length);
        const publicacionesRef = collection(db, 'publicaciones');
        const publicaciones: Post[] = [];
        let processedCount = 0;
        const totalQueries = allUserIDs.length;

        // Función para procesar todas las publicaciones cuando se complete la carga
        const procesarTodasPublicaciones = async () => {
            if (processedCount < totalQueries) return;

            // Ordenar por fecha de creación (más recientes primero)
            publicaciones.sort((a, b) => {
                const fechaA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaCreacion);
                const fechaB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaCreacion);
                return fechaB.getTime() - fechaA.getTime();
            });

            // Limitar a 20 publicaciones
            console.log('Total de publicaciones procesadas:', publicaciones.length);
            console.log('Publicaciones finales:', publicaciones);
            setPosts(publicaciones.slice(0, 20));
            setLoading(false);
        };

        // Configurar listeners para cada usuario
        const unsubscribes: (() => void)[] = [];

        allUserIDs.forEach((userID) => {
            const q = query(
                publicacionesRef,
                where('usuarioID', '==', userID),
                where('estado', '==', 'activo')
            );

            const unsubscribe = onSnapshot(q, async (snapshot) => {
                console.log(`Listener para usuario ${userID}: ${snapshot.docs.length} documentos encontrados`);
                const nuevasPublicaciones: Post[] = [];

                for (const docSnapshot of snapshot.docs) {
                    const data = docSnapshot.data();
                    // Filtrar publicaciones que pertenecen a comunidades (solo mostrar en perfiles y comunidades)
                    if (data.comunidadID) {
                        console.log('Publicación de comunidad excluida del feed:', docSnapshot.id);
                        continue;
                    }
                    
                    const publicacion = await procesarPublicacion(docSnapshot);
                    if (publicacion) {
                        nuevasPublicaciones.push(publicacion);
                        console.log('Publicación procesada:', publicacion.id);
                    }
                }

                // Actualizar publicaciones del usuario específico
                const publicacionesActualizadas = publicaciones.filter(p => p.usuarioID !== userID);
                publicacionesActualizadas.push(...nuevasPublicaciones);
                publicaciones.length = 0;
                publicaciones.push(...publicacionesActualizadas);

                processedCount++;
                await procesarTodasPublicaciones();
            }, (error) => {
                console.error('Error en listener de publicaciones:', error);
                setError('Error al cargar las publicaciones');
                setLoading(false);
            });

            unsubscribes.push(unsubscribe);
        });

        // Retornar función de cleanup
        return () => {
            unsubscribes.forEach(unsubscribe => unsubscribe());
        };
    };

    // Función para cargar comentarios de una publicación
    const cargarComentarios = async (postId: string) => {
        setLoadingComments(postId);
        try {
            // Eliminamos orderBy para evitar el error del índice de Firestore
            const comentariosQuery = query(
                collection(db, 'interacciones'),
                where('publicacionID', '==', postId),
                where('tipo', '==', 'comentario')
            );
            const comentariosSnapshot = await getDocs(comentariosQuery);

            const comentariosList: Comentario[] = [];

            for (const docSnapshot of comentariosSnapshot.docs) {
                const data = docSnapshot.data();

                // Obtener datos del usuario que hizo el comentario
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
                            nombres,
                            apellidos,
                            fotoPerfil: usuarioData.fotoPerfil
                        }
                    });
                }
            }

            // Ordenar por fecha en memoria (más recientes primero)
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

    // Función para verificar si el usuario dio like a una publicación
    const verificarLikeUsuario = async (postId: string) => {
        if (!usuarioID) return false;

        try {
            const likeQuery = query(
                collection(db, 'interacciones'),
                where('usuarioID', '==', usuarioID),
                where('publicacionID', '==', postId),
                where('tipo', '==', 'like')
            );
            const likeSnapshot = await getDocs(likeQuery);
            return !likeSnapshot.empty;
        } catch (error) {
            console.error('Error verificando like:', error);
            return false;
        }
    };

    // Función para actualizar los conteos de una publicación
    const actualizarConteosPublicacion = async (postId: string) => {
        try {
            console.log('Actualizando conteos para publicación:', postId);

            // Contar likes
            const likesQuery = query(
                collection(db, 'interacciones'),
                where('publicacionID', '==', postId),
                where('tipo', '==', 'like')
            );
            const likesSnapshot = await getDocs(likesQuery);
            const likesCount = likesSnapshot.size;
            console.log('Total de likes encontrados:', likesCount);

            // Contar comentarios
            const comentariosQuery = query(
                collection(db, 'interacciones'),
                where('publicacionID', '==', postId),
                where('tipo', '==', 'comentario')
            );
            const comentariosSnapshot = await getDocs(comentariosQuery);
            const comentariosCount = comentariosSnapshot.size;
            console.log('Total de comentarios encontrados:', comentariosCount);

            // Actualizar el estado de la publicación específica
            setPosts(prevPosts => {
                const updatedPosts = prevPosts.map(post =>
                    post.id === postId
                        ? { ...post, likes: likesCount, comentarios: comentariosCount }
                        : post
                );
                console.log('Publicaciones actualizadas');
                return updatedPosts;
            });
        } catch (error) {
            console.error('Error actualizando conteos:', error);
            console.error('Detalles del error:', JSON.stringify(error, null, 2));
        }
    };

    // Función para obtener los detalles de los likes
    const fetchLikesDetails = async (postId: string) => {
        setLoadingLikes(true);
        setLikesModalVisible(true);
        setLikesList([]);
        try {
            const likesQuery = query(
                collection(db, 'interacciones'),
                where('publicacionID', '==', postId),
                where('tipo', '==', 'like')
            );
            const likesSnapshot = await getDocs(likesQuery);
            const users: Usuario[] = [];

            for (const docSnapshot of likesSnapshot.docs) {
                const data = docSnapshot.data();
                const userRef = doc(db, 'Usuarios', data.usuarioID);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const nombreOrigen = userData.nombreCompleto || userData.nombre || [userData.nombres, userData.apellidos].filter(Boolean).join(' ');
                    const partesNombre = (nombreOrigen || '').trim().split(' ');
                    const nombres = userData.nombres || partesNombre[0] || '';
                    const apellidos = userData.apellidos || partesNombre.slice(1).join(' ') || '';

                    users.push({
                        id: userDoc.id,
                        usuarioID: userDoc.id,
                        nombres,
                        apellidos,
                        fotoPerfil: userData.fotoPerfil
                    });
                }
            }
            setLikesList(users);
        } catch (error) {
            console.error("Error fetching likes details:", error);
            Alert.alert("Error", "No se pudieron cargar los likes.");
        } finally {
            setLoadingLikes(false);
        }
    };

    // Función para cargar datos del feed
    const loadFeedData = async () => {
        try {
            setLoading(true);
            setError('');

            const storedUsuarioID = await AsyncStorage.getItem('usuarioID');
            const storedUsuarioNombre = await AsyncStorage.getItem('usuarioNombre');

            console.log('storedUsuarioID', storedUsuarioID);
            console.log('storedUsuarioNombre', storedUsuarioNombre);

            if (!storedUsuarioID) {
                setError('No se encontró información del usuario');
                setLoading(false);
                return;
            }

            setUsuarioID(storedUsuarioID);
            setUsuarioNombre(storedUsuarioNombre || 'Usuario');

            // Actualizar estado de conexión a online
            try {
                await actualizarEstadoOnline(storedUsuarioID);
            } catch (error) {
                console.error('Error actualizando estado online:', error);
            }

            // Obtener foto de perfil del usuario
            const usuarioRef = doc(db, 'Usuarios', storedUsuarioID);
            const usuarioDoc = await getDoc(usuarioRef);
            if (usuarioDoc.exists()) {
                const usuarioData = usuarioDoc.data();
                setUsuarioFotoPerfil(usuarioData.fotoPerfil || null);
            }

            // Obtener contactos (usuarios que el usuario actual sigue)
            const seguidoIDs = await getContactos(storedUsuarioID);
            setSeguidoIDs(seguidoIDs);

            // Obtener seguidores (usuarios que siguen al usuario actual)
            const seguidorIDs = await getSeguidores(storedUsuarioID);
            setSeguidorIDs(seguidorIDs);

        } catch (error) {
            console.error('Error cargando feed:', error);
            setError('Error al cargar las publicaciones');
            setLoading(false);
        }
    };

    // Cargar datos al montar el componente
    useEffect(() => {
        loadFeedData();
    }, []);


    // Nota: El estado de conexión ahora se maneja globalmente con usePresence en _layout.tsx
    // Este useEffect ya no es necesario, pero lo mantenemos por compatibilidad
    // El sistema de presencia actualiza automáticamente el estado cada 30 segundos

    // Listener para actualizar foto de perfil en tiempo real
    useEffect(() => {
        if (!usuarioID) return;

        const usuarioRef = doc(db, 'Usuarios', usuarioID);
        const unsubscribe = onSnapshot(usuarioRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const usuarioData = docSnapshot.data();
                setUsuarioFotoPerfil(usuarioData.fotoPerfil || null);
                console.log('📸 Foto de perfil actualizada:', usuarioData.fotoPerfil);
            }
        }, (error) => {
            console.error('Error en listener de foto de perfil:', error);
        });

        return () => {
            unsubscribe();
        };
    }, [usuarioID]);

    // Hacer scroll a una publicación específica si se recibe el parámetro
    useEffect(() => {
        if (!params.publicacionID || !posts.length || loading) return;

        const index = posts.findIndex(p => p.id === params.publicacionID);
        if (index !== -1 && scrollViewRef.current) {
            // Esperar un momento para que el ScrollView se renderice completamente
            setTimeout(() => {
                // Calcular posición aproximada (cada PostCard tiene aproximadamente 400-500px de altura)
                const estimatedPosition = index * 450;
                scrollViewRef.current?.scrollTo({ y: estimatedPosition, animated: true });
            }, 800);
        }
    }, [params.publicacionID, posts, loading]);

    // Configurar listener en tiempo real cuando cambien los seguidos o seguidores
    useEffect(() => {
        if (!usuarioID) return;

        const unsubscribe = configurarListenerPublicaciones(usuarioID, seguidoIDs, seguidorIDs);

        return () => {
            unsubscribe();
        };
    }, [usuarioID, seguidoIDs, seguidorIDs]);

    const handleComment = async (postId: string) => {
        if (showCommentInput === postId) {
            // Si ya está abierto, cerrarlo
            if (!commentText.trim()) {
                setShowCommentInput(null);
                return;
            }

            // Enviar comentario
            if (!usuarioID) {
                console.error('No hay usuarioID disponible');
                return;
            }

            try {
                console.log('Guardando comentario:', {
                    usuarioID,
                    publicacionID: postId,
                    comentario: commentText.trim()
                });

                const docRef = await addDoc(collection(db, 'interacciones'), {
                    usuarioID: usuarioID,
                    publicacionID: postId,
                    tipo: 'comentario',
                    comentario: commentText.trim(),
                    fecha: new Date()
                });

                console.log('Comentario agregado exitosamente con ID:', docRef.id);
                setCommentText('');
                setShowCommentInput(null);

                // Actualizar los conteos de la publicación
                await actualizarConteosPublicacion(postId);

                // Recargar los comentarios
                await cargarComentarios(postId);
            } catch (error) {
                console.error('Error enviando comentario:', error);
                console.error('Detalles del error:', JSON.stringify(error, null, 2));
            }
        } else {
            // Mostrar input de comentario y cargar comentarios existentes
            setShowCommentInput(postId);
            await cargarComentarios(postId);
        }
    };

    const handleSendComment = async (postId: string) => {
        if (!commentText.trim()) return;

        if (!usuarioID) {
            console.error('No hay usuarioID disponible');
            return;
        }

        try {
            console.log('Guardando comentario:', {
                usuarioID,
                publicacionID: postId,
                comentario: commentText.trim()
            });

            const docRef = await addDoc(collection(db, 'interacciones'), {
                usuarioID: usuarioID,
                publicacionID: postId,
                tipo: 'comentario',
                comentario: commentText.trim(),
                fecha: new Date()
            });

            console.log('Comentario agregado exitosamente con ID:', docRef.id);
            setCommentText('');

            // Actualizar los conteos de la publicación
            await actualizarConteosPublicacion(postId);

            // Recargar los comentarios
            await cargarComentarios(postId);
        } catch (error) {
            console.error('Error enviando comentario:', error);
            console.error('Detalles del error:', JSON.stringify(error, null, 2));
        }
    };

    const handleLike = async (postId: string) => {
        if (!usuarioID) {
            console.error('No hay usuarioID disponible');
            return;
        }

        try {
            console.log('Verificando like:', { usuarioID, publicacionID: postId });

            // Verificar si el usuario ya dio like a esta publicación
            const likeQuery = query(
                collection(db, 'interacciones'),
                where('usuarioID', '==', usuarioID),
                where('publicacionID', '==', postId),
                where('tipo', '==', 'like')
            );
            const likeSnapshot = await getDocs(likeQuery);

            console.log('Likes existentes:', likeSnapshot.size);

            if (likeSnapshot.empty) {
                // El usuario no ha dado like, agregar
                console.log('Agregando nuevo like');
                const docRef = await addDoc(collection(db, 'interacciones'), {
                    usuarioID: usuarioID,
                    publicacionID: postId,
                    tipo: 'like',
                    fecha: new Date()
                });
                console.log('Like agregado exitosamente con ID:', docRef.id);

                // Actualizar el estado para indicar que le dio like
                setLikedPosts(prev => ({ ...prev, [postId]: true }));

                // Actualizar los conteos de la publicación
                await actualizarConteosPublicacion(postId);
            } else {
                // El usuario ya dio like, eliminarlo
                console.log('Eliminando like existente');
                const likeDoc = likeSnapshot.docs[0];
                await deleteDoc(likeDoc.ref);
                console.log('Like eliminado exitosamente');

                // Actualizar el estado para indicar que retiró el like
                setLikedPosts(prev => ({ ...prev, [postId]: false }));

                // Actualizar los conteos de la publicación
                await actualizarConteosPublicacion(postId);
            }
        } catch (error) {
            console.error('Error dando like:', error);
            console.error('Detalles del error:', JSON.stringify(error, null, 2));
        }
    };


    const handleViewLikes = (postId: string) => {
        console.log('👀 Ver likes del post', postId);
        // Aquí luego puedes:
        // - navegar a otra pantalla
        // - abrir un modal con la lista de usuarios
        // por ahora solo dejamos el log
    };




    // Función para verificar si el usuario ya reportó una publicación
    const verificarReporteExistente = async (postId: string): Promise<boolean> => {
        if (!usuarioID) return false;

        try {
            const reporteQuery = query(
                collection(db, 'publicaciones', postId, 'reportes'),
                where('reportanteID', '==', usuarioID)
            );
            const reporteSnapshot = await getDocs(reporteQuery);
            return !reporteSnapshot.empty;
        } catch (error) {
            console.error('Error verificando reporte existente:', error);
            return false;
        }
    };

    // Función para obtener el usuarioID del autor de la publicación
    const obtenerUsuarioReportado = async (postId: string): Promise<string | null> => {
        try {
            const postRef = doc(db, 'publicaciones', postId);
            const postDoc = await getDoc(postRef);

            if (postDoc.exists()) {
                const data = postDoc.data();
                return data.usuarioID;
            }
            return null;
        } catch (error) {
            console.error('Error obteniendo usuario reportado:', error);
            return null;
        }
    };

    // Función para actualizar el contador de reportes de una publicación
    const actualizarContadorReportes = async (postId: string) => {
        try {
            const reportesQuery = query(
                collection(db, 'publicaciones', postId, 'reportes'),
                where('estado', '==', 'activo')
            );
            const reportesSnapshot = await getDocs(reportesQuery);
            const reportesCount = reportesSnapshot.size;

            // Actualizar el contador en el documento de la publicación
            const postRef = doc(db, 'publicaciones', postId);
            await updateDoc(postRef, {
                reportes_count: reportesCount
            });

            console.log(`Contador de reportes actualizado para publicación ${postId}: ${reportesCount}`);
            return reportesCount;
        } catch (error) {
            console.error('Error actualizando contador de reportes:', error);
            return 0;
        }
    };

    // Función para actualizar el índice de conducta del usuario
    const actualizarIndiceConducta = async (usuarioReportadoID: string, puntuacion: number, motivo: string) => {
        try {
            const usuarioRef = doc(db, 'Usuarios', usuarioReportadoID);
            const usuarioDoc = await getDoc(usuarioRef);

            if (usuarioDoc.exists()) {
                const usuarioData = usuarioDoc.data();
                const indiceActual = usuarioData.indice_conducta || 5;
                const nuevoIndice = Math.max(0, indiceActual + puntuacion);

                // Actualizar índice de conducta
                await updateDoc(usuarioRef, {
                    indice_conducta: nuevoIndice
                });

                // Agregar entrada al historial de conducta
                await addDoc(collection(db, 'Usuarios', usuarioReportadoID, 'historialConducta'), {
                    accion: puntuacion < 0 ? 'penalizacion' : 'bonificacion',
                    detalle: motivo,
                    puntResultante: nuevoIndice,
                    fecha: new Date()
                });

                console.log(`Índice de conducta actualizado para usuario ${usuarioReportadoID}: ${indiceActual} → ${nuevoIndice}`);

                // Verificar si necesita sanción automática
                await verificarSancionAutomatica(usuarioReportadoID, nuevoIndice);

                return nuevoIndice;
            }
        } catch (error) {
            console.error('Error actualizando índice de conducta:', error);
        }
    };

    // Función para verificar y aplicar sanciones automáticas
    const verificarSancionAutomatica = async (usuarioID: string, indiceConducta: number) => {
        try {
            let tipoSancion = '';
            let diasSancion = 0;
            let motivo = '';

            if (indiceConducta <= 0) {
                tipoSancion = 'cierre_definitivo';
                motivo = 'Índice de conducta crítico (0 puntos)';
            } else if (indiceConducta <= 2) {
                tipoSancion = 'suspension_temporal';
                diasSancion = 7;
                motivo = 'Índice de conducta bajo (≤2 puntos)';
            } else if (indiceConducta <= 3) {
                tipoSancion = 'suspension_temporal';
                diasSancion = 3;
                motivo = 'Índice de conducta bajo (≤3 puntos)';
            }

            if (tipoSancion) {
                const fechaInicio = new Date();
                const fechaFin = new Date();
                fechaFin.setDate(fechaFin.getDate() + diasSancion);

                await addDoc(collection(db, 'Usuarios', usuarioID, 'sanciones'), {
                    tipo: tipoSancion,
                    fecha_inicio: fechaInicio,
                    fecha_fin: tipoSancion === 'cierre_definitivo' ? null : fechaFin,
                    motivo: motivo
                });

                console.log(`Sanción aplicada a usuario ${usuarioID}: ${tipoSancion}`);
            }
        } catch (error) {
            console.error('Error aplicando sanción automática:', error);
        }
    };

    // Función para manejar el reporte de una publicación
    const handleReport = async (postId: string) => {
        if (!usuarioID) {
            Alert.alert('Error', 'No se encontró información del usuario');
            return;
        }

        try {
            // Verificar si ya reportó esta publicación
            const yaReporto = await verificarReporteExistente(postId);
            if (yaReporto) {
                Alert.alert('Ya reportado', 'Ya has reportado esta publicación anteriormente');
                return;
            }

            // Obtener el usuario reportado
            const usuarioReportadoID = await obtenerUsuarioReportado(postId);
            if (!usuarioReportadoID) {
                Alert.alert('Error', 'No se pudo obtener la información de la publicación');
                return;
            }

            // Verificar que no se esté auto-reportando
            if (usuarioReportadoID === usuarioID) {
                Alert.alert('Error', 'No puedes reportar tu propia publicación');
                return;
            }

            // Mostrar modal de reporte
            setSelectedPostId(postId);
            setShowReportModal(true);

        } catch (error) {
            console.error('Error preparando reporte:', error);
            Alert.alert('Error', 'Ocurrió un error al procesar el reporte');
        }
    };

    // Función para enviar el reporte
    const enviarReporte = async () => {
        if (!reportMotivo.trim()) {
            Alert.alert('Error', 'Por favor selecciona un motivo para el reporte');
            return;
        }

        if (!reportDetalle.trim()) {
            Alert.alert('Error', 'Por favor proporciona más detalles sobre el reporte');
            return;
        }

        try {
            // Obtener el usuario reportado
            const usuarioReportadoID = await obtenerUsuarioReportado(selectedPostId);
            if (!usuarioReportadoID) {
                Alert.alert('Error', 'No se pudo obtener la información de la publicación');
                return;
            }

            // Crear el reporte
            const reporteRef = await addDoc(collection(db, 'publicaciones', selectedPostId, 'reportes'), {
                reportanteID: usuarioID,
                usuarioReportado: usuarioReportadoID,
                motivo: reportMotivo,
                detalle: reportDetalle,
                fechaReporte: new Date(),
                estado: 'activo'
            });

            console.log('Reporte creado exitosamente:', reporteRef.id);

            // Actualizar contador de reportes
            const reportesCount = await actualizarContadorReportes(selectedPostId);

            // Aplicar penalización según el número de reportes
            if (reportesCount >= 5) {
                // Penalización severa por múltiples reportes
                await actualizarIndiceConducta(usuarioReportadoID, -2, `Múltiples reportes (${reportesCount})`);
            } else if (reportesCount >= 3) {
                // Penalización moderada
                await actualizarIndiceConducta(usuarioReportadoID, -1, `Reportes moderados (${reportesCount})`);
            }

            // Cerrar modal y limpiar datos
            setShowReportModal(false);
            setSelectedPostId('');
            setReportMotivo('');
            setReportDetalle('');

            Alert.alert(
                'Reporte enviado',
                'Tu reporte ha sido enviado exitosamente. Será revisado por el equipo de moderación.',
                [{ text: 'OK' }]
            );

        } catch (error) {
            console.error('Error enviando reporte:', error);
            Alert.alert('Error', 'Ocurrió un error al enviar el reporte');
        }
    };

    // return (
    //     <View style={{ flex: 1, backgroundColor: 'white' }}>
    //         <LinearGradient
    //             colors={['#2F4AA6', '#0491C6']}
    //             style={styles.gradientContainer}
    //         >
    //             <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 2, marginTop: 10 }}>
    //                 <View style={{ alignItems: "center" }}>
    //                     <ImageButton
    //                         source={usuarioFotoPerfil ?
    //                             { uri: usuarioFotoPerfil } :
    //                             require("@/assets/images/react-logo.png")
    //                         }
    //                         onPress={() => { router.push("./profile") }}
    //                         size={70}
    //                         style={styles.btnProfile}
    //                         borderWidth={4}
    //                         borderColor="white"
    //                     />
    //                     <Text style={styles.Title}>Hola {usuarioNombre}</Text>
    //                     <Text style={styles.Subtitle}>¡Bienvenido!</Text>
    //                 </View>

    //                 <View style={{ flexDirection: "row", gap: 10, marginRight: 20 }}>
    //                     <IconButton
    //                         onPress={() => { router.push("./chats") }}
    //                         size={30}
    //                         backgroundColor="transparent"
    //                         iconName="chat-bubble-outline"
    //                         iconLib="MaterialIcons"
    //                     />
    //                     <IconButton
    //                         onPress={() => { router.push("./notificaciones") }}
    //                         size={30}
    //                         backgroundColor="transparent"
    //                         iconName="notifications-outline"
    //                         iconLib="Ionicons"
    //                     />
    //                 </View>
    //             </View>

    //             <View>
    //                 <View style={styles.inputContainer}>
    //                     <Ionicons name="search" size={20} color="gray" style={styles.icon} />
    //                     <TextInput
    //                         style={styles.input}
    //                         placeholder="Buscar usuarios..."
    //                         placeholderTextColor="gray"
    //                         value={searchText}
    //                         onChangeText={(text) => {
    //                             setSearchText(text);
    //                             buscarUsuarios(text);
    //                         }}
    //                     />
    //                     {searchText.length > 0 && (
    //                         <TouchableOpacity onPress={() => {
    //                             setSearchText('');
    //                             setSearchResults([]);
    //                             setShowSearchResults(false);
    //                         }}>
    //                             <Ionicons name="close-circle" size={20} color="gray" />
    //                         </TouchableOpacity>
    //                     )}
    //                 </View>
    //             </View>
    //         </LinearGradient>

    //         {/* Resultados de búsqueda */}
    //         {showSearchResults && (
    //             <View style={styles.searchResultsContainer}>
    //                 <ScrollView style={styles.searchResultsList} nestedScrollEnabled>
    //                     {searchResults.map((usuario) => (
    //                         <TouchableOpacity
    //                             key={usuario.id}
    //                             style={styles.searchResultItem}
    //                             onPress={() => {
    //                                 setSearchText('');
    //                                 setShowSearchResults(false);
    //                                 router.push({
    //                                     pathname: './otherProfile',
    //                                     params: { userId: usuario.id }
    //                                 });
    //                             }}
    //                         >
    //                             <ImageButton
    //                                 source={usuario.fotoPerfil ?
    //                                     { uri: usuario.fotoPerfil } :
    //                                     require("@/assets/images/react-logo.png")
    //                                 }
    //                                 onPress={() => { }}
    //                                 size={45}
    //                                 style={styles.searchResultImage}
    //                                 borderWidth={2}
    //                                 borderColor="#ddd"
    //                             />
    //                             <View style={styles.searchResultInfo}>
    //                                 <Text style={styles.searchResultName}>
    //                                     {usuario.nombres} {usuario.apellidos}
    //                                 </Text>
    //                             </View>
    //                         </TouchableOpacity>
    //                     ))}
    //                 </ScrollView>
    //             </View>
    //         )}

    //         <ScrollView style={styles.whiteContainer}>
    //             {loading ? (
    //                 <View style={styles.loadingContainer}>
    //                     <ActivityIndicator size="large" color="#2F4AA6" />
    //                     <Text style={styles.loadingText}>Cargando publicaciones...</Text>
    //                 </View>
    //             ) : error ? (
    //                 <View style={styles.errorContainer}>
    //                     <Text style={styles.errorText}>{error}</Text>
    //                     <TouchableOpacity style={styles.retryButton} onPress={loadFeedData}>
    //                         <Text style={styles.retryButtonText}>Reintentar</Text>
    //                     </TouchableOpacity>
    //                 </View>
    //             ) : posts.length === 0 ? (
    //                 <View style={styles.emptyContainer}>
    //                     <Text style={styles.emptyText}>No hay publicaciones para mostrar</Text>
    //                     <Text style={styles.emptySubtext}>Sigue a más personas para ver sus publicaciones</Text>
    //                 </View>
    //             ) : (
    //                 posts.map((post) => (
    //                     <PostCard
    //                         key={post.id}
    //                         post={post}
    //                         liked={likedPosts[post.id] || false}
    //                         onLike={handleLike}
    //                         onComment={handleComment}
    //                         onReport={handleReport}
    //                         formatTime={formatRelativeTime}
    //                         comentarios={comentarios[post.id]}
    //                         loadingComments={loadingComments === post.id}
    //                         Alert.alert('Error', 'Por favor selecciona un motivo para el reporte');
    //             return;
    //     }

    //             if (!reportDetalle.trim()) {
    //                 Alert.alert('Error', 'Por favor proporciona más detalles sobre el reporte');
    //             return;
    //     }

    //             try {
    //         // Obtener el usuario reportado
    //         const usuarioReportadoID = await obtenerUsuarioReportado(selectedPostId);
    //             if (!usuarioReportadoID) {
    //                 Alert.alert('Error', 'No se pudo obtener la información de la publicación');
    //             return;
    //         }

    //             // Crear el reporte
    //             const reporteRef = await addDoc(collection(db, 'publicaciones', selectedPostId, 'reportes'), {
    //                 reportanteID: usuarioID,
    //             usuarioReportado: usuarioReportadoID,
    //             motivo: reportMotivo,
    //             detalle: reportDetalle,
    //             fechaReporte: new Date(),
    //             estado: 'activo'
    //         });

    //             console.log('Reporte creado exitosamente:', reporteRef.id);

    //             // Actualizar contador de reportes
    //             const reportesCount = await actualizarContadorReportes(selectedPostId);

    //         // Aplicar penalización según el número de reportes
    //         if (reportesCount >= 5) {
    //                 // Penalización severa por múltiples reportes
    //                 await actualizarIndiceConducta(usuarioReportadoID, -2, `Múltiples reportes (${reportesCount})`);
    //         } else if (reportesCount >= 3) {
    //                 // Penalización moderada
    //                 await actualizarIndiceConducta(usuarioReportadoID, -1, `Reportes moderados (${reportesCount})`);
    //         }

    //             // Cerrar modal y limpiar datos
    //             setShowReportModal(false);
    //             setSelectedPostId('');
    //             setReportMotivo('');
    //             setReportDetalle('');

    //             Alert.alert(
    //             'Reporte enviado',
    //             'Tu reporte ha sido enviado exitosamente. Será revisado por el equipo de moderación.',
    //             [{text: 'OK' }]
    //             );

    //     } catch (error) {
    //                 console.error('Error enviando reporte:', error);
    //             Alert.alert('Error', 'Ocurrió un error al enviar el reporte');
    //     }
    // };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <LinearGradient
                colors={['#2F4AA6', '#0491C6']}
                style={styles.gradientContainer}
            >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 2, marginTop: 10 }}>
                    <View style={{ alignItems: "center" }}>
                        <ImageButton
                            source={usuarioFotoPerfil ?
                                { uri: usuarioFotoPerfil } :
                                require("@/assets/images/react-logo.png")
                            }
                            onPress={() => { router.push("./profile") }}
                            size={70}
                            style={styles.btnProfile}
                            borderWidth={4}
                            borderColor="white"
                        />
                        <Text style={styles.Title}>Hola {usuarioNombre}</Text>
                        <Text style={styles.Subtitle}>¡Bienvenido!</Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10, marginRight: 20 }}>
                        <IconButton
                            onPress={() => { router.push("./chats") }}
                            size={30}
                            backgroundColor="transparent"
                            iconName="chat-bubble-outline"
                            iconLib="MaterialIcons"
                        />
                        <IconButton
                            onPress={() => { router.push("./notificaciones") }}
                            size={30}
                            backgroundColor="transparent"
                            iconName="notifications-outline"
                            iconLib="Ionicons"
                        />
                    </View>
                </View>

                <View>
                    <View style={styles.inputContainer}>
                        <Ionicons name="search" size={20} color="gray" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Buscar usuarios..."
                            placeholderTextColor="gray"
                            value={searchText}
                            onChangeText={(text) => {
                                setSearchText(text);
                                buscarUsuarios(text);
                            }}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity onPress={() => {
                                setSearchText('');
                                setSearchResults([]);
                                setShowSearchResults(false);
                            }}>
                                <Ionicons name="close-circle" size={20} color="gray" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </LinearGradient>

            {/* Resultados de búsqueda */}
            {showSearchResults && (
                <View style={styles.searchResultsContainer}>
                    <ScrollView style={styles.searchResultsList} nestedScrollEnabled>
                        {searchResults.map((usuario) => (
                            <TouchableOpacity
                                key={usuario.id}
                                style={styles.searchResultItem}
                                onPress={() => {
                                    setSearchText('');
                                    setShowSearchResults(false);
                                    router.push({
                                        pathname: './otherProfile',
                                        params: { userId: usuario.id }
                                    });
                                }}
                            >
                                <ImageButton
                                    source={usuario.fotoPerfil ?
                                        { uri: usuario.fotoPerfil } :
                                        require("@/assets/images/react-logo.png")
                                    }
                                    onPress={() => { }}
                                    size={45}
                                    style={styles.searchResultImage}
                                    borderWidth={2}
                                    borderColor="#ddd"
                                />
                                <View style={styles.searchResultInfo}>
                                    <Text style={styles.searchResultName}>
                                        {usuario.nombres} {usuario.apellidos}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <ScrollView
                ref={scrollViewRef}
                style={styles.whiteContainer}
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2F4AA6" />
                        <Text style={styles.loadingText}>Cargando publicaciones...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={loadFeedData}>
                            <Text style={styles.retryButtonText}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : posts.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No hay publicaciones para mostrar</Text>
                        <Text style={styles.emptySubtext}>Sigue a más personas para ver sus publicaciones</Text>
                    </View>
                ) : (
                    posts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            liked={likedPosts[post.id] || false}
                            onLike={handleLike}
                            onComment={handleComment}
                            onReport={handleReport}
                            formatTime={formatRelativeTime}
                            comentarios={comentarios[post.id]}
                            loadingComments={loadingComments === post.id}
                            showCommentInput={showCommentInput === post.id}
                            commentText={commentText}
                            onCommentTextChange={setCommentText}
                            onSendComment={handleSendComment}
                            onCloseComment={() => {
                                setShowCommentInput(null);
                                setCommentText('');
                                const newComentarios = { ...comentarios };
                                delete newComentarios[post.id];
                                setComentarios(newComentarios);
                            }}
                            onLikeDetails={() => fetchLikesDetails(post.id)}
                        />
                    ))
                )}
            </ScrollView>

            {/* Modal de Likes */}
            <Modal
                visible={likesModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setLikesModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Me gusta</Text>
                            <TouchableOpacity onPress={() => setLikesModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        {loadingLikes ? (
                            <ActivityIndicator size="large" color="#2F4AA6" style={{ marginTop: 20 }} />
                        ) : (
                            <ScrollView style={styles.likesList}>
                                {likesList.length > 0 ? (
                                    likesList.map((user) => (
                                        <View key={user.id} style={styles.likeItem}>
                                            <ImageButton
                                                source={user.fotoPerfil ? { uri: user.fotoPerfil } : require("@/assets/images/react-logo.png")}
                                                onPress={() => {
                                                    setLikesModalVisible(false);
                                                    // Navegar al perfil del usuario si es necesario
                                                    // router.push(...) 
                                                }}
                                                size={40}
                                                style={styles.likeUserImage}
                                            />
                                            <Text style={styles.likeUserName}>{user.nombres} {user.apellidos}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.noLikesText}>Aún no hay me gusta.</Text>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modal de Reporte */}
            <Modal
                visible={showReportModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowReportModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reportar Publicación</Text>
                            <TouchableOpacity
                                onPress={() => setShowReportModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalWarning}>
                            ⚠️ ¿Estás seguro de que deseas reportar esta publicación? El mal uso de esta función puede afectar tu cuenta.
                        </Text>

                        <View style={styles.modalContent}>
                            <Text style={styles.label}>Motivo del reporte:</Text>
                            <View style={styles.motivoContainer}>
                                {['Spam', 'Contenido ofensivo', 'Información falsa', 'Acoso', 'Contenido inapropiado', 'Otro'].map((motivo) => (
                                    <TouchableOpacity
                                        key={motivo}
                                        style={[
                                            styles.motivoButton,
                                            reportMotivo === motivo && styles.motivoButtonSelected
                                        ]}
                                        onPress={() => setReportMotivo(motivo)}
                                    >
                                        <Text style={[
                                            styles.motivoButtonText,
                                            reportMotivo === motivo && styles.motivoButtonTextSelected
                                        ]}>
                                            {motivo}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Detalles adicionales:</Text>
                            <TextInput
                                style={styles.detalleInput}
                                placeholder="Proporciona más detalles sobre el problema..."
                                placeholderTextColor="#999"
                                value={reportDetalle}
                                onChangeText={setReportDetalle}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setShowReportModal(false);
                                    setReportMotivo('');
                                    setReportDetalle('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.reportButton}
                                onPress={enviarReporte}
                            >
                                <Text style={styles.reportButtonText}>Enviar Reporte</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    whiteContainer: {
        flex: 1,
        backgroundColor: 'white',
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 20,
        paddingHorizontal: 10,
        backgroundColor: "#fff",
        width: '70%',
        marginLeft: 75,
        marginTop: 20,
    },
    icon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: 40,
        color: "#000",
        fontFamily: 'Montserrat_400Regular',
    },
    btnProfile: {
        marginTop: 40,
        marginLeft: 30,
    },
    gradientContainer: {
        flex: 0.4,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: "hidden",
        width: "100%",
        paddingBottom: 20,
    },
    Title: {
        color: 'white',
        fontFamily: 'Montserrat_700Bold',
        fontSize: 18,
        marginTop: 2,
        marginLeft: 30,
    },
    Subtitle: {
        color: 'white',
        fontFamily: 'Montserrat_400Regular',
        fontSize: 16,
        marginTop: 2,
        marginLeft: 30,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
        fontFamily: 'Montserrat_400Regular',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#ff4444',
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'Montserrat_400Regular',
    },
    retryButton: {
        backgroundColor: '#2F4AA6',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Montserrat_400Regular',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        marginBottom: 10,
        fontFamily: 'Montserrat_400Regular',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        fontFamily: 'Montserrat_400Regular',
    },
    searchResultsContainer: {
        backgroundColor: 'white',
        maxHeight: 300,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    searchResultsList: {
        maxHeight: 300,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    searchResultImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    searchResultInfo: {
        marginLeft: 12,
        flex: 1,
    },
    searchResultName: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    // Estilos del modal de reporte
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 15,
        width: '90%',
        maxHeight: '80%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        fontFamily: 'Montserrat_700Bold',
    },
    closeButton: {
        padding: 5,
    },
    modalWarning: {
        backgroundColor: '#fff3cd',
        color: '#856404',
        padding: 15,
        margin: 20,
        borderRadius: 8,
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
    },
    modalContent: {
        padding: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
        fontFamily: 'Montserrat_600SemiBold',
    },
    motivoContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
        gap: 8,
    },
    motivoButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#f8f9fa',
    },
    motivoButtonSelected: {
        backgroundColor: '#2F4AA6',
        borderColor: '#2F4AA6',
    },
    motivoButtonText: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Montserrat_400Regular',
    },
    motivoButtonTextSelected: {
        color: 'white',
    },
    detalleInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        gap: 10,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'Montserrat_400Regular',
    },
    reportButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#dc3545',
        alignItems: 'center',
    },
    reportButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
    likesList: {
        maxHeight: 400,
    },
    likeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    likeUserImage: {
        marginRight: 10,
    },
    likeUserName: {
        fontSize: 16,
        color: '#333',
        fontFamily: 'Montserrat_500Medium',
    },
    noLikesText: {
        textAlign: 'center',
        color: '#666',
        marginTop: 20,
        fontFamily: 'Montserrat_400Regular',
    },
});
