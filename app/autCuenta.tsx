import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View,ScrollView, Alert } from 'react-native';
import ModButton from '@/components/ModButton';
import { LinearGradient } from 'expo-linear-gradient';
import { getDocs, updateDoc, collection, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';

export default function AutCuenta() {
    const [input, setInput] = useState(['', '', '', '', '']);
    const router = useRouter();

    const manejarCambios = (texto: string, indice: number) => {
        const nuevosInputs = [...input];
        nuevosInputs[indice] = texto;
        setInput(nuevosInputs);
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

            if(data.correo) {
                const userQuery = query(collection(db, 'Usuarios'), where('correo', '==', data.correo));
                const userSnapshot = await getDocs(userQuery);

                if(!userSnapshot.empty) {
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
                    <TextInput
                        style={styles.input}
                        maxLength={1}
                        keyboardType='numeric'
                        onChangeText={ (t) => manejarCambios(t, 0) }
                    />
                    <TextInput
                        style={styles.input}
                        maxLength={1}
                        keyboardType='numeric'
                        onChangeText={ (t) => manejarCambios(t, 1) }
                    />
                    <TextInput
                        style={styles.input}
                        maxLength={1}
                        keyboardType='numeric'
                        onChangeText={ (t) => manejarCambios(t, 2) }
                    />
                    <TextInput
                        style={styles.input}
                        maxLength={1}
                        keyboardType='numeric'
                        onChangeText={ (t) => manejarCambios(t, 3) }
                    />
                    <TextInput
                        style={styles.input}
                        maxLength={1}
                        keyboardType='numeric'
                        onChangeText={ (t) => manejarCambios(t, 4) }
                    />
                </View>                
                <View style={{ height: 50 }}></View>
                <ModButton title="Verificar" fontWeight='bold' textColor = "black" style={styles.button} onPress={() => { manejarVerificacion(); }} />
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
        width:200,
    }
});