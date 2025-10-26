import ModButton from '@/components/ModButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, storage } from '@/services/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  onGoBack?: () => void;
  onPublicar?: (texto: string) => void;
  usuarioNombre?: string;
}

const NuevaPublicacionScreen: React.FC<Props> = ({
  onGoBack = () => console.log('Atrás'),
  onPublicar = (texto) => console.log('Publicar:', texto),
  usuarioNombre = "Sofia"
}) => {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [imagen, setImagen] = useState<string | null>(null);
  const [usuarioID, setUsuarioID] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Obtener datos del usuario al cargar
  useEffect(() => {
    const getUserData = async () => {
      try {
        const storedUsuarioID = await AsyncStorage.getItem('usuarioID');
        const storedUsuarioNombre = await AsyncStorage.getItem('usuarioNombre');
        
        if (storedUsuarioID) {
          setUsuarioID(storedUsuarioID);
        }
        if (storedUsuarioNombre) {
          // Actualizar el nombre si viene de AsyncStorage
        }
      } catch (error) {
        console.error('Error obteniendo datos del usuario:', error);
        Alert.alert('Error', 'No se pudo obtener los datos del usuario');
      }
    };
    
    getUserData();
  }, []);

  // Función para seleccionar imagen
  const selectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImagen(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // Función para subir imagen a Firebase Storage
  const uploadImage = async (imageUri: string): Promise<string | null> => {
    try {
      setUploading(true);
      
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const imageRef = ref(storage, `publicaciones/${Date.now()}_${usuarioID}.jpg`);
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      Alert.alert('Error', 'No se pudo subir la imagen');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Función para crear la publicación
  const publicar = async () => {
    if (!texto.trim() && !imagen) {
      Alert.alert('Error', 'Escribe algo o selecciona una imagen');
      return;
    }

    if (!usuarioID) {
      Alert.alert('Error', 'No se encontró información del usuario');
      return;
    }

    setLoading(true);

    try {
      let imagenURL = null;
      
      // Subir imagen si existe
      if (imagen) {
        imagenURL = await uploadImage(imagen);
        if (!imagenURL) {
          setLoading(false);
          return;
        }
      }

      // Crear publicación en Firestore
      const publicacionRef = await addDoc(collection(db, 'publicaciones'), {
        usuarioID: usuarioID,
        contenido: texto.trim(),
        imagen: imagenURL,
        fechaCreacion: new Date(),
        likes: 0,
        comentarios: 0,
        estado: 'activo'
      });

      console.log('Publicación creada:', publicacionRef.id);
      
      Alert.alert('Éxito', 'Publicación creada exitosamente', [
        {
          text: 'OK',
          onPress: () => {
            setTexto('');
            setImagen(null);
            router.back();
          }
        }
      ]);

    } catch (error) {
      console.error('Error creando publicación:', error);
      Alert.alert('Error', 'No se pudo crear la publicación');
    } finally {
      setLoading(false);
    }
  };

  return (
  <View style={styles.container}>
    {/* Header */}
    <LinearGradient
      colors={['#2F4AA6', '#0491C6']}
      style={styles.mainHeader}
    />

    {/* Sub-header*/}
    <View style={styles.subHeader}>
      <View style={styles.headerLeft}>
        <Pressable onPress={onGoBack}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Image 
          source={{ uri: "https://i.pinimg.com/736x/96/55/d8/9655d8c062e1019d5619b882c0baf989.jpg" }} 
          style={styles.avatar} 
        />
        <Text style={styles.name}>{usuarioNombre}</Text>
      </View>
      <ModButton 
        title={loading ? 'Publicando...' : 'Publicar'} 
        onPress={loading || uploading ? () => {} : publicar} 
        backgroundColor={loading || uploading ? "#9CA3AF" : "#1d4ed8"} 
        style={{borderRadius:20,}}
      />
    </View>

    {/* Input*/}
    <TextInput
      style={styles.input}
      placeholder="¿Qué está pasando?"
      placeholderTextColor="#999"
      multiline
      value={texto}
      onChangeText={setTexto}
      maxLength={280}
    />

    {/* Imagen seleccionada */}
    {imagen && (
      <View style={styles.imageContainer}>
        <Image source={{ uri: imagen }} style={styles.selectedImage} />
        <Pressable 
          style={styles.removeImageBtn}
          onPress={() => setImagen(null)}
        >
          <Text style={styles.removeImageText}>✕</Text>
        </Pressable>
      </View>
    )}

    {/* Footer */}
    <View style={styles.footer}>
      <Pressable 
        style={[styles.actionBtn, uploading && styles.actionBtnDisabled]}
        onPress={selectImage}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#666" />
        ) : (
          <Text style={styles.icon}>📷</Text>
        )}
      </Pressable>
      <Text style={styles.counter}>{280 - texto.length}</Text>
    </View>
  </View>
);
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mainHeader: { 
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },

  subHeader: { 
    position: 'absolute',
    top: 30, 
    left: 0,
    right: 0,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    zIndex: 999,
  },

  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  back: { fontSize: 24, color: '#2F4AA6', marginRight: 16, fontFamily: 'Montserrat_400Regular', },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  name: { fontSize: 16, color: '#333', fontWeight: '500', fontFamily: 'Montserrat_400Regular', },

  btn: { backgroundColor: '#2F80ED', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  btnDisabled: { backgroundColor: '#2F80ED' },
  btnText: { color: '#fff', fontWeight: '600', fontFamily: 'Montserrat_400Regular', },
  btnTextDisabled: { color: 'rgba(255,255,255,0.7)' },

  input: { 
    flex: 1, 
    fontSize: 18, 
    padding: 16, 
    textAlignVertical: 'top',
    marginTop: 60,
    fontFamily: 'Montserrat_400Regular',
  },

  footer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#E5E5E5' 
  },
  actionBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#F5F5F5', 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  actionBtnDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.6
  },
  icon: { fontSize: 20 },
  counter: { fontSize: 14, color: '#666', fontFamily: 'Montserrat_400Regular', },
  
  // Estilos para imagen seleccionada
  imageContainer: {
    position: 'relative',
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden'
  },
  selectedImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover'
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  removeImageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
export default NuevaPublicacionScreen;