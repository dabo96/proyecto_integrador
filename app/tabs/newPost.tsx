import ModButton from "@/components/ModButton";
import { app, db } from "@/services/firebase";
import { validarYSubirImagenPublicacion } from "@/services/imageModerationClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes, } from "firebase/storage";
import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View, } from "react-native";

type NuevaPublicacionProps = {
  onGoBack?: () => void;
};

const NuevaPublicacionScreen: React.FC<NuevaPublicacionProps> = ({ onGoBack }) => {
  const router = useRouter();
  const params = useLocalSearchParams<{ communityId?: string; communityName?: string }>();
  const communityId = typeof params.communityId === "string" ? params.communityId : null;
  const communityName = typeof params.communityName === "string" ? params.communityName : null;
  const isCommunityPost = Boolean(communityId);

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      router.back();
    }
  };

  const [texto, setTexto] = useState("");
  const [imagen, setImagen] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 🔹 Obtener usuario logueado desde AsyncStorage y Firestore
  useEffect(() => {
    const obtenerUsuario = async () => {
      try {
        const usuarioID = await AsyncStorage.getItem("usuarioID");
        if (!usuarioID) return;

        console.log("🔹 UsuarioID obtenido:", usuarioID);
        const usuarioRef = doc(db, "Usuarios", usuarioID);
        const usuarioSnap = await getDoc(usuarioRef);

        if (usuarioSnap.exists()) {
          const data = usuarioSnap.data();
          console.log("🔹 Usuario obtenido:", data);
          setUsuario({ id: usuarioID, ...data });
        } else {
          console.warn("⚠️ No se encontró el usuario en Firestore.");
        }
      } catch (err) {
        console.error("❌ Error obteniendo usuario:", err);
      }
    };

    obtenerUsuario();
  }, []);

  // 🔹 Seleccionar imagen de la galería
  const abrirGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "Se necesita acceso a la galería para seleccionar imágenes."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImagen(result.assets[0].uri);
    }
  };

  // 🔹 Subir imagen al Storage
  const subirImagenAFirebase = async (uri: string): Promise<string> => {
    try {
      const storage = getStorage(app); // ✅ obtiene la instancia global de tu proyecto
      const nombreArchivo = `publicaciones/${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
      const storageRef = ref(storage, nombreArchivo); // ✅ referencia correcta

      console.log("🔹 Subiendo imagen a Firebase Storage:", nombreArchivo);
      // convierte la URI a blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // sube la imagen
      await uploadBytes(storageRef, blob);

      console.log("✅ Imagen subida, obteniendo URL...");

      // obtiene la URL pública
      const downloadURL = await getDownloadURL(storageRef);
      console.log("✅ Imagen subida correctamente:", downloadURL);

      return downloadURL;
    } catch (error) {
      console.error("❌ Error subiendo imagen:", error);
      throw error;
    }
  };

  // 🔹 Publicar contenido
  const handlePublicar = async () => {
    if (!texto.trim()) {
      Alert.alert("Error", "Escribe algo antes de publicar.");
      return;
    }
    if (!usuario) {
      Alert.alert("Error", "Usuario no disponible.");
      return;
    }

    setLoading(true);
    try {
      let imagenUrl: string | null = null;

      console.log("🔹 Publicando con imagen:", imagen);
      if (imagen) {
        // Validar contenido de la imagen antes de publicar
        const result = await validarYSubirImagenPublicacion(
          subirImagenAFirebase,
          imagen
        );

        if (!result.success) {
          Alert.alert(
            "Contenido no permitido",
            result.error || "La imagen no cumple con nuestras políticas de contenido."
          );
          setImagen(null); // Limpiar imagen rechazada
          setLoading(false);
          return;
        }

        imagenUrl = result.url || null;
      }
      const docRef = await addDoc(collection(db, "publicaciones"), {
        usuarioID: usuario.id,
        texto,
        imagenUrl,
        fechaCreacion: new Date(),
        likes: 0,
        comentarios: 0,
        estado: "activo",
        comunidadID: communityId ?? null,
        autor: {
          nombres: usuario.nombres || "",
          apellidos: usuario.apellidos || "",
          fotoPerfil: usuario.fotoPerfil || null,
        },
      });

      Alert.alert(
        "✅ Éxito",
        isCommunityPost
          ? `Tu publicación se compartió en ${communityName ?? "la comunidad"}.`
          : "Publicación creada correctamente.",
        [
          {
            text: "Aceptar",
            onPress: () => router.back(),
          },
        ]
      );
      console.log("✅ Publicación creada con ID:", docRef.id);
      setTexto("");
      setImagen(null);
    } catch (error) {
      console.error("❌ Error al publicar:", error);
      Alert.alert("Error", "No se pudo crear la publicación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#2F4AA6", "#0491C6"]} style={styles.mainHeader} />

      <View style={styles.subHeader}>
        <View style={styles.headerLeft}>
          <Pressable onPress={handleGoBack}>
            <Text style={styles.back}>←</Text>
          </Pressable>

          {usuario?.fotoPerfil ? (
            <Image source={{ uri: usuario.fotoPerfil }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: "#ccc" }]} />
          )}

          <Text style={styles.name}>
            {usuario
              ? `${usuario.nombres || usuario.nombre || "Usuario"}`
              : "Cargando..."}
          </Text>
        </View>

        <ModButton
          title={loading ? "Publicando..." : "Publicar"}
          onPress={handlePublicar}
          backgroundColor="#1d4ed8"
          style={{ borderRadius: 20 }}
        />
      </View>

      <View style={styles.textInputCont}>
        {isCommunityPost && (
          <View style={styles.communityBanner}>
            <Text style={styles.communityBannerText}>
              Publicando en {communityName ?? "la comunidad"}
            </Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="¿Qué está pasando?"
          placeholderTextColor="#999"
          multiline
          value={texto}
          onChangeText={setTexto}
          maxLength={280}
        />
      </View>


      {imagen && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imagen }} style={styles.imagePreview} />
          <Pressable onPress={() => setImagen(null)}>
            <Text style={styles.removeText}>✕ Quitar imagen</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.footer}>
        <ModButton
          title=""
          onPress={abrirGaleria}
          backgroundColor="#F5F5F5"
          iconName="camera"
          iconLib="AntDesign"
          style={styles.actionBtn}
          textColor="#000000"
        />
        <Text style={styles.counter}>{280 - texto.length}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { display: 'flex', flex: 1, backgroundColor: "#fff", flexDirection: 'column' },
  mainHeader: { paddingVertical: 16, paddingHorizontal: 10, alignItems: "center" },
  subHeader: {
    position: "absolute",
    top: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    zIndex: 999,
  },
  textInputCont: { paddingTop: 60, flex: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  back: { fontSize: 24, color: "#2F4AA6", marginRight: 16 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  name: { fontSize: 16, color: "#333", fontWeight: "500" },
  communityBanner: {
    marginTop: 80,
    marginHorizontal: 16,
    backgroundColor: "#e0f2fe",
    padding: 12,
    borderRadius: 12,
  },
  communityBannerText: {
    color: "#075985",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  input: {
    flex: 1,
    fontSize: 18,
    padding: 16,
    textAlignVertical: "top",
    marginTop: 20,
  },
  imagePreviewContainer: {
    marginHorizontal: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  imagePreview: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    resizeMode: "cover",
  },
  removeText: { color: "#dc2626", marginTop: 6, fontSize: 14 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  counter: { fontSize: 14, color: "#666" },
});

export default NuevaPublicacionScreen;
