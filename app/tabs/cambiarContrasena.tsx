import ModButton from '@/components/ModButton';
import { db } from '@/services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

export default function CambiarContrasena() {
  const [correo, setCorreo] = useState('');
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChangePassword = async () => {
    if (!correo.trim() || !contrasenaActual.trim() || !nuevaContrasena.trim() || !confirmarContrasena.trim()) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    try {
      const q = query(collection(db, 'Usuarios'), where('correo', '==', correo));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Correo no encontrado');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.contrasena !== contrasenaActual) {
        setError('La contraseña actual es incorrecta');
        return;
      }

      await updateDoc(doc(db, 'Usuarios', userDoc.id), {
        contrasena: nuevaContrasena,
        updatedAt: new Date(),
      });

      Alert.alert('Éxito', 'Tu contraseña ha sido actualizada correctamente');
      // 🔹 No se redirige automáticamente
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Hubo un problema al cambiar la contraseña.');
    }
  };

  return (
    <LinearGradient colors={['#2F4AA6', '#0491C6']} style={StyleSheet.absoluteFill}>
      <View style={styles.container}>
        <Text style={styles.title}>Cambiar Contraseña</Text>
        <View style={{ height: 30 }} />

        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu correo @utp.edu.pe"
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
        />

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

        <ModButton title="Actualizar Contraseña" style={styles.button} onPress={handleChangePassword} />

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
