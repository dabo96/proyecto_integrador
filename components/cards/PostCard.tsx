import React, { useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { MessageCircle, Heart, MoreHorizontal } from "lucide-react-native";

type Post = {
    id: string;
    author: string;
    time: string;
    content: string;
    image?: string;
    likes?: number;
    comments?: number;
    isOwner?: boolean;
};

type Props = {
    post: Post;
    onLike?: (id: string) => void;
    onComment?: (id: string) => void;
    onReport?: (id: string) => void;
    onDelete?: (id: string) => void;
};

const PostCard = ({ post, onLike, onComment, onReport, onDelete }: Props) => {
    const [menuVisible, setMenuVisible] = useState(false);
    const [liked, setLiked] = useState(false);
    return (
        <View style={styles.post}>
            {/* Header */}
            <View style={styles.postHeader}>
                <Image
                    source={{ uri: "https://randomuser.me/api/portraits/men/11.jpg" }}
                    style={styles.postAvatar}
                />
                <View style={{ flex: 1 }}>
                    <Text style={styles.postAuthor}>{post.author}</Text>
                    <Text style={styles.postTime}>{post.time}</Text>
                </View>

                {/* Botón tres puntitos */}
                <TouchableOpacity onPress={() => setMenuVisible(true)}>
                    <MoreHorizontal size={20} color="#374151" />
                </TouchableOpacity>
            </View>

            {/* Contenido */}
            <Text style={styles.postContent}>{post.content}</Text>
            {post.image && <Image source={{ uri: post.image }} style={styles.postImage} />}

            {/* Acciones */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                        setLiked(!liked);
                        onLike?.(post.id);
                    }}
                >
                    <Heart size={18} color={liked ? "red" : "#374151"} fill={liked ? "red" : "none"} />
                    <Text style={styles.actionText}>{(post.likes ?? 0) + (liked ? 1 : 0)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onComment?.(post.id)}>
                    <MessageCircle size={18} color="#374151" />
                    <Text style={styles.actionText}>{post.comments ?? 0}</Text>
                </TouchableOpacity>
            </View>

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
        backgroundColor: "#fff",
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e5e5",
    },
    postHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    postAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 8,
    },
    postAuthor: {
        fontWeight: "600",
        fontSize: 14,
    },
    postTime: {
        fontSize: 12,
        color: "#6b7280",
    },
    postContent: {
        marginBottom: 8,
        fontSize: 14,
        color: "#374151",
    },
    postImage: {
        width: "100%",
        height: 180,
        borderRadius: 10,
        marginTop: 6,
    },
    actions: {
        flexDirection: "row",
        marginTop: 8,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 16,
    },
    actionText: {
        marginLeft: 4,
        color: "#374151",
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
