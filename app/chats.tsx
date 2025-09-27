import Navbar from "@/components/layout/Navbar";
import { Plus } from "lucide-react-native";
import React from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Chat = {
  id: string;
  name: string;
  message: string;
  time: string;
  avatar: string;
  online: boolean;
  unread: number;
};

const chats: Chat[] = [
  {
    id: "1",
    name: "Henry Cavill",
    message: "Hola, ¿Hoy te espero en...",
    time: "Hace 3m",
    avatar: "https://www.elespectador.com/resizer/v2/ZCA7PPEEJNCXXGYGPQTC3JVQYY.jpg?auth=6ae3ec1db683af768c1ef12d0685442cb6c96a29ae50965aaf5456309ed60e5a&width=920&height=613&smart=true&quality=60",
    online: true,
    unread: 1,
  },
  {
    id: "2",
    name: "Grupo Integrador",
    message: "La presentación es la siguiente cla...",
    time: "Hace 3m",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    online: true,
    unread: 1,
  },
  {
    id: "3",
    name: "Sofia",
    message: "Jajaja no sabes lo que me pasó 😂",
    time: "Hace 3m",
    avatar: "https://randomuser.me/api/portraits/women/3.jpg",
    online: true,
    unread: 8,
  },
  {
    id: "4",
    name: "Alex",
    message: "De una, avisa la hora..",
    time: "Hace 3m",
    avatar: "https://randomuser.me/api/portraits/men/4.jpg",
    online: true,
    unread: 1,
  },
  {
    id: "5",
    name: "Fabio",
    message: "Aún no, la pongo hoy en la noche...",
    time: "Hace 3m",
    avatar: "https://randomuser.me/api/portraits/men/5.jpg",
    online: true,
    unread: 1,
  },
  {
    id: "6",
    name: "Manuel",
    message: "Sí voy, pero llegaré un poco tarde 🙈",
    time: "Hace 15m",
    avatar: "https://randomuser.me/api/portraits/men/6.jpg",
    online: false,
    unread: 1,
  },
  {
    id: "7",
    name: "Alessandra",
    message: "Lo que pasó en la clase hoy 😂",
    time: "Hace 1h",
    avatar: "https://randomuser.me/api/portraits/women/7.jpg",
    online: false,
    unread: 1,
  },
  {
    id: "8",
    name: "Vanesa",
    message: "Te cuento algo importante 👀",
    time: "Hace 3h",
    avatar: "https://randomuser.me/api/portraits/women/8.jpg",
    online: true,
    unread: 2,
  },
];

const ChatCreem = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <TouchableOpacity>
          <Plus size={28} color="black" />
        </TouchableOpacity>
      </View>

      {/* Lista de chats */}
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatItem}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
              {item.online && <View style={styles.onlineDot} />}
            </View>

            {/* Info */}
            <View style={styles.chatInfo}>
              <View style={styles.rowBetween}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatTime}>{item.time}</Text>
              </View>
              <View style={styles.rowBetween}>
                <Text
                  style={styles.chatMessage}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.message}
                </Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
      <Navbar />
    </View>
  );
};

export default ChatCreem;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: "#22c55e",
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
  },
  chatTime: {
    fontSize: 12,
    color: "#6b7280",
  },
  chatMessage: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: "#ef4444",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingVertical: 8,
  },
});
