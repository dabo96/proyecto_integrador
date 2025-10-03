import Link from '@/components/Link';
import ModButton from '@/components/ModButton';
import { db } from '@/services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SignInScreen() {
    const router = useRouter();

    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignIn = async () => {
        if (!correo || !contrasena) {
            Alert.alert("Error", "Por favor ingresa correo y contraseña");
            return;
        }

        setLoading(true);

        try {
            const q = query(collection(db, "Usuarios"), where("correo", "==", correo));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                Alert.alert("Error", "Correo no encontrado");
                setLoading(false);
                return;
            }

            let userFound: any = null;
            querySnapshot.forEach((doc) => {
                userFound = { id: doc.id, ...doc.data() };
            });

            if (userFound?.contrasena === contrasena) {
                Alert.alert("Éxito", `Bienvenido ${userFound.nombre}`);
                router.push('./tabs/homeScreen');
            } else {
                Alert.alert("Error", "Contraseña incorrecta");
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Hubo un problema al iniciar sesión");
        }

        setLoading(false);
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
});