import ModButton from '@/components/ModButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
        <Text style={styles.subtitle}>Empecemos</Text>
        <View style={{ height: 10 }}></View>
        <ModButton title='Iniciar sesión' style={styles.button} pressedStyle={styles.buttonPressed} pressedTextColor="#0491C6" onPress={()=>{ router.push('./iniciarSesion') }}/>
        <View style={{ height: 10 }}></View>
        <ModButton title='Registrarse' style={styles.button} pressedStyle={styles.buttonPressed} pressedTextColor="#0491C6" onPress={()=>{ router.push('./registro') }}/>
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
    color: '#0491C6'
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
  }
});
