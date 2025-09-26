import IconButton from "@/components/button/IconButton";
import CommunityCard from "@/components/cards/CommunityCard";
import CommunityPostCard from "@/components/cards/CommunityPostCard";
import { LinearGradient } from "expo-linear-gradient";
import React, { JSX } from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";


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


const comunidades: Comunidad[] = [
  { 
    id: "1", 
    nombre: "Arquitectura", 
    posts: 25,
    imagen: "https://docenzia.com/blog/wp-content/uploads/tipos-de-ingenieria.webp"
  },
  { 
    id: "2", 
    nombre: "Redes I", 
    posts: 12,
    imagen: "https://i.scdn.co/image/ab6765630000ba8af770691237911d7e512de37c"
  },
  { 
    id: "3", 
    nombre: "Memes de ciencias e ingenierías", 
    posts: 20,
    imagen: "https://de.web.img3.acsta.net/r_654_368/img/0d/de/0ddef4642c8b0346476b01ba382b5724.jpg"
  },
  { 
    id: "4", 
    nombre: "Normas APA", 
    posts: 8,
    imagen: "https://www.educaciontrespuntocero.com/wp-content/uploads/2022/11/apa.jpg"
  },
];

const publicaciones: Publicacion[] = [
  {
    id: "101",
    comunidad: "Arquitectura",
    tiempo: "Hace 5 minutos",
    texto: "Evolución del rodaje",
    imagen: "https://coitiab.es/wp-content/uploads/2020/10/ing-industrial1-blog.jpg",
  },
  {
    id: "102",
    comunidad: "Redes I",
    tiempo: "Hace 2 horas",
    texto: "Yo al graduarme",
    imagen: "https://www.dotcom-monitor.com/wp-content/uploads/sites/3/2010/08/grayedmess.jpg",
  },
  {
    id: "103",
    comunidad: "Memes de ciencias e ingenierías",
    tiempo: "Hace 4 horas",
    texto: "momento xd del día",
    imagen: "https://pbs.twimg.com/media/Dl0NgZCXcAUI9_J.jpg",
  },
];

const obtenerImagenComunidad = (nombreComunidad: string): string => {
  const comunidad = comunidades.find(c => c.nombre === nombreComunidad);
  return comunidad?.imagen || "https://picsum.photos/40/40";
};
export default function ComunidadScreen(): JSX.Element {
  
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
      <IconButton title="Ver todo" onPress={() => { }} backgroundColor="#1d4ed8" style={{    borderRadius: 20, }} />
    </View>,
    
    <View key="community-section" style={styles.section}>
      <Text style={styles.sectionTitle}>Tu Comunidad</Text>
      {comunidades.map((item) => (
        <CommunityCard
          key={item.id}
          comunidad={item}
          onPress={() => console.log('Navegar a comunidad:', item.nombre)}
        />
      ))}
    </View>,

    <View key="posts-section" style={styles.section}>
      <Text style={styles.sectionTitle}>De tu comunidad</Text>
    </View>,
  ];

  return (
    <SafeAreaView style={styles.container}>
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
            contentContainerStyle={styles.scrollContent}
          />
        </View>
    </SafeAreaView> 
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
  },
  title: { 
    fontSize: 22, 
    fontWeight: "bold", 
    color: "#000000ff" 
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
    color: "#000"
  },
});