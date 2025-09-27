import React from "react";
import PostCard from "@/components/cards/PostCard";
import IconButton from "@/components/button/IconButton";
import useCollapsibleHeader from "@/hooks/useCollapsibleHeader";
import CollapsibleUserHeader from "@/components/profile/CollapsibleHeader";
import { Animated } from "react-native";
import { MessageCirclePlus, UserPlus, } from "lucide-react-native";
import { FlatList, StyleSheet, View, } from "react-native";
import Navbar from "@/components/layout/Navbar";

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
  bio: "Apasionado por el desarrollo de aplicaciones móviles y el diseño de interfaces. Interesado en proyectos de investigación, innovación tecnológica y trabajo en equipo.Apasionado por el desarrollo de aplicaciones móviles y el diseño de interfaces. Interesado en proyectos de investigación, innovación tecnológica y trabajo en equipo.Apasionado por el desarrollo de aplicaciones móviles y el diseño de interfaces. Interesado en proyectos de investigación, innovación tecnológica y trabajo en equipo.Apasionado por el desarrollo de aplicaciones móviles y el diseño de interfaces. Interesado en proyectos de investigación, innovación tecnológica y trabajo en equipo.",
  image: "https://www.elespectador.com/resizer/v2/ZCA7PPEEJNCXXGYGPQTC3JVQYY.jpg?auth=6ae3ec1db683af768c1ef12d0685442cb6c96a29ae50965aaf5456309ed60e5a&width=920&height=613&smart=true&quality=60",
};

const OtherProfileScreen = () => {
  const {
    onScroll,
    headerHeight,
    avatarSize,
    expandedOpacity,
    collapsedOpacity,
    maxHeight,
  } = useCollapsibleHeader({ maxHeight: 500, minHeight: 110, avatarMax: 160, avatarMin: 48 });

  const renderItem = ({ item }: any) => (
    <PostCard post={item} onLike={() => { }} onComment={() => { }} onReport={() => { }} onDelete={() => { }} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <CollapsibleUserHeader
        user={infoUser}
        headerHeight={headerHeight}
        avatarSize={avatarSize}
        expandedOpacity={expandedOpacity}
        collapsedOpacity={collapsedOpacity}
      />

      <View style={{ flexDirection: "row", justifyContent: "space-around", marginVertical: 12 }}>
        <IconButton title="Seguir" onPress={() => { }} icon={<UserPlus size={18} color="white" />} backgroundColor="#2563eb" />
        <IconButton title="Mensaje" onPress={() => { }} icon={<MessageCirclePlus size={18} color="white" />} backgroundColor="#1d4ed8" />
      </View>

      <Animated.FlatList
        data={posts}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 8 }}
        ListFooterComponent={<View style={{ height: maxHeight }} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />

      <Navbar />
    </View>
  );
};

export default OtherProfileScreen;