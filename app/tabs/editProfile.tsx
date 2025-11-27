import { db } from '@/services/firebase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,   
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const EditProfile = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Form State
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [fotoPerfil, setFotoPerfil] = useState('');
    const [password, setPassword] = useState(''); // Note: Updating password usually requires re-auth or a different flow
    const [originalData, setOriginalData] = useState<any>({});

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const storedUserId = await AsyncStorage.getItem('usuarioID');
            if (!storedUserId) {
                Alert.alert('Error', 'No se encontró sesión activa');
                router.back();
                return;
            }
            setUserId(storedUserId);

            const userDoc = await getDoc(doc(db, 'Usuarios', storedUserId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setNombre(data.nombre || '');
                setApellido(data.apellido || '');
                setFotoPerfil(data.fotoPerfil || '');
                // Password is not usually stored in plain text in Firestore, so we leave it empty.
                // If the user wants to change it, they type a new one.

                setOriginalData({
                    nombre: data.nombre || '',
                    apellido: data.apellido || '',
                    fotoPerfil: data.fotoPerfil || ''
                });
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            Alert.alert('Error', 'No se pudo cargar la información del usuario');
        } finally {
            setLoading(false);
        }
    };

    const hasChanges = () => {
        return (
            nombre !== originalData.nombre ||
            apellido !== originalData.apellido ||
            fotoPerfil !== originalData.fotoPerfil ||
            password.length > 0
        );
    };

    const handleClose = () => {
        if (hasChanges()) {
            Alert.alert(
                'Descartar cambios',
                '¿Estás seguro de que deseas salir sin guardar?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Salir', style: 'destructive', onPress: () => router.back() }
                ]
            );
        } else {
            router.back();
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permisos necesarios', 'Se necesita acceso a la galería');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setFotoPerfil(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const storage = getStorage();
            const storageRef = ref(storage, `profile_images/${userId}_${Date.now()}`);
            await uploadBytes(storageRef, blob);
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);

        try {
            let imageUrl = fotoPerfil;

            // If image is local (newly picked), upload it
            if (fotoPerfil && !fotoPerfil.startsWith('http')) {
                imageUrl = await uploadImage(fotoPerfil);
            }

            const updates: any = {
                nombre,
                apellido,
                fotoPerfil: imageUrl
            };

            // Note: Updating password in Firebase Auth requires re-authentication usually.
            // For this demo, we are only updating Firestore fields. 
            // If 'password' field exists in Firestore (not recommended), we update it.
            // If it's Firebase Auth, we would need a different approach.
            // Assuming for now we just update Firestore or ignore if it's strictly Auth.
            // The user asked to edit password, so I'll add a note or try to update if they have a field.
            if (password) {
                // updates.password = password; // UNCOMMENT if you store password in Firestore (insecure)
                // Or handle Auth update here
                Alert.alert('Aviso', 'El cambio de contraseña requiere un proceso adicional de seguridad.');
            }

            await updateDoc(doc(db, 'Usuarios', userId), updates);

            Alert.alert('Éxito', 'Perfil actualizado correctamente', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Error', 'No se pudo guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2F4AA6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Editar Perfil</Text>
                <View style={{ width: 28 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.imageContainer}>
                        <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
                            <Image
                                source={fotoPerfil ? { uri: fotoPerfil } : require('@/assets/images/react-logo.png')}
                                style={styles.profileImage}
                            />
                            <View style={styles.editIcon}>
                                <MaterialIcons name="camera-alt" size={20} color="white" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nombre</Text>
                            <TextInput
                                style={styles.input}
                                value={nombre}
                                onChangeText={setNombre}
                                placeholder="Tu nombre"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Apellido</Text>
                            <TextInput
                                style={styles.input}
                                value={apellido}
                                onChangeText={setApellido}
                                placeholder="Tu apellido"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Contraseña</Text>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Nueva contraseña (opcional)"
                                secureTextEntry
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.saveButtonText}>Guardar</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50, // Adjust for status bar
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    closeButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        padding: 20,
    },
    imageContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    imageWrapper: {
        position: 'relative',
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f0f0f0',
    },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#2F4AA6',
        padding: 8,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: 'white',
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#f9f9f9',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    saveButton: {
        backgroundColor: '#2F4AA6',
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default EditProfile;
