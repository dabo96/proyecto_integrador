import ModButton from "@/components/ModButton";
import CommunityCard from "@/components/cards/CommunityCard";
import { db } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { JSX, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Comunidad {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  creadorID: string;
  fechaCreacion: any;
  miembros: string[];
}

export default function ComunidadScreen(): JSX.Element {
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [todasComunidades, setTodasComunidades] = useState<Comunidad[]>([]);
  const [usuarioID, setUsuarioID] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gestionando, setGestionando] = useState(false);
  const router = useRouter();

  // Función para obtener imagen de comunidad
  const obtenerImagenComunidad = (nombreComunidad: string): string => {
    const comunidad = comunidades.find(c => c.nombre === nombreComunidad);
    return comunidad?.imagen || "https://picsum.photos/40/40";
  };

  // Función para cargar las comunidades del usuario
  const cargarComunidades = async () => {
    try {
      setLoading(true);
      
      // Obtener usuarioID del usuario actual
      const storedUsuarioID = await AsyncStorage.getItem('usuarioID');
      if (!storedUsuarioID) {
        setLoading(false);
        return;
      }
      
      setUsuarioID(storedUsuarioID);
      
      // Buscar todas las comunidades donde el usuario es miembro
      const comunidadesRef = collection(db, 'comunidades');
      const comunidadesSnapshot = await getDocs(comunidadesRef);
      
      const comunidadesArray: Comunidad[] = [];
      const todasComunidadesArray: Comunidad[] = [];
      
      comunidadesSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        
        // Verificar si el usuario es miembro de esta comunidad
        const miembros = data.miembros || [];
        const creadorID = data.creadorID || '';
        
        // Agregar a todas las comunidades
        todasComunidadesArray.push({
          id: docSnapshot.id,
          nombre: data.nombre,
          descripcion: data.descripcion,
          imagen: data.imagenUrl || 'https://picsum.photos/40/40',
          creadorID: data.creadorID,
          fechaCreacion: data.fechaCreacion,
          miembros: data.miembros || []
        });
        
        // Solo agregar a "comunidades" si el usuario es miembro
        if (miembros.includes(storedUsuarioID)) {
          comunidadesArray.push({
            id: docSnapshot.id,
            nombre: data.nombre,
            descripcion: data.descripcion,
            imagen: data.imagenUrl || 'https://picsum.photos/40/40',
            creadorID: data.creadorID,
            fechaCreacion: data.fechaCreacion,
            miembros: data.miembros || []
          });
        }
      });
      
      // Filtrar todas las comunidades para excluir las que el usuario creó
      const comunidadesDisponibles = todasComunidadesArray.filter(
        comunidad => comunidad.creadorID !== storedUsuarioID && !comunidadesArray.find(c => c.id === comunidad.id)
      );
      
      console.log('Comunidades cargadas (del usuario):', comunidadesArray);
      console.log('Todas las comunidades disponibles:', comunidadesDisponibles);
      
      setComunidades(comunidadesArray);
      setTodasComunidades(comunidadesDisponibles);
      
    } catch (error) {
      console.error('Error cargando comunidades:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarComunidades();
  }, []);

  const registrarMembresiaUsuario = async (userId: string, comunidad: Comunidad, rol: 'admin' | 'miembro') => {
    try {
      const payload = {
        comunidadID: comunidad.id,
        nombre: comunidad.nombre,
        descripcion: comunidad.descripcion,
        rol,
        fechaUnion: serverTimestamp(),
      };

      await setDoc(doc(db, 'Usuarios', userId, 'comunidades', comunidad.id), payload);
      // Compatibilidad con colecciones antiguas en minúscula
      await setDoc(doc(db, 'usuarios', userId, 'comunidades', comunidad.id), payload).catch(() => {});
    } catch (error) {
      console.warn('No se pudo registrar la membresía del usuario:', error);
    }
  };

  const eliminarMembresiaUsuario = async (userId: string, comunidadId: string) => {
    try {
      await deleteDoc(doc(db, 'Usuarios', userId, 'comunidades', comunidadId));
    } catch {}

    try {
      await deleteDoc(doc(db, 'usuarios', userId, 'comunidades', comunidadId));
    } catch {}
  };

  const handleJoinCommunity = async (comunidad: Comunidad) => {
    if (gestionando) return;

    const currentUser = usuarioID;
    if (!currentUser) {
      Alert.alert('Sesión expirada', 'Inicia sesión nuevamente para gestionar comunidades.');
      return;
    }

    setGestionando(true);
    try {
      const comunidadRef = doc(db, 'comunidades', comunidad.id);
      await updateDoc(comunidadRef, {
        miembros: arrayUnion(currentUser),
      });

      await registrarMembresiaUsuario(currentUser, comunidad, currentUser === comunidad.creadorID ? 'admin' : 'miembro');
      Alert.alert('Te uniste a la comunidad', `Ahora eres parte de ${comunidad.nombre}.`);
      await cargarComunidades();
    } catch (error) {
      console.error('Error al unirse a la comunidad:', error);
      Alert.alert('Error', 'No pudimos unirte a la comunidad. Inténtalo nuevamente.');
    } finally {
      setGestionando(false);
    }
  };

  const performLeaveCommunity = async (comunidad: Comunidad) => {
    if (gestionando) {
      console.log('⚠️ Ya hay una operación en curso');
      return;
    }

    const currentUser = usuarioID;
    if (!currentUser) {
      Alert.alert('Sesión expirada', 'Inicia sesión nuevamente para gestionar comunidades.');
      return;
    }

    if (comunidad.creadorID === currentUser) {
      Alert.alert(
        'Eres administrador',
        'Como administrador debes eliminar la comunidad para dejar de administrarla.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar comunidad',
            style: 'destructive',
            onPress: () => handleDeleteCommunity(comunidad),
          },
        ]
      );
      return;
    }

    console.log('🚪 Saliendo de la comunidad:', comunidad.nombre);
    setGestionando(true);
    try {
      // 1. Remover al usuario de la lista de miembros en la comunidad
      const comunidadRef = doc(db, 'comunidades', comunidad.id);
      await updateDoc(comunidadRef, {
        miembros: arrayRemove(currentUser),
      });
      console.log('✅ Usuario removido de la lista de miembros');

      // 2. Eliminar la membresía del usuario
      await eliminarMembresiaUsuario(currentUser, comunidad.id);
      console.log('✅ Membresía eliminada del usuario');

      Alert.alert('Saliste de la comunidad', `Ya no perteneces a ${comunidad.nombre}.`);
      await cargarComunidades();
    } catch (error) {
      console.error('❌ Error al salir de la comunidad:', error);
      Alert.alert('Error', `No pudimos procesar tu salida. ${error instanceof Error ? error.message : 'Inténtalo nuevamente.'}`);
    } finally {
      setGestionando(false);
    }
  };

  const handleLeaveCommunity = (comunidad: Comunidad) => {
    console.log('🚪 handleLeaveCommunity llamado para:', comunidad.nombre);
    const currentUser = usuarioID;
    if (!currentUser) {
      Alert.alert('Sesión expirada', 'Inicia sesión nuevamente para gestionar comunidades.');
      return;
    }

    Alert.alert(
      'Salir de la comunidad',
      `¿Deseas salir de ${comunidad.nombre}?`,
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => console.log('❌ Usuario canceló la salida')
        },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => {
            console.log('✅ Usuario confirmó la salida');
            performLeaveCommunity(comunidad);
          },
        },
      ]
    );
  };

  const performDeleteCommunity = async (comunidad: Comunidad) => {
    if (gestionando) {
      console.log('⚠️ Ya hay una operación en curso');
      return;
    }

    const currentUser = usuarioID;
    if (!currentUser) {
      Alert.alert('Sesión expirada', 'Inicia sesión nuevamente para gestionar comunidades.');
      return;
    }

    if (comunidad.creadorID !== currentUser) {
      Alert.alert('Error', 'Solo el creador puede eliminar la comunidad.');
      return;
    }

    console.log('🗑️ Eliminando comunidad:', comunidad.nombre);
    setGestionando(true);
    try {
      // 1. Obtener todas las publicaciones de la comunidad
      const publicacionesRef = collection(db, 'publicaciones');
      const publicacionesSnapshot = await getDocs(
        query(publicacionesRef, where('comunidadID', '==', comunidad.id))
      );
      console.log(`📄 Encontradas ${publicacionesSnapshot.docs.length} publicaciones`);

      // 2. Eliminar todas las interacciones (likes y comentarios) de cada publicación
      const interaccionesRef = collection(db, 'interacciones');
      let totalInteracciones = 0;
      for (const publicacionDoc of publicacionesSnapshot.docs) {
        const interaccionesSnapshot = await getDocs(
          query(interaccionesRef, where('publicacionID', '==', publicacionDoc.id))
        );
        totalInteracciones += interaccionesSnapshot.docs.length;
        await Promise.all(
          interaccionesSnapshot.docs.map((interaccionDoc) => deleteDoc(interaccionDoc.ref))
        );
      }
      console.log(`💬 Eliminadas ${totalInteracciones} interacciones`);

      // 3. Eliminar todas las publicaciones de la comunidad
      await Promise.all(
        publicacionesSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref))
      );
      console.log('✅ Publicaciones eliminadas');

      // 4. Eliminar membresías de todos los usuarios
      await Promise.all(
        (comunidad.miembros || []).map((miembroId) => eliminarMembresiaUsuario(miembroId, comunidad.id))
      );
      console.log(`✅ Membresías eliminadas de ${comunidad.miembros?.length || 0} usuarios`);

      // 5. Eliminar la comunidad
      await deleteDoc(doc(db, 'comunidades', comunidad.id));
      console.log('✅ Comunidad eliminada');

      Alert.alert('Comunidad eliminada', `${comunidad.nombre} fue eliminada correctamente.`);
      await cargarComunidades();
    } catch (error) {
      console.error('❌ Error al eliminar la comunidad:', error);
      Alert.alert('Error', `No pudimos eliminar la comunidad. ${error instanceof Error ? error.message : 'Inténtalo nuevamente.'}`);
    } finally {
      setGestionando(false);
    }
  };

  const handleDeleteCommunity = (comunidad: Comunidad) => {
    console.log('🗑️ handleDeleteCommunity llamado para:', comunidad.nombre);
    Alert.alert(
      'Eliminar comunidad',
      `¿Seguro que deseas eliminar ${comunidad.nombre}? Esta acción no se puede deshacer.`,
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => console.log('❌ Usuario canceló la eliminación')
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            console.log('✅ Usuario confirmó la eliminación');
            performDeleteCommunity(comunidad);
          },
        },
      ]
    );
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <View key="loading" style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F4AA6" />
          <Text style={styles.loadingText}>Cargando comunidades...</Text>
        </View>
      );
    }

    return [
      <View key="header" style={styles.header}>
        <Text style={styles.title}>Comunidad</Text>
        <View style={styles.verTodoContainer}>
          <LinearGradient
            colors={['#2F4AA6', '#0491C6']}
            style={styles.verTodoButton}
          >
            <ModButton 
              title="Ver todo" 
              onPress={() => { }} 
              backgroundColor="transparent" 
              style={styles.verTodoButtonInner}
              textStyle={styles.verTodoText}
            />
          </LinearGradient>
          <LinearGradient
            colors={['#2F4AA6', '#0491C6']}
            style={styles.addButton}
          >
            <TouchableOpacity 
              style={styles.addButtonInner}
              onPress={() => router.push('/tabs/newCommunity')}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>,
      
      <View key="community-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Tus comunidades</Text>
        {comunidades.length > 0 ? (
          comunidades.map((item) => {
            const communityData = {
              id: item.id,
              nombre: item.nombre,
              posts: 0,
              imagen: item.imagen
            };
            return (
              <View key={item.id} style={styles.communityWrapper}>
              <CommunityCard
                  comunidad={communityData}
                  onPress={() =>
                    router.push({
                      pathname: './communityDetails',
                      params: { communityId: item.id },
                    })
                  }
                />
                <View style={styles.actionRow}>
                  <ModButton
                    title="Ver"
                    onPress={() =>
                      router.push({
                        pathname: './communityDetails',
                        params: { communityId: item.id },
                      })
                    }
                    backgroundColor="#2563eb"
                    style={styles.actionButton}
                  />
                  <ModButton
                    title={item.creadorID === usuarioID ? 'Eliminar' : 'Salir'}
                    onPress={() => {
                      console.log('🔘 Botón presionado:', item.creadorID === usuarioID ? 'Eliminar' : 'Salir', 'Comunidad:', item.nombre);
                      if (item.creadorID === usuarioID) {
                        handleDeleteCommunity(item);
                      } else {
                        handleLeaveCommunity(item);
                      }
                    }}
                    backgroundColor={item.creadorID === usuarioID ? '#dc2626' : '#9ca3af'}
                    style={styles.actionButton}
                    disabled={gestionando}
                  />
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyMessage}>Aún no perteneces a ninguna comunidad.</Text>
        )}
      </View>,

      <View key="posts-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Comunidades disponibles</Text>
        {todasComunidades.length > 0 ? (
          todasComunidades.map((item) => {
            const communityData = {
              id: item.id,
              nombre: item.nombre,
              posts: 0,
              imagen: item.imagen
            };
            return (
              <View key={item.id} style={styles.communityWrapper}>
                <CommunityCard
                  comunidad={communityData}
                  onPress={() =>
                    router.push({
                      pathname: './communityDetails',
                      params: { communityId: item.id },
                    })
                  }
                />
                <View style={styles.actionRow}>
                  <ModButton
                    title="Unirme"
                    onPress={() => handleJoinCommunity(item)}
                    backgroundColor="#16a34a"
                    style={styles.actionButton}
                  />
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyMessage}>No hay más comunidades disponibles</Text>
        )}
      </View>,
    ];
  };

  return (
    <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#2F4AA6', '#0491C6']}
          style={styles.mainHeader}
        />
        <View style={styles.container}>
          <FlatList
            data={[]}
            keyExtractor={(_, index) => `empty-${index}`}
            renderItem={() => null}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={<View>{renderContent()}</View>}
            contentContainerStyle={styles.scrollContent}
          />
        </View>
    </View> 
  );
}

const styles = StyleSheet.create({
  mainHeader: { 
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  container: { 
    flex: 1, 
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    fontFamily: 'Montserrat_400Regular',
  },
  title: { 
    fontSize: 22, 
    fontWeight: "bold", 
    color: "#000000ff",
    fontFamily: 'Montserrat_400Regular',
  },
  viewAll: { 
    color: "#2F80ED",
    fontSize: 14
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: "bold", 
    marginBottom: 12,
    color: "#000",
    fontFamily: 'Montserrat_400Regular',
  },
  emptyMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginVertical: 20,
    fontStyle: "italic",
    opacity: 0.7,
    fontFamily: 'Montserrat_400Regular',
  },
  verTodoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verTodoButton: {
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  verTodoButtonInner: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  verTodoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  addButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  communityWrapper: {
    marginBottom: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat_400Regular',
  },
});