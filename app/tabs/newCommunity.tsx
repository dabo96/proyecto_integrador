import ModButton from '@/components/ModButton';
import { app, db } from '@/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function NewCommunityScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [imagenLocal, setImagenLocal] = useState<string | null>(null);
  const [usuarioID, setUsuarioID] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const storedUsuarioID = await AsyncStorage.getItem('usuarioID');
        if (storedUsuarioID) {
          setUsuarioID(storedUsuarioID);
        }
      } catch (error) {
      }
    };
    
    getUserData();
  }, []);

  // Función para abrir la galería
  const abrirGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso denegado',
        'Se necesita acceso a la galería para seleccionar imágenes.'
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
      setImagenLocal(result.assets[0].uri);
      setImagenUrl(''); // Limpiar URL si se selecciona imagen local
    }
  };

  // Función para subir imagen a Firebase Storage
  const subirImagenAFirebase = async (uri: string): Promise<string> => {
    try {
      const storage = getStorage(app);
      const nombreArchivo = `comunidades/${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
      const storageRef = ref(storage, nombreArchivo);

      // Convierte la URI a blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Sube la imagen
      await uploadBytes(storageRef, blob);

      // Obtiene la URL pública
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error) {
      throw error;
    }
  };

  const handleCrearComunidad = async () => {
    // Validaciones
    if (!nombre.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para la comunidad');
      return;
    }

    if (!descripcion.trim()) {
      Alert.alert('Error', 'Por favor ingresa una descripción para la comunidad');
      return;
    }

    if (!usuarioID) {
      Alert.alert('Error', 'No se encontró información del usuario');
      return;
    }

    setLoading(true);

    try {
      let imagenUrlFinal = imagenUrl;

      // Si hay una imagen local, subirla primero
      if (imagenLocal) {
        setUploading(true);
        imagenUrlFinal = await subirImagenAFirebase(imagenLocal);
        setUploading(false);
      }

      // Si no hay imagen ni local ni URL, usar imagen por defecto
      if (!imagenUrlFinal) {
        imagenUrlFinal = 'https://picsum.photos/40/40';
      }

      // Crear la comunidad en Firebase
      const comunidadData = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        imagenUrl: imagenUrlFinal,
        creadorID: usuarioID,
        fechaCreacion: new Date(),
        miembros: [usuarioID], // El creador es automáticamente miembro
        estado: 'activo'
      };

      // Guardar la comunidad
      const comunidadRef = await addDoc(collection(db, 'comunidades'), comunidadData);
      
      // Crear la referencia en la subcolección de comunidades del usuario
      await setDoc(
        doc(db, 'usuarios', usuarioID, 'comunidades', comunidadRef.id),
        {
          comunidadID: comunidadRef.id,
          fechaUnion: new Date(),
          rol: 'admin' // El creador es admin
        }
      );

      Alert.alert(
        'Éxito',
        'La comunidad ha sido creada exitosamente',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la comunidad');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2F4AA6', '#0491C6']}
        style={styles.mainHeader}
      />

      {/* Sub-header */}
      <View style={styles.subHeader}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>←</Text>
          </Pressable>
          <Text style={styles.title}>Nueva Comunidad</Text>
        </View>
      </View>

      {/* Formulario */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Campo de imagen */}
        <View style={styles.imageSection}>
          <Text style={styles.label}>Imagen de la Comunidad</Text>
          <View style={styles.imageContainer}>
            {imagenLocal ? (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: imagenLocal }} style={styles.previewImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setImagenLocal(null)}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : imagenUrl ? (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: imagenUrl }} style={styles.previewImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setImagenUrl('')}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>📷</Text>
              </View>
            )}
          </View>
          
          <View style={styles.imageButtonsContainer}>
            <TouchableOpacity 
              style={[styles.cameraButton, uploading && styles.buttonDisabled]} 
              onPress={abrirGaleria}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#2F4AA6" />
              ) : (
                <Text style={styles.cameraIcon}>📷</Text>
              )}
              <Text style={styles.cameraButtonText}>
                {uploading ? 'Subiendo...' : 'Seleccionar de galería'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.orText}>O</Text>

          <TextInput
            style={styles.urlInput}
            placeholder="URL de la imagen (opcional)"
            placeholderTextColor="#999"
            value={imagenUrl}
            onChangeText={(text) => {
              setImagenUrl(text);
              setImagenLocal(null); // Limpiar imagen local si se ingresa URL
            }}
            autoCapitalize="none"
            keyboardType="url"
            editable={!imagenLocal && !uploading}
          />
        </View>

        {/* Campo de nombre */}
        <View style={styles.fieldSection}>
          <Text style={styles.label}>Nombre de la Comunidad *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: ayuda programación"
            placeholderTextColor="#999"
            value={nombre}
            onChangeText={setNombre}
            maxLength={50}
          />
          <Text style={styles.counter}>{nombre.length}/50</Text>
        </View>

        {/* Campo de descripción */}
        <View style={styles.fieldSection}>
          <Text style={styles.label}>Descripción *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe tu comunidad..."
            placeholderTextColor="#999"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{descripcion.length}/500</Text>
        </View>

        {/* Botón crear */}
        <View style={styles.buttonContainer}>
          <ModButton
            title={loading || uploading ? 'Creando...' : 'Crear Comunidad'}
            onPress={loading || uploading ? () => {} : handleCrearComunidad}
            backgroundColor={loading || uploading ? "#9CA3AF" : "#2F4AA6"}
            style={styles.createButton}
            textStyle={styles.createButtonText}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  back: {
    fontSize: 24,
    color: '#2F4AA6',
    marginRight: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Montserrat_400Regular',
  },
  scrollView: {
    flex: 1,
    marginTop: 60,
  },
  scrollContent: {
    padding: 16,
  },
  imageSection: {
    marginBottom: 24,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 40,
  },
  imageButtonsContainer: {
    marginBottom: 12,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cameraIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  cameraButtonText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat_400Regular',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  orText: {
    textAlign: 'center',
    marginVertical: 8,
    color: '#999',
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  fieldSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  counter: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
    fontFamily: 'Montserrat_400Regular',
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  createButton: {
    borderRadius: 20,
    paddingVertical: 14,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

