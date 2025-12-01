import Link from '@/components/Link';
import ModButton from '@/components/ModButton';
import { db } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SignInScreen() {
    const router = useRouter();

    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorCorreo, setErrorCorreo] = useState('');
    const [errorContrasena, setErrorContrasena] = useState('');
    const [showBanModal, setShowBanModal] = useState(false);
    const [banMessage, setBanMessage] = useState('');
    const [banDate, setBanDate] = useState('');

    const handleSignIn = async () => {
        // Limpiar errores previos
        setErrorCorreo('');
        setErrorContrasena('');

        if (!correo.trim() || !contrasena.trim()) {
            if (!correo.trim()) {
                setErrorCorreo('Por favor ingresa tu correo');
            }
            if (!contrasena.trim()) {
                setErrorContrasena('Por favor ingresa tu contraseña');
            }
            Alert.alert("Error", "Por favor completa todos los campos");
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
                console.log("❌ Usuario no encontrado");
                setLoading(false);
                setErrorCorreo('Correo incorrecto. Verifica que esté bien escrito.');
                Alert.alert(
                    "Correo incorrecto",
                    "El correo ingresado no está registrado. Verifica que esté bien escrito o regístrate si no tienes una cuenta.",
                    [
                        {
                            text: "Registrarse",
                            onPress: () => router.push('./registro'),
                        },
                        { text: "Intentar de nuevo", style: 'cancel' }
                    ]
                );
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
                setLoading(false);
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
                return;
            }

            const passwordStored = userFound?.contrasena || userFound?.contraseña;

            if (passwordStored === contrasena.trim()) {
                // 🔹 VERIFICAR BANEO
                if (userFound.bannedUntil) {
                    const bannedUntil = userFound.bannedUntil.toDate ? userFound.bannedUntil.toDate() : new Date(userFound.bannedUntil);
                    const now = new Date();

                    if (bannedUntil > now) {
                        setLoading(false);
                        const banReason = userFound.banReason || 'Infracción de contenido';
                        const dateString = bannedUntil.toLocaleDateString();

                        console.log('🚫 Usuario baneado detectado:', {
                            userId: userFound.id,
                            bannedUntil: dateString,
                            banReason
                        });

                        setBanMessage(banReason);
                        setBanDate(dateString);
                        setShowBanModal(true);
                        return;
                    }
                }

                // Guardar el usuarioID en AsyncStorage
                await AsyncStorage.setItem('usuarioID', userFound.id);
                const nombreCompleto = userFound.nombreCompleto || userFound.nombres || userFound.nombre || 'Usuario';
                await AsyncStorage.setItem('usuarioNombre', nombreCompleto);
                setLoading(false);
                // Limpiar errores al tener éxito
                setErrorCorreo('');
                setErrorContrasena('');
                Alert.alert("Éxito", `Bienvenido ${nombreCompleto.split(' ')[0] || nombreCompleto}`);
                router.push('./tabs/homeScreen');
            } else {
                setLoading(false);
                setErrorContrasena('Contraseña incorrecta. Verifica que esté bien escrita.');
                Alert.alert(
                    "Contraseña incorrecta",
                    "La contraseña ingresada no es correcta. Verifica que esté bien escrita o usa '¿Olvidaste tu contraseña?' si no la recuerdas."
                );
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
                    style={[styles.input, errorCorreo && styles.inputError]}
                    placeholder="Correo"
                    value={correo}
                    onChangeText={(text) => {
                        setCorreo(text);
                        setErrorCorreo(''); // Limpiar error al escribir
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                {errorCorreo ? <Text style={styles.errorText}>{errorCorreo}</Text> : null}
                <View style={{ height: 10 }}></View>
                <Text style={styles.texto}>Contraseña</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={[styles.input, errorContrasena && styles.inputError]}
                    placeholder="Contraseña"
                    secureTextEntry
                    value={contrasena}
                    onChangeText={(text) => {
                        setContrasena(text);
                        setErrorContrasena(''); // Limpiar error al escribir
                    }}
                />
                {errorContrasena ? <Text style={styles.errorText}>{errorContrasena}</Text> : null}
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

            {/* Modal de Cuenta Suspendida */}
            <Modal
                visible={showBanModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowBanModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ alignItems: 'center', marginBottom: 15 }}>
                            <Text style={{ fontSize: 50 }}>🚫</Text>
                        </View>
                        <Text style={styles.modalTitle}>Cuenta Suspendida</Text>
                        <Text style={styles.modalMessage}>
                            Tu cuenta está suspendida hasta el <Text style={{ fontWeight: 'bold' }}>{banDate}</Text>.
                        </Text>
                        <Text style={[styles.modalMessage, { marginTop: 10 }]}>
                            <Text style={{ fontWeight: 'bold' }}>Motivo:</Text> {banMessage}
                        </Text>
                        <Text style={[styles.modalMessage, { marginTop: 10, fontSize: 14 }]}>
                            No puedes iniciar sesión hasta que expire la suspensión.
                        </Text>
                        <Pressable
                            style={styles.modalButton}
                            onPress={() => setShowBanModal(false)}
                        >
                            <Text style={styles.modalButtonText}>Entendido</Text>
                        </Pressable>
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
    inputError: {
        borderColor: '#ff4444',
        borderWidth: 2,
    },
    errorText: {
        color: '#ff4444',
        fontSize: 12,
        marginTop: 5,
        marginLeft: 10,
        alignSelf: 'flex-start',
        fontFamily: 'Montserrat_400Regular',
        width: 300,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '85%',
        maxWidth: 400,
        padding: 25,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
        fontFamily: 'Montserrat_700Bold',
    },
    modalMessage: {
        fontSize: 16,
        textAlign: 'center',
        color: '#555',
        fontFamily: 'Montserrat_400Regular',
    },
    modalButton: {
        marginTop: 25,
        backgroundColor: '#2F4AA6',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 10,
        width: '100%',
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        fontFamily: 'Montserrat_600SemiBold',
    },
});