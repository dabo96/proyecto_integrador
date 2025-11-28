import Link from '@/components/Link';
import ModButton from '@/components/ModButton';
import { db } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SignInScreen() {
    const router = useRouter();

    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [loading, setLoading] = useState(false);
    const [showNotRegisteredModal, setShowNotRegisteredModal] = useState(false);

    const handleSignIn = async () => {
        if (!correo.trim() || !contrasena.trim()) {
            Alert.alert("Error", "Por favor ingresa correo y contraseña");
            return;
        }

        setLoading(true);

        try {
            const correoNormalizado = correo.trim().toLowerCase();
            console.log("🔍 Buscando usuario con correo:", correoNormalizado);

            const q = query(collection(db, "Usuarios"), where("correo", "==", correoNormalizado));
            const querySnapshot = await getDocs(q);

            console.log("📊 Resultados de búsqueda:", querySnapshot.empty ? "Vacío" : "Encontrado");

            if (querySnapshot.empty) {
                console.log("❌ Usuario no encontrado, mostrando modal");
                setLoading(false);
                setShowNotRegisteredModal(true);
                return;
            }

            let userFound: any = null;
            querySnapshot.forEach((doc) => {
                userFound = { id: doc.id, ...doc.data() };
            });

            if (!userFound.verificado) {
                await AsyncStorage.multiSet([
                    ['pendingVerificationUserID', userFound.id],
                    ['pendingVerificationEmail', correoNormalizado],
                ]);
                Alert.alert(
                    "Cuenta sin verificar",
                    "Necesitas verificar tu cuenta con el código enviado a tu correo institucional.",
                    [
                        {
                            text: "Verificar ahora",
                            onPress: () => router.push({ pathname: './autCuenta', params: { correo: correoNormalizado } }),
                        },
                        { text: "Cancelar" }
                    ]
                );
                setLoading(false);
                return;
            }

            const passwordStored = userFound?.contrasena || userFound?.contraseña;

            if (passwordStored === contrasena.trim()) {
                // Guardar el usuarioID en AsyncStorage
                await AsyncStorage.setItem('usuarioID', userFound.id);
                const nombreCompleto = userFound.nombreCompleto || userFound.nombres || userFound.nombre || 'Usuario';
                await AsyncStorage.setItem('usuarioNombre', nombreCompleto);
                setLoading(false);
                Alert.alert("Éxito", `Bienvenido ${nombreCompleto.split(' ')[0] || nombreCompleto}`);
                router.push('./tabs/homeScreen');
            } else {
                setLoading(false);
                Alert.alert("Error", "Contraseña incorrecta");
            }

        } catch (error: any) {
            console.error("❌ Error al iniciar sesión:", error);
            console.error("Mensaje de error:", error?.message);
            setLoading(false);

            // Verificar si es un error de conexión o de usuario no encontrado
            if (error?.code === 'unavailable' || error?.message?.includes('network')) {
                Alert.alert(
                    "Error de conexión",
                    "No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente."
                );
            } else if (error?.code === 'permission-denied') {
                Alert.alert(
                    "Error de permisos",
                    "No tienes permisos para acceder a esta información."
                );
            } else {
                Alert.alert(
                    "Error",
                    error?.message || "Hubo un problema al iniciar sesión. Por favor intenta nuevamente."
                );
            }
            return;
        }
    };

    return (
        <LinearGradient
            colors={['#2F4AA6', '#0491C6']}
            style={StyleSheet.absoluteFill}
        >
            <View style={styles.background}>
                <Text style={styles.title}>Link U</Text>
                <View style={{ height: 50 }}></View>
                <Text style={styles.subtitle}>Bienvenidos</Text>
                <View style={{ height: 10 }}></View>
                <Text style={styles.texto}>Correo</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={styles.input}
                    placeholder="Correo"
                    value={correo}
                    onChangeText={setCorreo}
                />
                <View style={{ height: 10 }}></View>
                <Text style={styles.texto}>Contraseña</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    secureTextEntry
                    value={contrasena}
                    onChangeText={setContrasena}
                />
                <View style={{ height: 15 }}></View>
                <Link title='¿Olvidaste tu contraseña?' color="white" onPress={() => { router.push('./recuperar') }} />
                <View style={{ height: 50 }}></View>
                <ModButton
                    title={loading ? 'Cargando...' : 'Iniciar sesión'}
                    onPress={handleSignIn}
                />
                <View style={{ height: 10 }}></View>
                <Text style={[styles.texto, { marginTop: 20 }]}>¿No tienes una cuenta?</Text>
                <Link title='Registrate' color="white" onPress={() => { router.push('./registro') }} />
            </View>

            {/* Modal de usuario no registrado */}
            <Modal
                visible={showNotRegisteredModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowNotRegisteredModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>No estás registrado</Text>
                        <Text style={styles.modalMessage}>
                            No estás registrado. Regístrate para continuar.
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setShowNotRegisteredModal(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonRegister]}
                                onPress={() => {
                                    setShowNotRegisteredModal(false);
                                    router.push('./registro');
                                }}
                            >
                                <Text style={styles.modalButtonRegisterText}>Registrarse</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: 'white',
        fontSize: 70,
        fontWeight: 'bold',
        textAlign: 'center',
        fontFamily: 'Montserrat_700Bold',
    },
    subtitle: {
        color: 'white',
        fontSize: 24,
        textAlign: 'center',
        marginTop: 10,
        fontFamily: 'Montserrat_700Bold',
    },
    texto: {
        color: 'white',
        fontFamily: 'Montserrat_400Regular',
        fontSize: 16,
    },
    input: {
        height: 40,
        paddingHorizontal: 10,
        borderWidth: 1,
        width: 300,
        backgroundColor: 'white',
        borderRadius: 5,
        borderColor: '#fff',
        fontFamily: 'Montserrat_400Regular',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 24,
        width: '85%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,

        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
        fontFamily: 'Montserrat_700Bold',
    },
    modalMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
        fontFamily: 'Montserrat_400Regular',
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonCancel: {
        backgroundColor: '#E0E0E0',
    },
    modalButtonRegister: {
        backgroundColor: '#0491C6',
    },
    modalButtonCancelText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
    modalButtonRegisterText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
});