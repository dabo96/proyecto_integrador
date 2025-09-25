import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

interface Comunidad {
  id: string;
  nombre: string;
  posts: number;
  imagen: string;
}

interface CommunityCardProps {
  comunidad: Comunidad;
  onPress?: () => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ comunidad, onPress }) => (
  <Pressable style={styles.communityItem} onPress={onPress}>
    <Image source={{ uri: comunidad.imagen }} style={styles.communityImage} />
    <View style={styles.communityTextContainer}>
      <Text style={styles.communityText}>{comunidad.nombre}</Text>
      <Text style={styles.communitySubtext}>
        {comunidad.posts} publicaciones • Activo
      </Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  communityItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 16,
    paddingVertical: 4
  },
  communityImage: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 12 
  },
  communityTextContainer: {
    flex: 1
  },
  communityText: { 
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  communitySubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 2
  },
});
export default CommunityCard;