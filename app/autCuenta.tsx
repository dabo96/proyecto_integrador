import ModButton from '@/components/ModButton';
import { db } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AutCuenta() {
    const [input, setInput] = useState(['', '', '', '', '']);
    const inputsRef = useRef<(TextInput | null)[]>([]);
    const [correoObjetivo, setCorreoObjetivo] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const params = useLocalSearchParams<{ correo?: string }>();
    const router = useRouter();

    useEffect(() => {
        const inicializar = async () => {
            if (params?.correo && typeof params.correo === 'string') {
                setCorreoObjetivo(params.correo.toLowerCase());
                return;
            }
            const stored = await AsyncStorage.getItem('pendingVerificationEmail');
            if (stored) {
                setCorreoObjetivo(stored);
            }
        };

        inicializar();
    }, [params?.correo]);

    const manejarCambios = (texto: string, indice: number) => {
        // Filtrar solo números
        const soloNumeros = texto.replace(/[^0-9]/g, '');

        const nuevosInputs = [...input];
        nuevosInputs[indice] = soloNumeros;
        setInput(nuevosInputs);

        if (soloNumeros && indice < inputsRef.current.length - 1) {
            inputsRef.current[indice + 1]?.focus();
        }
    }

    const manejarVerificacion = async () => {
        if (isSubmitting) {
            return;
        }

        const codigoIngresado = input.join('');

        if (codigoIngresado.length !== 5) {
            Alert.alert('Código inválido', 'Por favor, ingresa un código de 5 dígitos.');
            return;
        }

        if (!correoObjetivo) {
            Alert.alert(
                'Sin correo asociado',
                'No pudimos encontrar el correo asociado a este registro. Vuelve al formulario de registro e inténtalo nuevamente.'
            );
            return;
        }

        try {
            setIsSubmitting(true);

            const q = query(
                collection(db, 'codAuth'),
                where('code', '==', codigoIngresado),
                where('used', '==', false)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                Alert.alert('Código inválido', 'El código es incorrecto o ya fue utilizado. Intenta nuevamente.');
                setIsSubmitting(false);
                return;
            }

            const docRef = snapshot.docs[0].ref;
            const data = snapshot.docs[0].data();

            if (data.correo?.toLowerCase() !== correoObjetivo) {
                Alert.alert('Correo distinto', 'El código ingresado no coincide con el correo registrado.');
                setIsSubmitting(false);
                return;
            }

            if (!data.usuarioID) {
                Alert.alert('Sin usuario', 'No pudimos asociar este código a un usuario.');
                setIsSubmitting(false);
                return;
            }

            await updateDoc(docRef, { used: true, updatedAt: serverTimestamp() });

            if (data.correo) {
                const userRef = doc(db, 'Usuarios', data.usuarioID);
                await updateDoc(userRef, {
                    verificado: true,
                    updatedAt: serverTimestamp(),
                });
            }

            await AsyncStorage.multiRemove(['pendingVerificationUserID', 'pendingVerificationEmail']);
            router.replace('/iniciarSesion');
            Alert.alert('Cuenta verificada', 'Tu cuenta ha sido verificada correctamente. Ahora puedes iniciar sesión.');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Ocurrió un error al verificar el código. Intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <View style={styles.mainContainer}>
                    <LinearGradient
                        colors={['#2F4AA6', '#0491C6']}
                        style={styles.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <View style={styles.background}>
                        <Text style={styles.subtitle}>Ingresa el código enviado al correo electrónico registrado</Text>
                        <View style={{ height: 30 }}></View>
                        <View style={styles.container}>
                            {input.map((valor, i) => (
                                <TextInput
                                    key={i}
                                    ref={(ref) => { inputsRef.current[i] = ref; }}
                                    style={styles.input}
                                    maxLength={1}
                                    keyboardType="numeric"
                                    value={valor}
                                    onChangeText={(t) => manejarCambios(t, i)}
                                    selectTextOnFocus={true}
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                />
                            ))}
                        </View>
                        <View style={{ height: 50 }}></View>
                        <ModButton
                            title={isSubmitting ? 'Verificando...' : 'Verificar'}
                            fontWeight='bold'
                            textColor="black"
                            style={styles.button}
                            onPress={manejarVerificacion}
                            disabled={isSubmitting}
                        />
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
    },
    mainContainer: {
        flex: 1,
    },
    subtitle: {
        color: 'black',
        fontSize: 24,
        textAlign: 'center',
        marginTop: 10,
        fontFamily: 'Montserrat_700Bold',
    },
    input: {
        height: 50,
        width: 50,
        backgroundColor: 'gray',
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 10,
        flex: 1,
        marginHorizontal: 5,
        textAlign: 'center',
        textAlignVertical: "center",
        fontFamily: 'Montserrat_400Regular',
    },
    container: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 10,
    },
    gradient: {
        height: 40,
        width: '100%',
    },
    button: {
        borderWidth: 2,
        borderColor: "#dfdfdf",
        backgroundColor: "#dfdfdf",
        borderRadius: 5,
        width: 200,
    }
});