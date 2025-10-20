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
    
    // Estados para manejar errores de validación
    const [errors, setErrors] = useState({
        nombre: '',
        codigo: '',
        carrera: '',
        correo: '',
        contrasena: ''
    });
    
    const router = useRouter();

    // Función para validar campos vacíos
    const validateEmptyFields = () => {
        const newErrors = {
            nombre: '',
            codigo: '',
            carrera: '',
            correo: '',
            contrasena: ''
        };

        if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido';
        if (!codigo.trim()) newErrors.codigo = 'El código universitario es requerido';
        if (!carrera.trim()) newErrors.carrera = 'La carrera es requerida';
        if (!correo.trim()) newErrors.correo = 'El correo es requerido';
        if (!contrasena.trim()) newErrors.contrasena = 'La contraseña es requerida';

        setErrors(newErrors);
        return Object.values(newErrors).every(error => error === '');
    };

    // Función para validar formato de correo
    const validateEmail = (email: string) => {
        // Validar que tenga el dominio correcto
        if (!email.endsWith('@utp.edu.pe')) {
            return 'El correo debe tener el dominio @utp.edu.pe';
        }
        
        // Validar que comience con 'u' y el resto sean números
        const emailPrefix = email.split('@')[0];
        const emailRegex = /^u\d+$/;
        
        if (!emailRegex.test(emailPrefix)) {
            return 'El correo debe comenzar con "u" seguido de números (ej: u20201234@utp.edu.pe)';
        }
        
        return '';
    };

    const validateCodigo = (codigo: string) => {
        const codigoRegex = /^u\d+$/;
        if (!codigoRegex.test(codigo)) {
            return 'El código debe comenzar con "u" seguido de números (ej: u20201234)';
        }
        return '';
    };

    // Función para limpiar errores cuando el usuario escriba
    const clearError = (field: string) => {
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

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
        // Validar campos vacíos
        if (!validateEmptyFields()) {
            return;
        }

        // Validar formato de correo
        const emailError = validateEmail(correo);
        if (emailError) {
            setErrors(prev => ({ ...prev, correo: emailError }));
            return;
        }

        const codigoError = validateCodigo(codigo);
        if (codigoError) {
            setErrors(prev => ({ ...prev, codigo: codigoError }));
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
                    style={[styles.input, errors.nombre && styles.inputError]}
                    placeholder="Nombre y apellido"
                    value={nombre}
                    onChangeText={(text) => {
                        setNombre(text);
                        clearError('nombre');
                    }}
                />
                {errors.nombre ? <Text style={styles.errorText}>{errors.nombre}</Text> : null}
                <View style={{ height: 10 }}></View>
                <Text style={styles.texto}>Codigo Universitario</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={[styles.input, errors.codigo && styles.inputError]}
                    placeholder="Código"
                    value={codigo}
                    onChangeText={(text) => {
                        setCodigo(text);
                        clearError('codigo');
                    }}
                />
                {errors.codigo ? <Text style={styles.errorText}>{errors.codigo}</Text> : null}
                <View style={{ height: 10 }}></View>
                <Text style={styles.texto}>Carrera y Facultad</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={[styles.input, errors.carrera && styles.inputError]}
                    placeholder="Carrera"
                    value={carrera}
                    onChangeText={(text) => {
                        setCarrera(text);
                        clearError('carrera');
                    }}
                />
                {errors.carrera ? <Text style={styles.errorText}>{errors.carrera}</Text> : null}
                <View style={{ height: 10 }}></View>
                <Text style={styles.texto}>Correo</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={[styles.input, errors.correo && styles.inputError]}
                    placeholder="Correo"
                    value={correo}
                    onChangeText={(text) => {
                        setCorreo(text);
                        clearError('correo');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                {errors.correo ? <Text style={styles.errorText}>{errors.correo}</Text> : null}
                <View style={{ height: 10 }}></View>
                <Text style={styles.texto}>Contraseña</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={[styles.input, errors.contrasena && styles.inputError]}
                    placeholder="Contraseña"
                    value={contrasena}
                    secureTextEntry
                    onChangeText={(text) => {
                        setContrasena(text);
                        clearError('contrasena');
                    }}
                />
                {errors.contrasena ? <Text style={styles.errorText}>{errors.contrasena}</Text> : null}
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
    }
});
