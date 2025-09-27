import ModButton from '@/components/button/ModButton';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AutCuenta() {

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
                    />
                    <TextInput
                        style={styles.input}
                    />
                    <TextInput
                        style={styles.input}
                    />
                    <TextInput
                        style={styles.input}
                    />
                    <TextInput
                        style={styles.input}
                    />
                </View>                
                <View style={{ height: 50 }}></View>
                <ModButton title="Verificar" fontWeight='bold' textColor = "black" style={styles.button} onPress={() => { }} />
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