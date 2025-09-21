import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function HomeScreen() {
    const router = useRouter();

    return (
        <LinearGradient
            colors={['#2F4AA6', '#0491C6']}
            style={StyleSheet.absoluteFill}
        >
            <View style={styles.background}>
                <Text style={styles.title}>Link U</Text>
                <View style={{ height: 400 }}></View>
                <Text style={styles.subtitle}>Bienvenidos</Text>
                <View style={{ height: 10 }}></View>
                <Text style={styles.texto}>Codigo Universitario</Text>
                <View style={{ height: 10 }}></View>
                <TextInput
                    style={styles.input}
                    placeholder="Código"
                />
                <View style={{ height: 10 }}></View>
                <Pressable style={
                    ({ pressed }) => [styles.button,
                    pressed && styles.buttonPressed]}
                    onPress={() => { }}
                >
                    {({ pressed }) => (
                        <Text style={[styles.texto, pressed && styles.textPressed]}>
                            {pressed ? 'Registrarse' : 'Registrarse'}
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