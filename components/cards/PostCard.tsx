import ImageButton from '@/components/ImageButton';

import { Feather } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import React, { useState } from "react";
import { ActivityIndicator, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

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

type Props = {
    post: Post;
    liked?: boolean;
    onLike?: (id: string) => void;
    onLikeDetails?: (id: string) => void;
    onComment?: (id: string) => void;
    onReport?: (id: string) => void;
    onDelete?: (id: string) => void;
    formatTime?: (timestamp: any) => string;
    comentarios?: Comentario[];
    loadingComments?: boolean;
    showCommentInput?: boolean;
    commentText?: string;
    onCommentTextChange?: (text: string) => void;
    onSendComment?: (id: string) => void;
    onCloseComment?: () => void;
    onOpenComment?: (id: string) => void;
    currentUserId?: string; // ID del usuario actual para determinar si navegar a profile o otherProfile
};

const PostCard = ({
    post,
    liked,
    onLike,
    onLikeDetails,
    onComment,
    onReport,
    onDelete,
    formatTime,
    comentarios,
    loadingComments,
    showCommentInput,
    commentText,
    onCommentTextChange,
    onSendComment,
    onCloseComment,
    onOpenComment,
    currentUserId
}: Props) => {
    const router = useRouter();
    const [menuVisible, setMenuVisible] = useState(false);
    
    // Determinar si el usuario actual es el dueño de la publicación
    // Priorizar post.isOwner si está definido explícitamente como true
    // Si post.isOwner es undefined o false, usar la comparación de IDs como respaldo
    const isPostOwner = post.isOwner === true || 
                       (post.isOwner !== false && currentUserId && post.usuarioID && currentUserId === post.usuarioID);
    
    // Log para depuración - solo cuando se renderiza
    if (post.isOwner === true) {
      // console.log('✅ PostCard - isOwner es TRUE:', {
      //   postId: post.id,
      //   postIsOwner: post.isOwner,
      //   isPostOwner
      // });
    }

    const handleUserPress = () => {
        if (!post.usuarioID) return;

        // Si es el usuario actual, navegar a su perfil
        if (currentUserId === post.usuarioID) {
            router.push('./profile');
        } else {
            // Si es otro usuario, navegar a su perfil
            router.push({
                pathname: './otherProfile',
                params: { userId: post.usuarioID }
            });
        }
    };

    return (
        <View style={styles.post}>
            {/* Header */}
            <View style={styles.postHeader}>
                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
                    onPress={handleUserPress}
                    activeOpacity={0.7}
                >
                    <ImageButton
                        source={post.autor.fotoPerfil ?
                            { uri: post.autor.fotoPerfil } :
                            require("@/assets/images/react-logo.png")
                        }
                        onPress={handleUserPress}
                        size={40}
                        style={styles.postAvatar}
                        borderWidth={2}
                        borderColor="#ddd"
                    />
                    <View>
                        <Text style={styles.postAuthor}>
                            {post.autor.nombres} {post.autor.apellidos}
                        </Text>
                        <Text style={styles.postTime}>
                            {formatTime ? formatTime(post.fechaCreacion) : 'Hace un momento'}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Botón tres puntitos */}
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <Feather name="more-horizontal" size={24} color="#666" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <Text style={styles.postContent}>{post.contenido}</Text>
            {post.imagen && (
                <Image source={{ uri: post.imagen }} style={styles.postImage} />
            )}

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => onLike?.(post.id)}
                >
                    <Feather
                        name="heart"
                        size={24}
                        color={liked ? "#ff4444" : "#666"}
                        fill={liked ? "#ff4444" : "none"}
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => onLikeDetails?.(post.id)}>
                    <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
                        {post.likes}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => onComment?.(post.id)}
                >
                    <Feather name="message-circle" size={24} color="#666" />
                    <Text style={styles.actionText}>{post.comentarios}</Text>
                </TouchableOpacity>
            </View>

            {/* Lista de comentarios */}
            {showCommentInput && comentarios && (
                <View style={styles.commentsListContainer}>
                    {loadingComments ? (
                        <View style={styles.commentsLoadingContainer}>
                            <ActivityIndicator size="small" color="#2F4AA6" />
                            <Text style={styles.commentsLoadingText}>Cargando comentarios...</Text>
                        </View>
                    ) : comentarios.length > 0 ? (
                        comentarios.map((comentario) => (
                            <View key={comentario.id} style={styles.commentItem}>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (comentario.usuarioID) {
                                            if (currentUserId === comentario.usuarioID) {
                                                router.push('./profile');
                                            } else {
                                                router.push({
                                                    pathname: './otherProfile',
                                                    params: { userId: comentario.usuarioID }
                                                });
                                            }
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <ImageButton
                                        source={comentario.autor.fotoPerfil ?
                                            { uri: comentario.autor.fotoPerfil } :
                                            require("@/assets/images/react-logo.png")
                                        }
                                        onPress={() => {
                                            if (comentario.usuarioID) {
                                                if (currentUserId === comentario.usuarioID) {
                                                    router.push('./profile');
                                                } else {
                                                    router.push({
                                                        pathname: './otherProfile',
                                                        params: { userId: comentario.usuarioID }
                                                    });
                                                }
                                            }
                                        }}
                                        size={35}
                                        style={styles.commentUserImage}
                                        borderWidth={2}
                                        borderColor="#ddd"
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.commentContent}
                                    onPress={() => {
                                        if (comentario.usuarioID) {
                                            if (currentUserId === comentario.usuarioID) {
                                                router.push('./profile');
                                            } else {
                                                router.push({
                                                    pathname: './otherProfile',
                                                    params: { userId: comentario.usuarioID }
                                                });
                                            }
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.commentAuthor}>
                                        {comentario.autor.nombres} {comentario.autor.apellidos}
                                    </Text>
                                    <Text style={styles.commentText}>{comentario.comentario}</Text>
                                    <Text style={styles.commentTime}>
                                        {formatTime ? formatTime(comentario.fecha) : comentario.fecha}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noCommentsText}>No hay comentarios aún</Text>
                    )}
                </View>
            )}

            {/* Input de comentario */}
            {showCommentInput && (
                <View style={styles.commentInputContainer}>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Escribe un comentario..."
                        value={commentText}
                        onChangeText={onCommentTextChange}
                        multiline
                    />
                    <View style={styles.commentButtons}>
                        <TouchableOpacity
                            style={styles.commentButton}
                            onPress={onCloseComment}
                        >
                            <Text style={styles.commentButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.commentButton, styles.commentButtonPrimary]}
                            onPress={() => onSendComment?.(post.id)}
                        >
                            <Text style={[styles.commentButtonText, styles.commentButtonTextPrimary]}>
                                Comentar
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Modal menú opciones */}
            <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPressOut={() => setMenuVisible(false)}
                >
                    <View style={styles.modalBox}>
                        {(() => {
                            // Log detallado cuando se abre el modal
                            // console.log('🔍🔍🔍 MODAL ABIERTO 🔍🔍🔍');
                            // console.log('🔍 Modal - post.isOwner:', post.isOwner, '(tipo:', typeof post.isOwner, ')');
                            // console.log('🔍 Modal - isPostOwner calculado:', isPostOwner);
                            // console.log('🔍 Modal - currentUserId:', currentUserId);
                            // console.log('🔍 Modal - post.usuarioID:', post.usuarioID);
                            
                            // Si post.isOwner es explícitamente true, mostrar Eliminar
                            // Priorizar post.isOwner sobre la comparación de IDs
                            const shouldShowDelete = post.isOwner === true;
                            
                            // console.log('🔍 Modal - shouldShowDelete (solo isOwner):', shouldShowDelete);
                            // console.log('🔍 Modal - post.isOwner estrictamente igual a true?:', post.isOwner === true);
                            // console.log('🔍 Modal - post.isOwner valor:', post.isOwner);
                            
                            if (shouldShowDelete) {
                                // console.log('✅✅✅ Mostrando opción ELIMINAR ✅✅✅');
                                return (
                                    <TouchableOpacity
                                        style={styles.modalItem}
                                        onPress={() => {
                                            // console.log('🗑️ Eliminando publicación:', post.id);
                                            setMenuVisible(false);
                                            onDelete?.(post.id);
                                        }}
                                    >
                                        <Text style={styles.modalText}>Eliminar</Text>
                                    </TouchableOpacity>
                                );
                            } else {
                                // console.log('❌❌❌ Mostrando opción REPORTAR ❌❌❌');
                                return (
                                    <TouchableOpacity
                                        style={styles.modalItem}
                                        onPress={() => {
                                            // console.log('🚨 Reportando publicación:', post.id);
                                            setMenuVisible(false);
                                            onReport?.(post.id);
                                        }}
                                    >
                                        <Text style={styles.modalText}>Reportar</Text>
                                    </TouchableOpacity>
                                );
                            }
                        })()}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

export default PostCard;

const styles = StyleSheet.create({
    post: {
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
        padding: 0,
    },
    postHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 15,
        paddingBottom: 10,
    },
    postAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    postAuthor: {
        fontWeight: "600",
        fontSize: 14,
        color: '#333',
    },
    postTime: {
        fontSize: 12,
        color: "#666",
        marginTop: 2,
    },
    postContent: {
        paddingHorizontal: 15,
        paddingBottom: 10,
        fontSize: 14,
        color: "#666",
        lineHeight: 20,
    },
    postImage: {
        width: '100%',
        height: 250,
        resizeMode: 'cover',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 15,
        gap: 10,
        alignItems: 'center',
    },
    actionBtn: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    actionText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    actionTextLiked: {
        color: '#ff4444',
    },
    commentsListContainer: {
        maxHeight: 300,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingVertical: 10,
    },
    commentsLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 10,
    },
    commentsLoadingText: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Montserrat_400Regular',
    },
    commentItem: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    commentUserImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    commentContent: {
        flex: 1,
        marginLeft: 10,
    },
    commentAuthor: {
        fontWeight: '600',
        fontSize: 13,
        color: '#333',
        marginBottom: 2,
    },
    commentText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
        lineHeight: 18,
    },
    commentTime: {
        fontSize: 11,
        color: '#999',
    },
    noCommentsText: {
        textAlign: 'center',
        paddingVertical: 20,
        fontSize: 14,
        color: '#999',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "flex-end",
    },
    modalBox: {
        backgroundColor: "#fff",
        paddingVertical: 10,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    modalItem: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    modalText: {
        fontSize: 16,
        color: "#111",
    },
});