import IconButton from '@/components/IconButton';
import ImageButton from '@/components/ImageButton';
import { EvilIcons, Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function MainPageScreen() {

    const router = useRouter();

    const handleComment = (postId: number) => {
        alert(`Comentar en el post ${postId}`);
    };

    const handleLike = (postId: number) => {
        alert(`Te gustó el post ${postId}`);
    };

    const profileData = {
        name: "Andrea González Hernández",
        profileImage: "https://randomuser.me/api/portraits/women/54.jpg",
        followers: 524,
        following: 850,
        bio: "Estudiante de Ingeniería de Sistemas",
    };

    const postsData = [
        {
            id: 1,
            image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=250&fit=crop',
            description: 'Trabajando en una aplicación increíble con React Native y Expo. ¡Los resultados están siendo geniales!',
            timestamp: '2 horas',
        },
        {
            id: 2,
            image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
            description: 'Excelente presentación sobre las últimas tendencias en desarrollo mobile. Aprendizaje constante es clave.',
            timestamp: '5 horas',
        },
        {
            id: 3,
            image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=250&fit=crop',
            description: 'Nada mejor que trabajar con un equipo increíble. La colaboración hace la diferencia en cada proyecto.',
            timestamp: '1 día',
        },
        {
            id: 4,
            image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=250&fit=crop',
            description: 'El espacio de trabajo influye mucho en la productividad. ¿Cuál es tu lugar favorito para programar?',
            timestamp: '2 días',
        },
        {
            id: 5,
            image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=250&fit=crop',
            description: 'La importancia de escribir código limpio y mantenible. Cada línea cuenta para el futuro del proyecto.',
            timestamp: '3 días',
        },
        {
            id: 6,
            image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=250&fit=crop',
            description: 'Las conexiones profesionales son fundamentales. Cada conversación puede abrir nuevas oportunidades.',
            timestamp: '5 días',
        }
    ];

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
                        <Text style={styles.Title}>Hola Andrea</Text>
                        <Text style={styles.Subtitle}>¡Bienvenida!</Text>
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
                {postsData.map((post) => (
                    <View key={post.id} style={styles.postCard}>
                        <View style={styles.postHeader}>
                            <View style={styles.postUserInfo}>
                                <ImageButton
                                    source={{ uri: profileData.profileImage }}
                                    onPress={() => { router.push("./otherProfile") }}
                                    size={45}
                                    style={styles.postUserImage}
                                    borderWidth={4}
                                    borderColor="white"
                                />
                                <View>
                                    <Text style={styles.postUserName}>{profileData.name}</Text>
                                    <Text style={styles.postTimestamp}>{post.timestamp}</Text>
                                </View>
                            </View>
                            <TouchableOpacity>
                                <MaterialIcons name="more-horiz" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.postContent}>
                            <Text style={styles.postDescription}>{post.description}</Text>
                        </View>

                        <Image source={{ uri: post.image }} style={styles.postImage} />

                        <View style={styles.postActions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleLike(post.id)}
                            >
                                <Feather name="heart" size={18} color="#666" />
                                <Text style={styles.actionText}></Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleComment(post.id)}
                            >
                                <EvilIcons name="comment" size={25} color="#666" />
                                <Text style={styles.actionText}></Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
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
});
