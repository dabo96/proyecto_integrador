import ModButton from '@/components/ModButton';
import { db } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

export default function CambiarContrasena() {
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserID, setCurrentUserID] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const usuarioID = await AsyncStorage.getItem('usuarioID');
        if (usuarioID) {
          setCurrentUserID(usuarioID);
        } else {
          setError('No se encontró información del usuario. Por favor, inicia sesión nuevamente.');
        }
      } catch (error) {        setError('Error al cargar información del usuario');
      }
    };
    loadCurrentUser();
  }, []);

  const handleChangePassword = async () => {
    // Limpiar error previo
    setError('');

    if (!currentUserID) {
      setError('No se encontró información del usuario. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (!contrasenaActual.trim() || !nuevaContrasena.trim() || !confirmarContrasena.trim()) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (nuevaContrasena.trim() === contrasenaActual.trim()) {
      setError('La nueva contraseña debe ser diferente a la actual');
      return;
    }

    setLoading(true);

    try {
      // Obtener usuario directamente por ID
      const userRef = doc(db, 'Usuarios', currentUserID);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setError('Usuario no encontrado');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();

      // Verificar contraseña actual (exactamente como en el login)
      const passwordStored = userData?.contrasena || userData?.contraseña;
      const contrasenaActualTrimmed = contrasenaActual.trim();

      // Logs para depuración
      if (!passwordStored) {
        setError('No se encontró la contraseña en la base de datos');
        setLoading(false);
        return;
      }

      // Comparación exacta como en el login
      if (passwordStored !== contrasenaActualTrimmed) {
        setError('La contraseña actual es incorrecta');
        setLoading(false);
        return;
      }

      // Actualizar contraseña
      await updateDoc(userRef, {
        contrasena: nuevaContrasena.trim(),
        updatedAt: new Date(),
      });

      // Limpiar campos
      setContrasenaActual('');
      setNuevaContrasena('');
      setConfirmarContrasena('');
      setError('');
      
      // Limpiar sesión del usuario para que tenga que iniciar sesión de nuevo
      await AsyncStorage.removeItem('usuarioID');
      await AsyncStorage.removeItem('usuarioNombre');
      
      setLoading(false);
      
      // Mostrar aviso de éxito
      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña ha sido actualizada correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => {
              router.replace('/iniciarSesion');
            }
          }
        ]
      );
      
      // Redirigir automáticamente después de 2 segundos si el usuario no presiona el botón
      setTimeout(() => {
        router.replace('/iniciarSesion');
      }, 2000);
    } catch (error: any) {      setError('Hubo un problema al cambiar la contraseña. Intenta nuevamente.');
      Alert.alert('Error', 'Hubo un problema al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#2F4AA6', '#0491C6']} style={StyleSheet.absoluteFill}>
      <View style={styles.container}>
        <Text style={styles.title}>Cambiar Contraseña</Text>
        <View style={{ height: 30 }} />

        <Text style={styles.label}>Contraseña Actual</Text>
        <TextInput
          style={styles.input}
          placeholder="Contraseña actual"
          secureTextEntry
          value={contrasenaActual}
          onChangeText={setContrasenaActual}
        />

        <Text style={styles.label}>Nueva Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Nueva contraseña"
          secureTextEntry
          value={nuevaContrasena}
          onChangeText={setNuevaContrasena}
        />

        <Text style={styles.label}>Confirmar Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Repite la nueva contraseña"
          secureTextEntry
          value={confirmarContrasena}
          onChangeText={setConfirmarContrasena}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={{ height: 30 }} />

        <ModButton 
          title={loading ? 'Actualizando...' : 'Actualizar Contraseña'} 
          style={styles.button} 
          onPress={handleChangePassword}
          disabled={loading}
        />

        <View style={{ height: 20 }} />
        <ModButton
          title="Volver al Perfil"
          style={{ ...styles.button, borderColor: '#fff', backgroundColor: 'transparent' }}
          onPress={() => router.push('/tabs/profile')}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  label: {
    color: 'white',
    alignSelf: 'flex-start',
    paddingHorizontal: 50,
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    height: 40,
    width: 300,
    backgroundColor: 'white',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  button: {
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    width: 300,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 5,
  },
});
