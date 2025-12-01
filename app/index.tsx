import ModButton from '@/components/ModButton';
import { db } from '@/services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const executeConnectAll = async () => {
    try {
      setLoading(true);
      console.log("🔄 Iniciando conexión masiva...");

      // 1. Obtener todos los usuarios
      const usuariosRef = collection(db, 'Usuarios');
      const usuariosSnapshot = await getDocs(usuariosRef);
      const usuarios = usuariosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      console.log(`👥 Total de usuarios encontrados: ${usuarios.length}`);

      let conexionesCreadas = 0;

      // 2. Iterar sobre cada usuario para crear conexiones
      for (const usuarioA of usuarios) {
        for (const usuarioB of usuarios) {
          // No seguirse a sí mismo
          if (usuarioA.id === usuarioB.id) continue;

          // Verificar si ya existe la conexión
          const contactosRef = collection(db, 'Usuarios', usuarioA.id, 'contactos');
          const q = query(contactosRef, where('seguidoID', '==', usuarioB.id));
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
            await addDoc(contactosRef, {
              seguidoID: usuarioB.id,
              fechaSeguimiento: serverTimestamp()
            });
            conexionesCreadas++;
            console.log(`✅ ${usuarioA.id} ahora sigue a ${usuarioB.id}`);
          }
        }
      }

      console.log(`✨ Proceso finalizado. Se crearon ${conexionesCreadas} nuevas conexiones.`);
      if (Platform.OS === 'web') {
        window.alert(`Éxito: Se han conectado todos los usuarios. Nuevas conexiones: ${conexionesCreadas}`);
      } else {
        Alert.alert("Éxito", `Se han conectado todos los usuarios. Nuevas conexiones: ${conexionesCreadas}`);
      }

    } catch (error) {
      console.error("❌ Error en conexión masiva:", error);
      if (Platform.OS === 'web') {
        window.alert("Error: Ocurrió un error al conectar los usuarios.");
      } else {
        Alert.alert("Error", "Ocurrió un error al conectar los usuarios.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAll = async () => {
    console.log("🔘 Botón Conectar Todos presionado");
    if (Platform.OS === 'web') {
      if (window.confirm("¿Estás seguro de que quieres que todos los usuarios se sigan entre sí?")) {
        await executeConnectAll();
      }
    } else {
      Alert.alert(
        "Conectar Todos",
        "¿Estás seguro de que quieres que todos los usuarios se sigan entre sí? Esto puede tardar unos momentos.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sí, conectar", onPress: executeConnectAll }
        ]
      );
    }
  };

  const executeDisconnectAll = async () => {
    try {
      setLoading(true);
      console.log("🗑️ Iniciando desconexión masiva...");

      const usuariosRef = collection(db, 'Usuarios');
      const usuariosSnapshot = await getDocs(usuariosRef);
      const usuarios = usuariosSnapshot.docs.map(doc => ({ id: doc.id }));

      let conexionesEliminadas = 0;

      for (const usuario of usuarios) {
        const contactosRef = collection(db, 'Usuarios', usuario.id, 'contactos');
        const contactosSnapshot = await getDocs(contactosRef);

        const deletePromises = contactosSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        conexionesEliminadas += deletePromises.length;
      }

      console.log(`✨ Rollback finalizado. Se eliminaron ${conexionesEliminadas} conexiones.`);
      if (Platform.OS === 'web') {
        window.alert(`Éxito: Rollback completado. Se eliminaron ${conexionesEliminadas} conexiones.`);
      } else {
        Alert.alert("Éxito", `Rollback completado. Se eliminaron ${conexionesEliminadas} conexiones.`);
      }

    } catch (error) {
      console.error("❌ Error en rollback:", error);
      if (Platform.OS === 'web') {
        window.alert("Error: Ocurrió un error al eliminar las conexiones.");
      } else {
        Alert.alert("Error", "Ocurrió un error al eliminar las conexiones.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectAll = async () => {
    console.log("🔘 Botón Desconectar Todos presionado");
    if (Platform.OS === 'web') {
      if (window.confirm("¿Estás seguro de que quieres ELIMINAR TODAS las conexiones?")) {
        await executeDisconnectAll();
      }
    } else {
      Alert.alert(
        "Desconectar Todos (Rollback)",
        "¿Estás seguro de que quieres ELIMINAR TODAS las conexiones entre usuarios? Esta acción no se puede deshacer.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sí, eliminar todo", style: "destructive", onPress: executeDisconnectAll }
        ]
      );
    }
  };

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
        <ModButton title='Iniciar sesión' style={styles.button} pressedStyle={styles.buttonPressed} pressedTextColor="#0491C6" onPress={() => { router.push('./iniciarSesion') }} />
        <View style={{ height: 10 }}></View>
        <ModButton title='Registrarse' style={styles.button} pressedStyle={styles.buttonPressed} pressedTextColor="#0491C6" onPress={() => { router.push('./registro') }} />
        <View style={{ height: 20 }}></View>

        {/* Botones temporales para desarrollo */}
        <ModButton
          title={loading ? 'Procesando...' : 'Conectar Todos (Dev)'}
          style={styles.buttonDev}
          pressedStyle={styles.buttonPressed}
          pressedTextColor="#0491C6"
          onPress={handleConnectAll}
          disabled={loading}
        />
        <View style={{ height: 10 }}></View>
        <ModButton
          title={loading ? 'Procesando...' : 'Desconectar Todos (Rollback)'}
          style={styles.buttonRollback}
          pressedStyle={styles.buttonPressed}
          pressedTextColor="#ff4444"
          onPress={handleDisconnectAll}
          disabled={loading}
        />
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

  buttonDev: {
    borderWidth: 2,
    borderColor: "#FFD700",
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    width: 300,
  },

  buttonRollback: {
    borderWidth: 2,
    borderColor: "#ff4444",
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
