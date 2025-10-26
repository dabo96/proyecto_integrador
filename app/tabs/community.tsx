import ModButton from "@/components/ModButton";
import CommunityCard from "@/components/cards/CommunityCard";
import CommunityPostCard from "@/components/cards/CommunityPostCard";
import { db } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, getDocs } from 'firebase/firestore';
import React, { JSX, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Comunidad {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  creadorID: string;
  fechaCreacion: any;
  miembros: string[];
}

interface Publicacion {
  id: string;
  comunidad: string;
  tiempo: string;
  texto: string;
  imagen?: string;
}

export default function ComunidadScreen(): JSX.Element {
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [todasComunidades, setTodasComunidades] = useState<Comunidad[]>([]);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [usuarioID, setUsuarioID] = useState<string>('');
  const [loading, setLoading] = useState(true);
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
  
  const renderCommunityItem = ({ item }: { item: Comunidad }) => {
    const communityData = {
      id: item.id,
      nombre: item.nombre,
      posts: 0, // Por ahora sin posts
      imagen: item.imagen
    };
    
    return (
      <CommunityCard
        comunidad={communityData}
        onPress={() => console.log('Navegar a comunidad:', item.nombre)}
      />
    );
  };

  const renderPostItem = ({ item }: { item: Publicacion }) => (
    <CommunityPostCard
      publicacion={item}
      imagenComunidad={obtenerImagenComunidad(item.comunidad)}
      onLike={() => console.log('Like:', item.id)}
      onComment={() => console.log('Comment:', item.id)}
      onShare={() => console.log('Share:', item.id)}
    />
  );

  
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
        <Text style={styles.sectionTitle}>Tu Comunidad</Text>
        {comunidades.length > 0 ? (
          comunidades.map((item) => {
            const communityData = {
              id: item.id,
              nombre: item.nombre,
              posts: 0,
              imagen: item.imagen
            };
            return (
              <CommunityCard
                key={item.id}
                comunidad={communityData}
                onPress={() => console.log('Navegar a comunidad:', item.nombre)}
              />
            );
          })
        ) : (
          <Text style={styles.emptyMessage}>No hay comunidades para mostrar</Text>
        )}
      </View>,

      <View key="posts-section" style={styles.section}>
        <Text style={styles.sectionTitle}>Comunidades</Text>
        {todasComunidades.length > 0 ? (
          todasComunidades.map((item) => {
            const communityData = {
              id: item.id,
              nombre: item.nombre,
              posts: 0,
              imagen: item.imagen
            };
            return (
              <CommunityCard
                key={item.id}
                comunidad={communityData}
                onPress={() => console.log('Ver comunidad:', item.nombre)}
              />
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
            data={publicaciones}
            keyExtractor={(item) => item.id}
            renderItem={renderPostItem}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={<View>{renderContent()}</View>}
            ListEmptyComponent={
              publicaciones.length === 0 ? (
                <Text style={styles.emptyMessage}>No hay publicaciones para mostrar</Text>
              ) : null
            }
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