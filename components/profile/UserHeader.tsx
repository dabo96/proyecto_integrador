import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Users, Database, Calendar, MapPin, FileText } from "lucide-react-native";

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
  compact?: boolean; // si true: solo avatar + nombre
};

const UserHeader: React.FC<Props> = ({ user, compact = false }) => {
  return (
    <LinearGradient colors={["#2F4AA6", "#0491C6"]} style={styles.header}>
      {/* Avatar */}
      <Image source={{ uri: user.image }} style={styles.avatar} />

      {/* Nombre y datos */}
      <View style={compact ? styles.rowNameContainer : styles.columnNameContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>

        {!compact && (
          <>
            <Text style={styles.profession}>{user.profession}</Text>

            <View style={styles.infoBlock}>
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

              {/* Bio con scroll si es muy larga */}
              <ScrollView
                style={styles.bioContainer}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.bio}>{user.bio}</Text>
              </ScrollView>
            </View>
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
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  profession: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
    marginBottom: 10,
  },
  columnNameContainer: {
    alignItems: "center",
  },
  rowNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoBlock: {
    marginTop: 8,
    alignItems: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 4,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },
  infoText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  bioContainer: {
    maxHeight: 60,
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
  },
});
