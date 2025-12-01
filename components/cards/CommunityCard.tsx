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
      <Text style={styles.communityText} numberOfLines={2} ellipsizeMode="tail">
        {comunidad.nombre}
      </Text>
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
    paddingVertical: 4,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  communityImage: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 12,
    flexShrink: 0,
  },
  communityTextContainer: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 8,
  },
  communityText: { 
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    fontFamily: 'Montserrat_700Bold',
    flexShrink: 1,
  },
  communitySubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
});
export default CommunityCard;