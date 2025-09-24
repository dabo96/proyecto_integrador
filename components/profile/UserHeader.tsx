import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Users, Database, Calendar, MapPin, FileText, UserPlus, MessageCircle } from "lucide-react-native";

type Props = {
  user: {
    name: string;
    profession: string;
    friends: number;
    skills: string[];
    joinDate: string;
    location: string;
    posts: number;
    bio: string;
    image: string;
  };
  onFollow?: () => void;
  onMessage?: () => void;
};

const UserHeader: React.FC<Props> = ({ user, onFollow, onMessage }) => {
  return (
    <LinearGradient colors={["#2F4AA6", "#0491C6"]} style={styles.header}>
      <Image source={{ uri: user.image }} style={styles.avatar} />
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.profession}>{user.profession}</Text>

      {/* Info rápida */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Users size={16} color="white" />
          <Text style={styles.infoText}>{user.friends} amigos</Text>
        </View>
        <View style={styles.infoItem}>
          <Database size={16} color="white" />
          <Text style={styles.infoText}>{user.skills.join(", ")}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Calendar size={16} color="white" />
          <Text style={styles.infoText}>{user.joinDate}</Text>
        </View>
        <View style={styles.infoItem}>
          <MapPin size={16} color="white" />
          <Text style={styles.infoText}>{user.location}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <FileText size={16} color="white" />
          <Text style={styles.infoText}>{user.posts} publicaciones</Text>
        </View>
      </View>

      <Text style={styles.bio}>{user.bio}</Text>
    </LinearGradient>
  );
};

export default UserHeader;

const styles = StyleSheet.create({
  header: {
    paddingBottom: 20,
    paddingTop: 60,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: "center",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "white",
    marginBottom: 8,
  },
  name: { fontSize: 22, fontWeight: "bold", color: "white" },
  profession: { fontSize: 16, color: "white", marginBottom: 12 },
  infoRow: { flexDirection: "row", justifyContent: "center", marginVertical: 2 },
  infoItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 8 },
  infoText: { color: "white", fontSize: 12, marginLeft: 4 },
  bio: { marginTop: 8, color: "white", fontSize: 13, textAlign: "center" },
});
