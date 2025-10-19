import React from "react";
import { View, FlatList } from "react-native";
import PostCard from "@/components/cards/PostCard";
import ModButton from "@/components/ModButton";
import UserHeader from "@/components/profile/UserHeader";

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
  image:
    "https://www.elespectador.com/resizer/v2/ZCA7PPEEJNCXXGYGPQTC3JVQYY.jpg?auth=6ae3ec1db683af768c1ef12d0685442cb6c96a29ae50965aaf5456309ed60e5a&width=920&height=613&smart=true&quality=60",
};

export default function OtherProfileScreen() {
  const renderItem = ({ item }: any) => (
    <PostCard
      post={item}
      onLike={() => {}}
      onComment={() => {}}
      onReport={() => {}}
      onDelete={() => {}}
    />
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(i) => i.id}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          <UserHeader user={infoUser} />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              marginVertical: 12,
            }}
          >
            <ModButton
              title="Seguir"
              onPress={() => {}}
              iconName="user-plus"
              iconLib="Feather"
              backgroundColor="#2563eb"
            />
            <ModButton
              title="Mensaje"
              onPress={() => {}}
              iconName="message-plus-outline"
              iconLib="MaterialCommunityIcons"
              backgroundColor="#1d4ed8"
            />
          </View>
        </>
      }
      contentContainerStyle={{
        paddingBottom: 40,
        backgroundColor: "#fff",
      }}
    />
  );
}
