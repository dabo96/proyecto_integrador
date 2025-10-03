import ModButton from '@/components/ModButton';
import { db } from '@/services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AutCuenta() {
    const [input, setInput] = useState(['', '', '', '', '']);
    const inputsRef = useRef<(TextInput | null)[]>([]);
    const router = useRouter();

    const manejarCambios = (texto: string, indice: number) => {
        const nuevosInputs = [...input];
        nuevosInputs[indice] = texto;
        setInput(nuevosInputs);

        if (texto && indice < inputsRef.current.length - 1) {
            inputsRef.current[indice + 1]?.focus();
        }
    }

    const manejarVerificacion = async () => {
        const codigoIngresado = input.join('');

        if (codigoIngresado.length !== 5) {
            alert('Por favor, ingresa un código de 5 dígitos.');
            return;
        }

        try {
            const q = query(collection(db, 'codAuth'), where('code', '==', codigoIngresado), where('used', '==', false));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert('Código inválido o ya utilizado. Intenta nuevamente.');
                return;
            }

            const docRef = snapshot.docs[0].ref;
            const data = snapshot.docs[0].data();

            await updateDoc(docRef, { used: true, updatedAt: new Date() });

            if (data.correo) {
                const userQuery = query(collection(db, 'Usuarios'), where('correo', '==', data.correo));
                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                    const userRef = userSnapshot.docs[0].ref;
                    await updateDoc(userRef, { verified: true, updatedAt: new Date() });
                }
            }

            console.log('Éxito', 'Cuenta verificada exitosamente.');
            router.push('./tabs/homeScreen');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Ocurrió un error al verificar el código. Intenta nuevamente.');
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
                                />
                            ))}
                        </View>
                        <View style={{ height: 50 }}></View>
                        <ModButton title="Verificar" fontWeight='bold' textColor="black" style={styles.button} onPress={() => { manejarVerificacion(); }} />
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