import IconButton from '@/components/IconButton';
import ImageButton from '@/components/ImageButton';
import { EvilIcons, Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/services/firebase';
import { collection, getDocs, query, where, orderBy, limit, addDoc, doc, getDoc } from 'firebase/firestore';

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

export default function MainPageScreen() {
    const router = useRouter();
    
    // Estados
    const [usuarioID, setUsuarioID] = useState<string>('');
    const [usuarioNombre, setUsuarioNombre] = useState<string>('');
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [showCommentInput, setShowCommentInput] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');

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

    // Función para obtener contactos del usuario
    const getContactos = async (usuarioID: string): Promise<string[]> => {
        try {
            const contactosRef = collection(db, 'usuarios', usuarioID, 'contactos');
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

    // Función para obtener publicaciones
    const getPublicaciones = async (usuarioID: string, seguidoIDs: string[]) => {
        try {
            const publicacionesRef = collection(db, 'publicaciones');
            const allUserIDs = [usuarioID, ...seguidoIDs];
            const publicaciones: Post[] = [];
            
            // Hacer consultas separadas para evitar problemas de índices
            // Primero obtener publicaciones del usuario actual
            const qUsuario = query(
                publicacionesRef,
                where('usuarioID', '==', usuarioID),
                where('estado', '==', 'activo')
            );
            
            const snapshotUsuario = await getDocs(qUsuario);
            
            for (const docSnapshot of snapshotUsuario.docs) {
                const data = docSnapshot.data();
                const usuarioRef = doc(db, 'usuarios', data.usuarioID);
                const usuarioDoc = await getDoc(usuarioRef);
                
                if (usuarioDoc.exists()) {
                    const usuarioData = usuarioDoc.data() as any;
                    publicaciones.push({
                        id: docSnapshot.id,
                        usuarioID: data.usuarioID,
                        contenido: data.contenido,
                        fechaCreacion: data.fechaCreacion,
                        imagen: data.imagen,
                        autor: {
                            nombres: usuarioData.nombres || '',
                            apellidos: usuarioData.apellidos || '',
                            fotoPerfil: usuarioData.fotoPerfil
                        },
                        likes: 0, // TODO: Implementar conteo de likes
                        comentarios: 0 // TODO: Implementar conteo de comentarios
                    });
                }
            }
            
            // Luego obtener publicaciones de los usuarios seguidos
            for (const seguidoID of seguidoIDs) {
                const qSeguido = query(
                    publicacionesRef,
                    where('usuarioID', '==', seguidoID),
                    where('estado', '==', 'activo')
                );
                
                const snapshotSeguido = await getDocs(qSeguido);
                
                for (const docSnapshot of snapshotSeguido.docs) {
                    const data = docSnapshot.data();
                    const usuarioRef = doc(db, 'usuarios', data.usuarioID);
                    const usuarioDoc = await getDoc(usuarioRef);
                    
                    if (usuarioDoc.exists()) {
                        const usuarioData = usuarioDoc.data() as any;
                        publicaciones.push({
                            id: docSnapshot.id,
                            usuarioID: data.usuarioID,
                            contenido: data.contenido,
                            fechaCreacion: data.fechaCreacion,
                            imagen: data.imagen,
                            autor: {
                                nombres: usuarioData.nombres || '',
                                apellidos: usuarioData.apellidos || '',
                                fotoPerfil: usuarioData.fotoPerfil
                            },
                            likes: 0, // TODO: Implementar conteo de likes
                            comentarios: 0 // TODO: Implementar conteo de comentarios
                        });
                    }
                }
            }
            
            // Ordenar por fecha de creación (más recientes primero)
            publicaciones.sort((a, b) => {
                const fechaA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate() : new Date(a.fechaCreacion);
                const fechaB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate() : new Date(b.fechaCreacion);
                return fechaB.getTime() - fechaA.getTime();
            });
            
            // Limitar a 20 publicaciones
            return publicaciones.slice(0, 20);
        } catch (error) {
            console.error('Error obteniendo publicaciones:', error);
            throw error;
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
                return;
            }
            
            setUsuarioID(storedUsuarioID);
            setUsuarioNombre(storedUsuarioNombre || 'Usuario');
            
            // Obtener contactos
            const seguidoIDs = await getContactos(storedUsuarioID);
            
            // Obtener publicaciones
            const publicaciones = await getPublicaciones(storedUsuarioID, seguidoIDs);
            setPosts(publicaciones);
            
        } catch (error) {
            console.error('Error cargando feed:', error);
            setError('Error al cargar las publicaciones');
        } finally {
            setLoading(false);
        }
    };

    // Cargar datos al montar el componente
    useEffect(() => {
        loadFeedData();
    }, []);

    const handleComment = async (postId: string) => {
        if (showCommentInput === postId) {
            // Enviar comentario
            if (commentText.trim()) {
                try {
                    await addDoc(collection(db, 'interacciones'), {
                        usuarioID: usuarioID,
                        publicacionID: postId,
                        tipo: 'comentario',
                        comentario: commentText.trim(),
                        fecha: new Date()
                    });
                    
                    setCommentText('');
                    setShowCommentInput(null);
                    // Recargar feed para actualizar contadores
                    loadFeedData();
                } catch (error) {
                    console.error('Error enviando comentario:', error);
                }
            }
        } else {
            // Mostrar input de comentario
            setShowCommentInput(postId);
        }
    };

    const handleLike = async (postId: string) => {
        try {
            await addDoc(collection(db, 'interacciones'), {
                usuarioID: usuarioID,
                publicacionID: postId,
                tipo: 'like',
                fecha: new Date()
            });
            
            // Recargar feed para actualizar contadores
            loadFeedData();
        } catch (error) {
            console.error('Error dando like:', error);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <LinearGradient
                colors={['#2F4AA6', '#0491C6']}
                style={styles.gradientContainer}
            >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 2, marginTop: 10 }}>
                    <View style={{ alignItems: "center" }}>
                        <ImageButton
                            source={require("@/assets/images/react-logo.png")}
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
                        <Ionicons name="person" size={20} color="gray" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Buscar"
                            placeholderTextColor="gray"
                        />
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.whiteContainer}>
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
                        <View key={post.id} style={styles.postCard}>
                            <View style={styles.postHeader}>
                                <View style={styles.postUserInfo}>
                                    <ImageButton
                                        source={post.autor.fotoPerfil ? 
                                            { uri: post.autor.fotoPerfil } : 
                                            require("@/assets/images/react-logo.png")
                                        }
                                        onPress={() => { router.push("./otherProfile") }}
                                        size={45}
                                        style={styles.postUserImage}
                                        borderWidth={4}
                                        borderColor="white"
                                    />
                                    <View>
                                        <Text style={styles.postUserName}>
                                            {post.autor.nombres} {post.autor.apellidos}
                                        </Text>
                                        <Text style={styles.postTimestamp}>
                                            {formatRelativeTime(post.fechaCreacion)}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity>
                                    <MaterialIcons name="more-horiz" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.postContent}>
                                <Text style={styles.postDescription}>{post.contenido}</Text>
                            </View>

                            {post.imagen && (
                                <Image source={{ uri: post.imagen }} style={styles.postImage} />
                            )}

                            <View style={styles.postActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleLike(post.id)}
                                >
                                    <Feather name="heart" size={18} color="#666" />
                                    <Text style={styles.actionText}>{post.likes}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleComment(post.id)}
                                >
                                    <EvilIcons name="comment" size={25} color="#666" />
                                    <Text style={styles.actionText}>{post.comentarios}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Input de comentario */}
                            {showCommentInput === post.id && (
                                <View style={styles.commentInputContainer}>
                                    <TextInput
                                        style={styles.commentInput}
                                        placeholder="Escribe un comentario..."
                                        value={commentText}
                                        onChangeText={setCommentText}
                                        multiline
                                    />
                                    <View style={styles.commentButtons}>
                                        <TouchableOpacity
                                            style={styles.commentButton}
                                            onPress={() => setShowCommentInput(null)}
                                        >
                                            <Text style={styles.commentButtonText}>Cancelar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.commentButton, styles.commentButtonPrimary]}
                                            onPress={() => handleComment(post.id)}
                                        >
                                            <Text style={[styles.commentButtonText, styles.commentButtonTextPrimary]}>
                                                Comentar
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
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
    postCard: {
        backgroundColor: 'white',
        marginHorizontal: 15,
        marginVertical: 8,
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
    },
    postImage: {
        width: '100%',
        height: 250,
        resizeMode: 'cover',
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        paddingBottom: 10,
    },
    postUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    postUserImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    postUserName: {
        fontWeight: '600',
        fontSize: 14,
        color: '#333',
    },
    postTimestamp: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    postContent: {
        paddingHorizontal: 15,
        paddingBottom: 10,
    },
    postDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    postActions: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 15,
        gap: 10,
        alignItems: 'center',
    },
    actionButton: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    actionText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
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
    commentInputContainer: {
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        minHeight: 40,
        maxHeight: 100,
    },
    commentButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        gap: 10,
    },
    commentButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    commentButtonPrimary: {
        backgroundColor: '#2F4AA6',
        borderColor: '#2F4AA6',
    },
    commentButtonText: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Montserrat_400Regular',
    },
    commentButtonTextPrimary: {
        color: 'white',
    },
});
