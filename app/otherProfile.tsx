import React from "react";
import PostCard from "@/components/cards/PostCard";
import UserHeader from "@/components/profile/UserHeader";
import IconButton from "@/components/button/IconButton";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar, Database, FileText, MapPin, MessageCircle, UserPlus, Users, } from "lucide-react-native";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, } from "react-native";

const posts = [
  {
    id: "1",
    author: "Alex Ulloa",
    time: "Hace 5 horas",
    content: "✨ Nada como conectar con la naturaleza para recargar energías 🌿💧",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800",
  },
  {
    id: "2",
    author: "Alex Ulloa",
    time: "Hace 1 día",
    content: "📚 Estudiando nuevas tecnologías para mejorar en mis proyectos 💻",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800",
  },
];

const infoUser = {
  name: "Henry Cavill",
  profession: "Ingeniero de Software",
  friends: 350,
  skills: ["Manejo BD"],
  joinDate: "10 Abril 2020",
  location: "Sede Apolo Centro",
  posts: 100,
  bio: "Apasionado por el desarrollo de aplicaciones móviles y el diseño de interfaces. Interesado en proyectos de investigación, innovación tecnológica y trabajo en equipo.",
  image: "https://randomuser.me/api/portraits/men/2.jpg",
};

const ProfileScreen = () => {
  const handleLike = (id: string) => {
    console.log("Like en post:", id);
  };

  const handleComment = (id: string) => {
    console.log("Comentario en post:", id);
  };

  const handleReport = (id: string) => {
    console.log("Reportar post:", id);
  };

  const handleDelete = (id: string) => {
    console.log("Eliminar post:", id);
  };

  return (
    <View style={styles.container}>
      <UserHeader
        user={infoUser}
        onFollow={() => console.log("Seguir")}
        onMessage={() => console.log("Mensaje")}
      />
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginVertical: 12 }}>
        <IconButton
          title="Seguir"
          onPress={() => console.log("Seguir")}
          icon={<Users size={18} color="white" />}
          backgroundColor="#2563eb"
        />

        <IconButton
          title="Mensaje"
          onPress={() => console.log("Mensaje")}
          icon={<MessageCircle size={18} color="white" />}
          backgroundColor="#1d4ed8"
        />

      </View>


      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onComment={handleComment}
            onReport={handleReport}
            onDelete={handleDelete}
          />
        )}
      />
    </View>

  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
