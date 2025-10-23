import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View,} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import ModButton from "@/components/ModButton";
import { addDoc, collection, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL,} from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

type NuevaPublicacionProps = {
  onGoBack?: () => void;
};

const NuevaPublicacionScreen: React.FC<NuevaPublicacionProps> = ({
  onGoBack = () => console.log("Atrás"),
}) => {
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
      const storage = getStorage();
      const nombreArchivo = `publicaciones/${Date.now()}_${Math.floor(
        Math.random() * 10000
      )}.jpg`;
      const storageRef = ref(storage, nombreArchivo);

      const response = await fetch(uri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob);
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

      if (imagen) {
        imagenUrl = await subirImagenAFirebase(imagen);
      }

      const docRef = await addDoc(collection(db, "publicaciones"), {
        usuarioID: usuario.id,
        texto,
        imagenUrl,
        fechaCreacion: new Date(),
        likes: 0,
        comentarios: 0,
        estado: "activo",
        autor: {
          nombres: usuario.nombres || "",
          apellidos: usuario.apellidos || "",
          fotoPerfil: usuario.fotoPerfil || null,
        },
      });

      // 🔹 Crear subcolecciones vacías
      const rutas = ["interacciones", "reportes", "comentarios"];
      for (const ruta of rutas) {
        await setDoc(doc(db, `publicaciones/${docRef.id}/${ruta}/__init__`), {});
      }

      Alert.alert("✅ Éxito", "Publicación creada correctamente.");
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
          <Pressable onPress={onGoBack}>
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

      <TextInput
        style={styles.input}
        placeholder="¿Qué está pasando?"
        placeholderTextColor="#999"
        multiline
        value={texto}
        onChangeText={setTexto}
        maxLength={280}
      />

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
  container: { flex: 1, backgroundColor: "#fff" },
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
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  back: { fontSize: 24, color: "#2F4AA6", marginRight: 16 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  name: { fontSize: 16, color: "#333", fontWeight: "500" },
  input: {
    flex: 1,
    fontSize: 18,
    padding: 16,
    textAlignVertical: "top",
    marginTop: 60,
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
