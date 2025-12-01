import ModButton from '@/components/ModButton';
import { db } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

// Datos de facultades y carreras
const facultades = [
    { id: '1', nombre: 'Facultad de Ingeniería' },
    { id: '2', nombre: 'Facultad de Ciencias Empresariales' },
    { id: '3', nombre: 'Facultad de Ciencias de la Salud' },
    { id: '4', nombre: 'Facultad de Ciencias y Humanidades' },
    { id: '5', nombre: 'Facultad de Arquitectura y Urbanismo' },
    { id: '6', nombre: 'Facultad de Ciencias Agrarias' }
];

const carreras = {
    '1': [ // Facultad de Ingeniería
        { id: '1', nombre: 'Ingeniería de Sistemas' },
        { id: '2', nombre: 'Ingeniería Civil' },
        { id: '3', nombre: 'Ingeniería Industrial' },
        { id: '4', nombre: 'Ingeniería Mecánica' },
        { id: '5', nombre: 'Ingeniería Electrónica' },
        { id: '6', nombre: 'Ingeniería Química' }
    ],
    '2': [ // Facultad de Ciencias Empresariales
        { id: '7', nombre: 'Administración' },
        { id: '8', nombre: 'Contabilidad' },
        { id: '9', nombre: 'Economía' },
        { id: '10', nombre: 'Marketing' },
        { id: '11', nombre: 'Negocios Internacionales' }
    ],
    '3': [ // Facultad de Ciencias de la Salud
        { id: '12', nombre: 'Medicina' },
        { id: '13', nombre: 'Enfermería' },
        { id: '14', nombre: 'Farmacia' },
        { id: '15', nombre: 'Odontología' },
        { id: '16', nombre: 'Psicología' }
    ],
    '4': [ // Facultad de Ciencias y Humanidades
        { id: '17', nombre: 'Educación' },
        { id: '18', nombre: 'Comunicación' },
        { id: '19', nombre: 'Derecho' },
        { id: '20', nombre: 'Trabajo Social' },
        { id: '21', nombre: 'Turismo' }
    ],
    '5': [ // Facultad de Arquitectura y Urbanismo
        { id: '22', nombre: 'Arquitectura' },
        { id: '23', nombre: 'Urbanismo' },
        { id: '24', nombre: 'Diseño Gráfico' },
        { id: '25', nombre: 'Diseño de Interiores' }
    ],
    '6': [ // Facultad de Ciencias Agrarias
        { id: '26', nombre: 'Agronomía' },
        { id: '27', nombre: 'Medicina Veterinaria' },
        { id: '28', nombre: 'Zootecnia' },
        { id: '29', nombre: 'Ingeniería Agrícola' }
    ]
};

export default function RegisterScreen() {
    const [nombres, setNombres] = useState('');
    const [apellidos, setApellidos] = useState('');
    const [codigoUniversitario, setCodigoUniversitario] = useState('');
    const [facultadSeleccionada, setFacultadSeleccionada] = useState('');
    const [carreraSeleccionada, setCarreraSeleccionada] = useState('');
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');

    // Estados para manejar errores de validación
    const [errors, setErrors] = useState({
        nombres: '',
        apellidos: '',
        codigoUniversitario: '',
        facultad: '',
        carrera: '',
        correo: '',
        contrasena: ''
    });

    const router = useRouter();

    // Función para validar campos vacíos
    const validateEmptyFields = () => {
        const newErrors = {
            nombres: '',
            apellidos: '',
            codigoUniversitario: '',
            facultad: '',
            carrera: '',
            correo: '',
            contrasena: ''
        };

        if (!nombres.trim()) newErrors.nombres = 'Los nombres son requeridos';
        if (!apellidos.trim()) newErrors.apellidos = 'Los apellidos son requeridos';
        if (!codigoUniversitario.trim()) newErrors.codigoUniversitario = 'El código universitario es requerido';
        if (!facultadSeleccionada) newErrors.facultad = 'La facultad es requerida';
        if (!carreraSeleccionada) newErrors.carrera = 'La carrera es requerida';
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

    // Función para manejar el cambio de facultad
    const handleFacultadChange = (facultadId: string) => {
        setFacultadSeleccionada(facultadId);
        setCarreraSeleccionada(''); // Limpiar carrera cuando cambie la facultad
        clearError('facultad');
        clearError('carrera');
    };

    // Función para manejar el cambio de carrera
    const handleCarreraChange = (carreraId: string) => {
        setCarreraSeleccionada(carreraId);
        clearError('carrera');
    };

    // Función para obtener el nombre de la facultad seleccionada
    const getFacultadNombre = () => {
        const facultad = facultades.find(f => f.id === facultadSeleccionada);
        return facultad ? facultad.nombre : '';
    };

    // Función para obtener el nombre de la carrera seleccionada
    const getCarreraNombre = () => {
        if (!facultadSeleccionada) return '';
        const carrerasFacultad = carreras[facultadSeleccionada as keyof typeof carreras];
        const carrera = carrerasFacultad?.find(c => c.id === carreraSeleccionada);
        return carrera ? carrera.nombre : '';
    };

    const generateUniqueVerificationCode = async (): Promise<string> => {
        let unique = false;
        let newCode = '';
        const codesRef = collection(db, 'codAuth');

        while (!unique) {
            newCode = Math.floor(10000 + Math.random() * 90000).toString();
            const q = query(codesRef, where('code', '==', newCode), where('used', '==', false));
            const querySnapshot = await getDocs(q);
            unique = querySnapshot.empty;
        }
        return newCode;
    }

    const handleRegister = async () => {
        // Validar campos vacíos
        if (!validateEmptyFields()) {
            return;
        }

        // Validar formato de correo
        const correoNormalizado = correo.trim().toLowerCase();
        const emailError = validateEmail(correoNormalizado);
        if (emailError) {
            setErrors(prev => ({ ...prev, correo: emailError }));
            return;
        }

        const codigoError = validateCodigo(codigoUniversitario.trim());
        if (codigoError) {
            setErrors(prev => ({ ...prev, codigoUniversitario: codigoError }));
            return;
        }

        try {
            const usuariosRef = collection(db, 'Usuarios');

            // Validar que no exista usuario con el mismo correo
            const correoQuery = query(usuariosRef, where('correo', '==', correoNormalizado));
            const correoSnapshot = await getDocs(correoQuery);
            if (!correoSnapshot.empty) {
                Alert.alert("Correo en uso", "Ya existe una cuenta registrada con este correo institucional.");
                return;
            }

            // Validar que no exista usuario con el mismo código universitario
            const codigoQuery = query(usuariosRef, where('codigoUniversitario', '==', codigoUniversitario.trim()));
            const codigoSnapshot = await getDocs(codigoQuery);
            if (!codigoSnapshot.empty) {
                Alert.alert("Código en uso", "Ya existe una cuenta registrada con este código universitario.");
                return;
            }

            const verificationCode = await generateUniqueVerificationCode();
            const nombreCompleto = `${nombres.trim()} ${apellidos.trim()}`.replace(/\s+/g, ' ').trim();

            const userRef = await addDoc(usuariosRef, {
                nombres: nombres.trim(),
                apellidos: apellidos.trim(),
                nombreCompleto,
                codigoUniversitario: codigoUniversitario.trim(),
                facultad: getFacultadNombre(),
                carrera: getCarreraNombre(),
                correo: correoNormalizado,
                contrasena: contrasena.trim(),
                verificado: false,
                indice_conducta: 5,
                fotoPerfil: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            await setDoc(doc(db, 'codAuth', userRef.id), {
                usuarioID: userRef.id,
                correo: correoNormalizado,
                code: verificationCode,
                used: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            await addDoc(collection(db, "mailEnviado"), {
                to: correoNormalizado,
                message: {
                    subject: "Código de verificación | Link U",
                    text: `Hola ${nombreCompleto}, tu código de verificación es: ${verificationCode}`,
                    html: `<p>Hola <strong>${nombreCompleto}</strong>,</p><p>Tu código de verificación es: <strong>${verificationCode}</strong></p>`,
                },
            });

            await AsyncStorage.multiSet([
                ['pendingVerificationUserID', userRef.id],
                ['pendingVerificationEmail', correoNormalizado],
            ]);

            Alert.alert(
                "Registro exitoso",
                "Hemos enviado un código de verificación a tu correo institucional. Ingrésalo en la siguiente pantalla."
            );

            router.push({ pathname: './autCuenta', params: { correo: correoNormalizado } });
        } catch (error: any) {            Alert.alert("Error", "Hubo un problema al registrar el usuario. Inténtalo de nuevo.");
        }
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <LinearGradient
                    colors={['#2F4AA6', '#0491C6']}
                    style={StyleSheet.absoluteFill}
                >
                    <View style={styles.background}>
                        <Text style={styles.subtitle}>Crea tu cuenta</Text>
                        <View style={{ height: 40 }} />

                        <Text style={styles.texto}>Nombres</Text>
                        <View style={{ height: 10 }} />
                        <TextInput
                            style={[styles.input, errors.nombres && styles.inputError]}
                            placeholder="Tus nombres"
                            value={nombres}
                            onChangeText={(text) => {
                                setNombres(text);
                                clearError('nombres');
                            }}
                        />
                        {errors.nombres ? <Text style={styles.errorText}>{errors.nombres}</Text> : null}

                        <View style={{ height: 10 }} />
                        <Text style={styles.texto}>Apellidos</Text>
                        <View style={{ height: 10 }} />
                        <TextInput
                            style={[styles.input, errors.apellidos && styles.inputError]}
                            placeholder="Tus apellidos"
                            value={apellidos}
                            onChangeText={(text) => {
                                setApellidos(text);
                                clearError('apellidos');
                            }}
                        />
                        {errors.apellidos ? <Text style={styles.errorText}>{errors.apellidos}</Text> : null}

                        <View style={{ height: 10 }} />
                        <Text style={styles.texto}>Código Universitario</Text>
                        <View style={{ height: 10 }} />
                        <TextInput
                            style={[styles.input, errors.codigoUniversitario && styles.inputError]}
                            placeholder="Ej: u20201234"
                            value={codigoUniversitario}
                            onChangeText={(text) => {
                                setCodigoUniversitario(text);
                                clearError('codigoUniversitario');
                            }}
                            autoCapitalize="none"
                        />
                        {errors.codigoUniversitario ? <Text style={styles.errorText}>{errors.codigoUniversitario}</Text> : null}

                        <View style={{ height: 10 }} />
                        <Text style={styles.texto}>Facultad</Text>
                        <View style={{ height: 10 }} />
                        <View style={[styles.pickerContainer, errors.facultad && styles.inputError]}>
                            <Picker
                                selectedValue={facultadSeleccionada}
                                onValueChange={handleFacultadChange}
                                style={styles.picker}
                            >
                                <Picker.Item label="Selecciona una facultad" value="" />
                                {facultades.map((facultad) => (
                                    <Picker.Item
                                        key={facultad.id}
                                        label={facultad.nombre}
                                        value={facultad.id}
                                    />
                                ))}
                            </Picker>
                        </View>
                        {errors.facultad ? <Text style={styles.errorText}>{errors.facultad}</Text> : null}

                        <View style={{ height: 10 }} />
                        <Text style={styles.texto}>Carrera</Text>
                        <View style={{ height: 10 }} />
                        <View style={[styles.pickerContainer, errors.carrera && styles.inputError]}>
                            <Picker
                                selectedValue={carreraSeleccionada}
                                onValueChange={handleCarreraChange}
                                style={styles.picker}
                                enabled={!!facultadSeleccionada}
                            >
                                <Picker.Item label="Selecciona una carrera" value="" />
                                {facultadSeleccionada && carreras[facultadSeleccionada as keyof typeof carreras]?.map((carrera) => (
                                    <Picker.Item
                                        key={carrera.id}
                                        label={carrera.nombre}
                                        value={carrera.id}
                                    />
                                ))}
                            </Picker>
                        </View>
                        {errors.carrera ? <Text style={styles.errorText}>{errors.carrera}</Text> : null}

                        <View style={{ height: 10 }} />
                        <Text style={styles.texto}>Correo institucional</Text>
                        <View style={{ height: 10 }} />
                        <TextInput
                            style={[styles.input, errors.correo && styles.inputError]}
                            placeholder="Ej: u20201234@utp.edu.pe"
                            value={correo}
                            onChangeText={(text) => {
                                setCorreo(text);
                                clearError('correo');
                            }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {errors.correo ? <Text style={styles.errorText}>{errors.correo}</Text> : null}

                        <View style={{ height: 10 }} />
                        <Text style={styles.texto}>Contraseña</Text>
                        <View style={{ height: 10 }} />
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

                        <View style={{ height: 40 }} />

                        <ModButton title="Registrarme" style={styles.button} onPress={handleRegister} />
                        <View style={{ height: 40 }} />
                    </View>
                </LinearGradient>
            </ScrollView>
        </KeyboardAvoidingView>
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
        width: "90%",
        maxWidth: 400,
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
        alignSelf: 'center',
        width: "90%",
        maxWidth: 400,
        paddingHorizontal: 0,
    },
    textPressed: {
        color: '#000',
    },

    input: {
        height: 40,
        paddingHorizontal: 10,
        borderWidth: 1,
        width: "90%",
        maxWidth: 400,
        backgroundColor: 'white',
        borderRadius: 5,
        borderColor: '#fff',
    },
    pickerContainer: {
        height: 40,
        borderWidth: 1,
        width: "90%",
        maxWidth: 400,
        backgroundColor: 'white',
        borderRadius: 5,
        borderColor: '#fff',
        justifyContent: 'center',
    },
    picker: {
        height: 40,
        width: "100%",
        color: '#000',
    },
    inputError: {
        borderColor: '#ff4444',
        borderWidth: 2,
    },
    errorText: {
        color: '#ff4444',
        fontSize: 12,
        marginTop: 5,
        width: "90%",
        maxWidth: 400,
        alignSelf: 'center',
        fontFamily: 'Montserrat_400Regular',
    }
});
