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
            // Normalizar el correo
            const correoNormalizado = correo.trim().toLowerCase();

            // Buscar usuario por correo
            const usuariosRef = collection(db, 'Usuarios');
            const q = query(usuariosRef, where('correo', '==', correoNormalizado));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setErrorCorreo('Correo o contraseña incorrectos');
                setErrorContrasena('Correo o contraseña incorrectos');
                Alert.alert("Error", "Correo o contraseña incorrectos");
                setLoading(false);
                return;
            }

            // Obtener el primer documento (el correo es único)
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            const userId = userDoc.id;

            // Verificar si el usuario está baneado
            if (userData.bannedUntil) {
                const bannedUntil = userData.bannedUntil.toDate ? userData.bannedUntil.toDate() : new Date(userData.bannedUntil);
                const now = new Date();

                if (bannedUntil > now) {
                    // Usuario aún está baneado
                    const banDateFormatted = bannedUntil.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    setBanMessage(userData.banReason || 'Infracción de políticas');
                    setBanDate(banDateFormatted);
                    setShowBanModal(true);
                    setLoading(false);
                    return;
                }
            }

            // Verificar si el usuario está verificado
            if (!userData.verificado) {
                Alert.alert(
                    "Cuenta no verificada",
                    "Tu cuenta aún no ha sido verificada. Por favor, verifica tu cuenta antes de iniciar sesión."
                );
                setLoading(false);
                return;
            }

            // Verificar contraseña
            const passwordStored = userData?.contrasena || userData?.contraseña;
            const contrasenaIngresada = contrasena.trim();

            if (!passwordStored) {
                setErrorContrasena('Error en la autenticación');
                Alert.alert("Error", "Error en la autenticación. Por favor, contacta al soporte.");
                setLoading(false);
                return;
            }

            if (passwordStored !== contrasenaIngresada) {
                setErrorCorreo('Correo o contraseña incorrectos');
                setErrorContrasena('Correo o contraseña incorrectos');
                Alert.alert("Error", "Correo o contraseña incorrectos");
                setLoading(false);
                return;
            }

            // Guardar información del usuario en AsyncStorage
            const nombreCompleto = userData.nombreCompleto || 
                `${userData.nombres || ''} ${userData.apellidos || ''}`.trim() || 
                'Usuario';

            await AsyncStorage.multiSet([
                ['usuarioID', userId],
                ['usuarioNombre', nombreCompleto]
            ]);

            setLoading(false);

            // Redirigir al usuario a la pantalla principal
            router.replace('/tabs/homeScreen');
        } catch (error: any) {
            Alert.alert("Error", "Hubo un problema al iniciar sesión. Inténtalo de nuevo.");
            setLoading(false);
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
                        setErrorCorreo('');
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
                        setErrorContrasena('');
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