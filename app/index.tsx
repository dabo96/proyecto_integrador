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
        <Pressable style={
          ({ pressed }) => [styles.button,
          pressed && styles.buttonPressed]}
          onPress={() => { router.push('../iniciarSesion') }}
        >
          {({ pressed }) => (
            <Text style={[styles.texto, pressed && styles.textPressed]}>
              {pressed ? 'Iniciar sesión' : 'Iniciar sesión'}
            </Text>
          )}
        </Pressable>
        <View style={{ height: 10 }}></View>
        <Pressable style={
          ({ pressed }) => [styles.button,
          pressed && styles.buttonPressed]}
          onPress={() => { router.push('./registro') }}
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
  }
});
//tomografia vascular
/*

  1. loggin:

  - Iniciar sesión con correo universitario -> te redirecciona a la página de inicio de sesión -> inicio de sesión exitoso -> pagina de inicio
  - Registrarse con correo universitario -> te redirecciona a la página de registro -> registro exitoso -> página de inicio de sesión -> inicio de sesión exitoso -> pagina de inicio


  2. página de inicio:
  * botones principales
    - Botón de home -> te redirecciona a la página de inicio
    - Botón para ver perfil -> te redirecciona a la página de perfil
    - Botón de notificaciones -> te redirecciona a la página de notificaciones
    - Botón para crear publicación -> te redirecciona a la página de crear publicación
    - Botón de chat -> te redirecciona a la página de chat
    - Botón de comunidades -> te redirecciona a la página de comunidades
    - Botón de buscar -> te redirecciona a la pantalla de búsqueda

   * barra de búsqueda -> te permite buscar publicaciones, usuarios y comunidades

   * feed de publicaciones ->  muestra las publicaciones recientes de los usuarios y comunidades que sigues acompañado de botones comentarios, likes
   * botón de reportar -> te permite reportar publicaciones inapropiadas
   * botón de comentarios -> te permite ver y agregar comentarios a las publicaciones
   * botón de likes -> te permite dar like a las publicaciones

  3. página de perfil:
   - muestra la información del usuario, sus publicaciones
   - botón foto de perfil -> te permite cambiar tu foto de perfil
   - botón de editar perfil -> te permite editar tu información personal -> contraseña
   - muestra cantidad de seguidores y seguidos -> te permite ver la lista de seguidores y seguidos
   - botón de cerrar sesión -> te permite cerrar sesión y te redirecciona a la página de inicio de sesión
   - mostrar información de score
   - botón de cambiar contraseña -> te permite cambiar tu contraseña actual por una nueva
 */
