// UserHeader.tsx
import React from "react";
import { View, Text, StyleSheet, Animated, Image, ImageStyle, ViewStyle, TextStyle, } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Users, Database, Calendar, MapPin, FileText, } from "lucide-react-native";
import { ScrollView } from "react-native-gesture-handler";

type User = {
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

type Props = {
  user: User;
  onFollow?: () => void;
  onMessage?: () => void;
  compact?: boolean; // si true sólo muestra avatar + nombre en fila
  containerStyle?: ViewStyle;
  avatarStyle?: ImageStyle | Animated.WithAnimatedValue<ImageStyle>;
  detailsStyle?: ViewStyle | Animated.WithAnimatedValue<ViewStyle>;
  nameStyle?: TextStyle | Animated.WithAnimatedValue<TextStyle>;
};

const AnimatedImage = Animated.createAnimatedComponent(Image);

const UserHeader: React.FC<Props> = ({
  user,
  compact = false,
  avatarStyle,
  detailsStyle,
  nameStyle,
}) => {
  return (
    <LinearGradient colors={['#2F4AA6', '#0491C6']} style={[styles.header]}>
      <AnimatedImage source={{ uri: user.image }} style={[styles.avatar, avatarStyle]} />

      <View style={compact ? styles.rowNameContainer : styles.columnNameContainer}>
        <Animated.Text style={[styles.name, nameStyle]} numberOfLines={1}>{user.name}</Animated.Text>

        {!compact && (
          <>
            <Text style={styles.profession}>{user.profession}</Text>

            <Animated.View style={[styles.infoBlock, detailsStyle]}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}><Users size={16} color="white" /><Text style={styles.infoText}>{user.friends} amigos</Text></View>
                <View style={styles.infoItem}><Database size={16} color="white" /><Text style={styles.infoText}>{user.skills.join(", ")}</Text></View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}><Calendar size={16} color="white" /><Text style={styles.infoText}>{user.joinDate}</Text></View>
                <View style={styles.infoItem}><MapPin size={16} color="white" /><Text style={styles.infoText}>{user.location}</Text></View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}><FileText size={16} color="white" /><Text style={styles.infoText}>{user.posts} publicaciones</Text></View>
              </View>

              {/* ---------- Solo la bio tiene su propio ScrollView ---------- */}
              <ScrollView style={styles.bioContainer} nestedScrollEnabled={true}>
                <Text style={styles.bio}>{user.bio}</Text>
              </ScrollView>
            </Animated.View>
          </>
        )}
      </View>
    </LinearGradient>
  );
};

export default UserHeader;

const styles = StyleSheet.create({
  header: {
    paddingBottom: 20,
    paddingTop: 60,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    alignItems: "center",
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: "white",
    marginBottom: 15,
  },
  name: { fontSize: 30, fontWeight: "bold", color: "white" },
  profession: { fontSize: 15, fontWeight: "bold", color: "white", marginBottom: 12 },
  columnNameContainer: { alignItems: "center" },
  rowNameContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoBlock: { marginTop: 8, alignItems: "center" },
  infoRow: { flexDirection: "row", justifyContent: "center", marginVertical: 4 },
  infoItem: { flexDirection: "row", alignItems: "center", marginHorizontal: 8 },
  infoText: { color: "white", fontSize: 12, fontWeight: "bold", marginLeft: 4 },
  bioContainer: {
    maxHeight: 60, // 🔑 si la bio excede esto, aparecerá scroll
    height: "100%",
    marginTop: 8,
    paddingHorizontal: 16,
    width: "100%",
  },
  bio: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    borderTopColor: "white",
    borderTopWidth: 1,
    paddingTop: 12,
    width: "100%",
  },
});