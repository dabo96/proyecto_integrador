import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function HomeScreen() {
    return (
        <LinearGradient
            colors={['#2F4AA6', '#0491C6']}
            style={StyleSheet.absoluteFill}
        >
            <View style={styles.background}>
                <Text style={styles.subtitle}>Contraseña Actual</Text>
                <View style={{ height: 50 }}></View>

                {/* OPCIÓN 1: Texto centrado completamente */}
                <Text style={styles.textoCentrado}>Contraseña nueva</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={styles.input}
                    placeholder="Nueva Contraseña"
                />

                {/* OPCIÓN 2: Usar un contenedor para centrar */}
                <View style={{ height: 10 }}></View>
                <View style={styles.labelContainer}>
                    <Text style={styles.texto}>Nueva Contraseña</Text>
                </View>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={styles.input}
                    placeholder="Confirmar contraseña"
                    secureTextEntry
                />

                <View style={{ height: 10 }}></View>
                <View style={{ height: 10 }}></View>
                <View style={styles.labelContainer}>
                    <Text style={styles.texto}>Confirmar contraseña</Text>
                </View>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={styles.input}
                    placeholder="Confirmar contraseña"
                    secureTextEntry
                />
                <View style={{ height: 50 }}></View>
                <Pressable style={
                    ({ pressed }) => [styles.button,
                    pressed && styles.buttonPressed]}
                    onPress={() => { }}
                >
                    {({ pressed }) => (
                        <Text style={[{
                            textAlign: 'center',
                            color: 'white',
                            fontFamily: 'Montserrat_400Regular',
                            fontSize: 16
                        }, pressed && styles.textPressed]}>
                            Actualizar
                        </Text>
                    )}
                </Pressable>
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

    // OPCIÓN 1: Texto original pero centrado
    textoCentrado: {
        color: 'white',
        fontFamily: 'Montserrat_400Regular',
        fontSize: 16,
        textAlign: 'center', // Centrado
        width: 300, // Mismo ancho que el input
    },

    // OPCIÓN 2: Contenedor para centrar el texto
    labelContainer: {
        width: 300,
        alignItems: 'center', // Centra el contenido del contenedor
    },

    // Texto original (alineado a la izquierda)
    texto: {
        color: 'white',
        fontFamily: 'Montserrat_400Regular',
        fontSize: 16,
        textAlign: 'left',
        alignSelf: 'flex-start',
        paddingHorizontal: 50,
    },

    // OPCIÓN 3: Texto personalizado con más opciones
    textoPersonalizado: {
        color: 'white',
        fontFamily: 'Montserrat_400Regular',
        fontSize: 18, // Tamaño más grande
        textAlign: 'center',
        width: 300,
        fontWeight: 'bold', // Negrita
        marginVertical: 5, // Espaciado vertical
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