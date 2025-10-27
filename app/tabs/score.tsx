import { db } from '@/services/firebase';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Score() {
  const router = useRouter();
  const [nombre, setNombre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarNombreUsuario = async () => {
      try {
        // ✅ Cambiado de 'userID' a 'usuarioID' para coincidir con tus otros archivos
        const usuarioID = await AsyncStorage.getItem('usuarioID');
        if (!usuarioID) {
          console.warn('No se encontró usuarioID en AsyncStorage');
          setNombre('Usuario');
          setLoading(false);
          return;
        }

        console.log('🔹 UsuarioID obtenido:', usuarioID);

        // ✅ Colección correcta: "Usuarios"
        const userRef = doc(db, 'Usuarios', usuarioID);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          console.log('📘 Datos del usuario:', data);
          
          // ✅ Usar 'nombres' en lugar de 'nombre' para coincidir con tu estructura
          const nombreCompleto = data.nombres || data.nombre || 'Usuario';
          setNombre(nombreCompleto);
        } else {
          console.warn('⚠️ Usuario no encontrado en Firestore');
          setNombre('Usuario');
        }
      } catch (error) {
        console.error('❌ Error obteniendo nombre del usuario:', error);
        setNombre('Usuario');
      } finally {
        setLoading(false);
      }
    };

    cargarNombreUsuario();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2F4AA6" />
      </View>
    );
  }

  const primerNombre = nombre?.split(' ')[0] || 'Usuario';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/tabs/profile')} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>¡En hora buena, {primerNombre}!</Text>
      </View>

      <View style={styles.scoreBox}>
        <Text style={styles.scoreNumber}>4.8</Text>
        <Text style={styles.scoreLabel}>Promedio de satisfacción</Text>
        <Text style={styles.stars}>⭐⭐⭐⭐⭐</Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>• Interacción: 95%</Text>
        <Text style={styles.detailText}>• Puntualidad: 90%</Text>
        <Text style={styles.detailText}>• Reputación: 92%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2F4AA6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  backButton: { marginRight: 15 },
  headerText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  scoreBox: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    elevation: 3,
  },
  scoreNumber: { fontSize: 60, fontWeight: 'bold', color: '#2F4AA6' },
  scoreLabel: { fontSize: 16, color: '#555', marginBottom: 10 },
  stars: { fontSize: 20, color: '#FFD700' },
  details: { marginTop: 30, backgroundColor: 'white', padding: 20, borderRadius: 12 },
  detailText: { fontSize: 16, color: '#333', marginBottom: 10 },
});