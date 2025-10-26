import React, { useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { MessageCircle, Heart, MoreHorizontal } from "lucide-react-native";
import { Feather, EvilIcons, MaterialIcons } from "@expo/vector-icons";
import ImageButton from '@/components/ImageButton';

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
};

const PostCard = ({ 
    post, 
    liked = false, 
    onLike, 
    onComment, 
    onReport, 
    onDelete,
    formatTime,
    comentarios = [],
    loadingComments = false,
    showCommentInput = false,
    commentText = '',
    onCommentTextChange,
    onSendComment,
    onCloseComment,
    onOpenComment
}: Props) => {
    const [menuVisible, setMenuVisible] = useState(false);

    return (
        <View style={styles.post}>
            {/* Header */}
            <View style={styles.postHeader}>
                <ImageButton
                    source={post.autor.fotoPerfil ? 
                        { uri: post.autor.fotoPerfil } : 
                        require("@/assets/images/react-logo.png")
                    }
                    onPress={() => {}}
                    size={45}
                    style={styles.postAvatar}
                    borderWidth={4}
                    borderColor="white"
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.postAuthor}>
                        {post.autor.nombres} {post.autor.apellidos}
                    </Text>
                    <Text style={styles.postTime}>
                        {formatTime ? formatTime(post.fechaCreacion) : post.fechaCreacion}
                    </Text>
                </View>

                {/* Botón tres puntitos */}
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <MaterialIcons name="more-horiz" size={24} color="#666" />
                </TouchableOpacity>
            </View>

            {/* Contenido */}
            <Text style={styles.postContent}>{post.contenido}</Text>
            {post.imagen && <Image source={{ uri: post.imagen }} style={styles.postImage} />}

            {/* Acciones */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                        onLike?.(post.id);
                    }}
                >
                    <Feather 
                        name="heart" 
                        size={18} 
                        color={liked ? '#ff4444' : '#666'} 
                        fill={liked ? '#ff4444' : 'none'}
                    />
                    <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
                        {post.likes}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => onComment?.(post.id)}
                >
                    <EvilIcons name="comment" size={25} color="#666" />
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
                                <ImageButton
                                    source={comentario.autor.fotoPerfil ? 
                                        { uri: comentario.autor.fotoPerfil } : 
                                        require("@/assets/images/react-logo.png")
                                    }
                                    onPress={() => {}}
                                    size={35}
                                    style={styles.commentUserImage}
                                    borderWidth={2}
                                    borderColor="#ddd"
                                />
                                <View style={styles.commentContent}>
                                    <Text style={styles.commentAuthor}>
                                        {comentario.autor.nombres} {comentario.autor.apellidos}
                                    </Text>
                                    <Text style={styles.commentText}>{comentario.comentario}</Text>
                                    <Text style={styles.commentTime}>
                                        {formatTime ? formatTime(comentario.fecha) : comentario.fecha}
                                    </Text>
                                </View>
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
            <Modal transparent visible={menuVisible} animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPressOut={() => setMenuVisible(false)}
                >
                    <View style={styles.modalBox}>
                        {post.isOwner && (
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={() => {
                                    setMenuVisible(false);
                                    onDelete?.(post.id);
                                }}
                            >
                                <Text style={styles.modalText}>Eliminar</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.modalItem}
                            onPress={() => {
                                setMenuVisible(false);
                                onReport?.(post.id);
                            }}
                        >
                            <Text style={styles.modalText}>Reportar</Text>
                        </TouchableOpacity>
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