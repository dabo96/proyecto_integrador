import ModButton from "@/components/ModButton";
import CommunityCard from "@/components/cards/CommunityCard";
import CommunityPostCard from "@/components/cards/CommunityPostCard";
import { LinearGradient } from "expo-linear-gradient";
import React, { JSX, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";


interface Comunidad {
  id: string;
  nombre: string;
  posts: number;
  imagen: string;
}

interface Publicacion {
  id: string;
  comunidad: string;
  tiempo: string;
  texto: string;
  imagen?: string;
}


// Estados para las comunidades y publicaciones del usuario
// Inicialmente vacíos hasta que se carguen los datos reales
export default function ComunidadScreen(): JSX.Element {
  // Estados para las comunidades y publicaciones del usuario
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);

  // Función para obtener imagen de comunidad
  const obtenerImagenComunidad = (nombreComunidad: string): string => {
    const comunidad = comunidades.find(c => c.nombre === nombreComunidad);
    return comunidad?.imagen || "https://picsum.photos/40/40";
  };

  // TODO: Implementar carga de datos reales del usuario
  useEffect(() => {
    // Aquí se cargarían las comunidades y publicaciones reales del usuario
    // Por ahora se mantienen vacíos
  }, []);
  
  const renderCommunityItem = ({ item }: { item: Comunidad }) => (
    <CommunityCard
      comunidad={item}
      onPress={() => console.log('Navegar a comunidad:', item.nombre)}
    />
  );

  const renderPostItem = ({ item }: { item: Publicacion }) => (
    <CommunityPostCard
      publicacion={item}
      imagenComunidad={obtenerImagenComunidad(item.comunidad)}
      onLike={() => console.log('Like:', item.id)}
      onComment={() => console.log('Comment:', item.id)}
      onShare={() => console.log('Share:', item.id)}
    />
  );

  
  const renderContent = () => [
    
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
            onPress={() => console.log('Agregar nueva comunidad')}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>,
    
    <View key="community-section" style={styles.section}>
      <Text style={styles.sectionTitle}>Tu Comunidad</Text>
      {comunidades.length > 0 ? (
        comunidades.map((item) => (
          <CommunityCard
            key={item.id}
            comunidad={item}
            onPress={() => console.log('Navegar a comunidad:', item.nombre)}
          />
        ))
      ) : (
        <Text style={styles.emptyMessage}>No hay comunidades para mostrar</Text>
      )}
    </View>,

    <View key="posts-section" style={styles.section}>
      <Text style={styles.sectionTitle}>De tu comunidad</Text>
    </View>,
  ];

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
});