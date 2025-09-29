import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface Publicacion {
  id: string;
  comunidad: string;
  tiempo: string;
  texto: string;
  imagen?: string;
}

interface CommunityPostCardProps {
  publicacion: Publicacion;
  imagenComunidad?: string;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

const CommunityPostCard: React.FC<CommunityPostCardProps> = ({ 
  publicacion,
imagenComunidad, 
  onLike, 
  onComment, 
  onShare 
}) => (
  <View style={styles.post}>
    <View style={styles.postHeaderContainer}>
      <Image 
        source={{ uri: imagenComunidad || "https://picsum.photos/40/40" }} 
        style={styles.postAuthorImage} 
      />

      <View style={styles.postHeaderText}>
        <Text style={styles.postCommunity}>{publicacion.comunidad}</Text>
        <Text style={styles.postHeader}>{publicacion.tiempo}</Text>
      </View>
    </View>
    <Text style={styles.postText}>{publicacion.texto}</Text>
    {publicacion.imagen && (
      <Image source={{ uri: publicacion.imagen }} style={styles.postImage} />
    )}
  </View>
);

const styles = StyleSheet.create({
  post: { 
    marginBottom: 16,
    backgroundColor: "#fff"
  },
  postHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  postAuthorImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8
  },
  postHeaderText: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
  },
  postCommunity: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    fontFamily: 'Montserrat_400Regular',
  },
  postHeader: { 
    fontSize: 12, 
    color: "#666",
    marginTop: 1,
    fontFamily: 'Montserrat_700Bold',
  },
  postText: { 
    fontSize: 14, 
    marginBottom: 8,
    color: "#000",
    lineHeight: 20,
    fontFamily: 'Montserrat_400Regular',
  },
  postImage: { 
    width: "100%", 
    height: 180, 
    borderRadius: 8 
  },
});

export default CommunityPostCard;