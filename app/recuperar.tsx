import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TextInput, View, Alert } from 'react-native';
import { useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import ModButton from '@/components/ModButton';

export default function RecuperarScreen() {
    const router = useRouter();

    const [correo, setCorreo] = useState('');
    const [nuevaContrasena, setNuevaContrasena] = useState('');
    const [confirmarContrasena, setConfirmarContrasena] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async () => {
        if (!correo || !nuevaContrasena || !confirmarContrasena) {
            Alert.alert("Error", "Por favor completa todos los campos");
            return;
        }

        if (nuevaContrasena !== confirmarContrasena) {
            Alert.alert("Error", "Las contraseñas no coinciden");
            return;
        }

        setLoading(true);

        try {
            const q = query(collection(db, "Usuarios"), where("correo", "==", correo));
            const querySnapshot = await getDocs(q);
            console.log(querySnapshot.docs.map(d => d.data()))

            if (querySnapshot.empty) {
                Alert.alert("Error", "No existe un usuario con ese correo");
                setLoading(false);
                return;
            }

            // Tomar el primer documento ya que el correo es único
            const userDoc = querySnapshot.docs[0];
            const userRef = doc(db, "Usuarios", userDoc.id);

            console.log(userDoc);

            await updateDoc(userRef, {
                contrasena: nuevaContrasena,
                updatedAt: new Date()
            });

            router.push("./iniciarSesion")

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Hubo un problema al actualizar la contraseña");
        }

        setLoading(false);
    };

    return (
        <LinearGradient
            colors={['#2F4AA6', '#0491C6']}
            style={StyleSheet.absoluteFill}
        >
            <View style={styles.background}>
                <Text style={styles.subtitle}>Recuperar Contraseña</Text>
                <View style={{ height: 30 }} />

                <Text style={styles.textoCentrado}>Correo</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Correo"
                    value={correo}
                    onChangeText={setCorreo}
                />

                <View style={{ height: 20 }} />
                <Text style={styles.textoCentrado}>Nueva Contraseña</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nueva Contraseña"
                    secureTextEntry
                    value={nuevaContrasena}
                    onChangeText={setNuevaContrasena}
                />

                <View style={{ height: 20 }} />
                <Text style={styles.textoCentrado}>Confirmar Contraseña</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Confirmar contraseña"
                    secureTextEntry
                    value={confirmarContrasena}
                    onChangeText={setConfirmarContrasena}
                />

                <View style={{ height: 40 }} />

                <ModButton style={styles.button} 
                    title={loading ? "Actualizando..." : "Actualizar"}
                    onPress={()=>{handlePasswordChange()}}/>
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
    subtitle: {
        color: 'white',
        fontSize: 24,
        textAlign: 'center',
        marginTop: 10,
        fontFamily: 'Montserrat_700Bold',
    },
    textoCentrado: {
        color: 'white',
        fontFamily: 'Montserrat_400Regular',
        fontSize: 16,
        textAlign: 'center',
        width: 300,
        marginBottom: 5
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
    }
});
