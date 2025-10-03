import ModButton from '@/components/ModButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';

export default function RegisterScreen() {
    const [nombre, setNombre] = useState('');
    const [codigo, setCodigo] = useState('');
    const [carrera, setCarrera] = useState('');
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    //
    const router = useRouter();
    //

    const generateUniqueCode = async (): Promise<string> => {
        let unique = false;
        let newCode = '';
        const codesRef = collection(db, 'Codigos');

        while(!unique) {
            newCode = Math.floor(10000 + Math.random() * 90000).toString();

            const q = query(codesRef, where('code', '==', newCode));
            const querySnapshot = await getDocs(q);
            if(querySnapshot.empty) {
                unique = true;
            }
        }
        return newCode;
    }

    const handleRegister = async () => {
        if (!nombre || !codigo || !carrera || !correo || !contrasena) {
            alert('Por favor, completa todos los campos.');
            return;
        }

        try{
            const codigo = await generateUniqueCode();
            const userRef = await addDoc(collection(db, 'Usuarios'), {
                nombre,
                codigo,
                carrera,
                correo,
                contrasena,
                verificado: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            console.log("Usuario creado: ", userRef.id);

            const codeRef = await addDoc(collection(db, 'codAuth'), {
                code: codigo,
                correo,
                used: false,
                createdAt: new Date(),
            });

            console.log("Codigo creado: ", codeRef.id);
            
            const mailRef = await addDoc(collection(db, "mailEnviado"), {
                to: correo,
                message: {
                    subject: "Código de verificación",
                    text: `Tu código de verificación es: ${codigo}`,
                    html: `<p>Tu código de verificación es: <b>${codigo}</b></p>`,
                },
            });

            console.log("Mail creado: ", mailRef.id);
            console.log("db: " + db.app.name);
            console.log("id: " + db.app.options.projectId);

            router.push('./autCuenta');
        } catch (error : any) {
            console.error(error);
            Alert.alert("Error", "Hubo un problema al registrar el usuario. Inténtalo de nuevo.");
        }
    }

    return (
        <LinearGradient
            colors={['#2F4AA6', '#0491C6']}
            style={StyleSheet.absoluteFill}
        >
            <View style={styles.background}>
                <Text style={styles.subtitle}>Empecemos</Text>
                <View style={{ height: 50 }}></View>
                <Text style={styles.texto}>Nombre y Apellido</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={styles.input}
                    placeholder="Nombre y apellido"
                    onChangeText={setNombre}
                />
                <View style={{ height: 10 }}></View>
                <Text style={styles.texto}>Codigo Universitario</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={styles.input}
                    placeholder="Código"
                    onChangeText={setCodigo}
                />
                <View style={{ height: 10 }}></View>
                <Text style={styles.texto}>Carrera y Facultad</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={styles.input}
                    placeholder="Carrera"
                    onChangeText={setCarrera}
                />
                <View style={{ height: 10 }}></View>
                <Text style={styles.texto}>Correo</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={styles.input}
                    placeholder="Correo"
                    onChangeText={setCorreo}
                />
                <View style={{ height: 10 }}></View>
                <Text style={styles.texto}>Contraseña</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    secureTextEntry
                    onChangeText={setContrasena}
                />
                <View style={{ height: 50 }}></View>

                <ModButton title="Registrar" style={styles.button} onPress={() => { handleRegister(); }} />
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

    button: {
        borderWidth: 2,
        borderColor: "#fff",
        backgroundColor: "transparent",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: "center",
        width: 300,
    },

    buttonPressed: {
        backgroundColor: '#fff',
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
        textAlign: 'left',
        alignSelf: 'flex-start',
        paddingHorizontal: 50,
    },
    textPressed: {
        color: '#000',
    },

    input: {
        height: 40,
        paddingHorizontal: 10,
        borderWidth: 1,
        width: 300,
        backgroundColor: 'white',
        borderRadius: 5,
        borderColor: '#fff',
    }
});
