import { actualizarFotoPerfil, obtenerListaSeguidos, obtenerPerfilUsuario, obtenerPublicacionesPerfil, PerfilUsuario, PublicacionPerfil } from '@/api/profileService';
import { obtenerUsuarioPorId } from '@/api/usuariosService';
import PostCard from '@/components/cards/PostCard';
import { db } from '@/services/firebase';
import { validarYSubirImagen } from '@/services/imageModerationClient';
import { Feather, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Image, Modal, Platform, Pressable, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface Comentario {
  id: string;
  usuarioID: string;
  comentario: string;
  fecha: any;
  autor: {
    nombres: string;
    apellidos: string;
    fotoPerfil?: string;
  };
}

const Profile = () => {
  const router = useRouter();
  const { userId: usuarioId } = useLocalSearchParams();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<PerfilUsuario | null>(null);
  const [userPosts, setUserPosts] = useState<PublicacionPerfil[]>([]);

  const [seguidores, setSeguidores] = useState<number>(0);
  const [seguidos, setSeguidos] = useState<number>(0);
  const [currentUserID, setCurrentUserID] = useState<string>('');

  // 🔹 Estados para interacciones
  const [likedPosts, setLikedPosts] = useState<{ [postId: string]: boolean }>({});
  const [comentarios, setComentarios] = useState<{ [postId: string]: Comentario[] }>({});
  const [loadingComments, setLoadingComments] = useState<string | null>(null);
  const [showCommentInput, setShowCommentInput] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // 🔹 Modales
  const [showModal, setShowModal] = useState(false); // Confirmar cierre
  const [showLoggingOutModal, setShowLoggingOutModal] = useState(false); // Mostrando "Cerrando sesión..."
  const [uploadingImage, setUploadingImage] = useState(false); // Subiendo imagen
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [modalType, setModalType] = useState<'seguidos' | 'seguidores'>('seguidos');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);

  // Animaciones
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 350],
    outputRange: [520, 140],
    extrapolate: 'clamp',
  });
  const profileImageSize = scrollY.interpolate({
    inputRange: [0, 350],
    outputRange: [80, 50],
    extrapolate: 'clamp',
  });
  const nameSize = scrollY.interpolate({
    inputRange: [0, 350],
    outputRange: [24, 14],
    extrapolate: 'clamp',
  });
  const buttonsOpacity = scrollY.interpolate({
    inputRange: [0, 50, 350],
    outputRange: [1, 0.1, 0],
    extrapolate: 'clamp',
  });
  const buttonsTranslateY = scrollY.interpolate({
    inputRange: [0, 350],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });
  const paddingBottom = scrollY.interpolate({
    inputRange: [0, 350],
    outputRange: [20, 10],
    extrapolate: 'clamp',
  });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      let targetUserId: string;

      if (usuarioId && typeof usuarioId === 'string') {
        targetUserId = usuarioId;
      } else {
        const storedUsuarioID = await AsyncStorage.getItem('usuarioID');
        if (!storedUsuarioID) {
          console.error('No se encontró usuarioID');
          return;
        }
        targetUserId = storedUsuarioID;
      }

      setCurrentUserID(targetUserId);
      console.log('🔍 Cargando perfil para usuario:', targetUserId);

      const perfil = await obtenerPerfilUsuario(targetUserId);
      if (!perfil) return console.error('No se pudo cargar el perfil');
      setUserProfile(perfil);

      const publicaciones = await obtenerPublicacionesPerfil(targetUserId);
      setUserPosts(publicaciones);

      // Verificar likes del usuario actual
      const storedUsuarioID = await AsyncStorage.getItem('usuarioID');
      if (storedUsuarioID) {
        for (const post of publicaciones) {
          const likeQuery = query(
            collection(db, 'interacciones'),
            where('usuarioID', '==', storedUsuarioID),
            where('publicacionID', '==', post.id),
            where('tipo', '==', 'like')
          );
          const likeSnapshot = await getDocs(likeQuery);
          if (!likeSnapshot.empty) {
            setLikedPosts(prev => ({ ...prev, [post.id]: true }));
          }
        }
      }

      setSeguidores(perfil.seguidores);
      setSeguidos(perfil.seguidos);
    } catch (error) {
      console.error('Error cargando datos del perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [usuarioId]);

  // Recargar datos cuando la pantalla recibe foco (al regresar de editProfile)
  useFocusEffect(
    useCallback(() => {
      loadUserData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuarioId])
  );

  // 🔹 Funciones de interacción
  const handleLike = async (postId: string) => {
    const storedUsuarioID = await AsyncStorage.getItem('usuarioID');
    if (!storedUsuarioID) return;

    try {
      const likeQuery = query(
        collection(db, 'interacciones'),
        where('usuarioID', '==', storedUsuarioID),
        where('publicacionID', '==', postId),
        where('tipo', '==', 'like')
      );
      const likeSnapshot = await getDocs(likeQuery);

      if (likeSnapshot.empty) {
        await addDoc(collection(db, 'interacciones'), {
          usuarioID: storedUsuarioID,
          publicacionID: postId,
          tipo: 'like',
          fecha: new Date()
        });
        setLikedPosts(prev => ({ ...prev, [postId]: true }));
        await actualizarConteos(postId);
      } else {
        const likeDoc = likeSnapshot.docs[0];
        await deleteDoc(likeDoc.ref);
        setLikedPosts(prev => ({ ...prev, [postId]: false }));
        await actualizarConteos(postId);
      }
    } catch (error) {
      console.error('Error dando like:', error);
    }
  };

  const cargarComentarios = async (postId: string) => {
    setLoadingComments(postId);
    try {
      const comentariosQuery = query(
        collection(db, 'interacciones'),
        where('publicacionID', '==', postId),
        where('tipo', '==', 'comentario')
      );
      const comentariosSnapshot = await getDocs(comentariosQuery);

      const comentariosList: Comentario[] = [];

      for (const docSnapshot of comentariosSnapshot.docs) {
        const data = docSnapshot.data();

        const usuarioRef = doc(db, 'Usuarios', data.usuarioID);
        const usuarioDoc = await getDoc(usuarioRef);

        if (usuarioDoc.exists()) {
          const usuarioData = usuarioDoc.data() as any;
          const nombreFuente = usuarioData.nombreCompleto || usuarioData.nombre || '';
          const partesNombre = nombreFuente.trim().split(' ');
          const nombres = usuarioData.nombres || partesNombre[0] || '';
          const apellidos = usuarioData.apellidos || partesNombre.slice(1).join(' ') || '';

          comentariosList.push({
            id: docSnapshot.id,
            usuarioID: data.usuarioID,
            comentario: data.comentario,
            fecha: data.fecha,
            autor: {
              nombres,
              apellidos,
              fotoPerfil: usuarioData.fotoPerfil
            }
          });
        }
      }

      comentariosList.sort((a, b) => {
        const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return fechaB.getTime() - fechaA.getTime();
      });

      setComentarios(prev => ({ ...prev, [postId]: comentariosList }));
    } catch (error) {
      console.error('Error cargando comentarios:', error);
    } finally {
      setLoadingComments(null);
    }
  };

  const handleComment = async (postId: string) => {
    if (showCommentInput === postId) {
      if (!commentText.trim()) {
        setShowCommentInput(null);
        return;
      }

      const storedUsuarioID = await AsyncStorage.getItem('usuarioID');
      if (!storedUsuarioID) return;

      try {
        await addDoc(collection(db, 'interacciones'), {
          usuarioID: storedUsuarioID,
          publicacionID: postId,
          tipo: 'comentario',
          comentario: commentText.trim(),
          fecha: new Date()
        });

        setCommentText('');
        setShowCommentInput(null);
        await actualizarConteos(postId);
        await cargarComentarios(postId);
      } catch (error) {
        console.error('Error enviando comentario:', error);
      }
    } else {
      setShowCommentInput(postId);
      await cargarComentarios(postId);
    }
  };

  const handleSendComment = async (postId: string) => {
    if (!commentText.trim()) return;

    const storedUsuarioID = await AsyncStorage.getItem('usuarioID');
    if (!storedUsuarioID) return;

    try {
      await addDoc(collection(db, 'interacciones'), {
        usuarioID: storedUsuarioID,
        publicacionID: postId,
        tipo: 'comentario',
        comentario: commentText.trim(),
        fecha: new Date()
      });

      setCommentText('');
      await actualizarConteos(postId);
      await cargarComentarios(postId);
    } catch (error) {
      console.error('Error enviando comentario:', error);
    }
  };

  const handleDelete = (postId: string) => {
    console.log('🗑️ handleDelete llamado para postId:', postId);
    setPostToDelete(postId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;
    
    console.log('✅ Confirmando eliminación de publicación:', postToDelete);
    setDeletingPost(true);
    
    try {
      console.log('📤 Eliminando publicación de Firestore...');
      await deleteDoc(doc(db, 'publicaciones', postToDelete));
      console.log('✅ Publicación eliminada de Firestore');
      
      // Eliminar interacciones asociadas (likes y comentarios)
      console.log('🗑️ Eliminando interacciones asociadas...');
      try {
        const likesQuery = query(
          collection(db, 'interacciones'),
          where('publicacionID', '==', postToDelete)
        );
        const likesSnapshot = await getDocs(likesQuery);
        const deletePromises = likesSnapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
        await Promise.all(deletePromises);
        console.log('✅ Interacciones eliminadas');
      } catch (interactionsError) {
        console.error('⚠️ Error eliminando interacciones (continuando):', interactionsError);
      }
      
      // Actualizar el estado local
      console.log('🔄 Actualizando estado local...');
      setUserPosts(prev => prev.filter(p => p.id !== postToDelete));
      setLikedPosts(prev => {
        const newLiked = { ...prev };
        delete newLiked[postToDelete];
        return newLiked;
      });
      setComentarios(prev => {
        const newComentarios = { ...prev };
        delete newComentarios[postToDelete];
        return newComentarios;
      });
      
      console.log('✅ Publicación eliminada exitosamente');
      setShowDeleteModal(false);
      setPostToDelete(null);
      
      // Mostrar mensaje de éxito
      Alert.alert('Éxito', 'Publicación eliminada correctamente');
    } catch (error: any) {
      console.error('❌ Error eliminando publicación:', error);
      console.error('Detalles del error:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      });
      Alert.alert(
        'Error', 
        `No se pudo eliminar la publicación.\n\n${error?.message || 'Error desconocido'}`
      );
    } finally {
      setDeletingPost(false);
    }
  };

  const actualizarConteos = async (postId: string) => {
    try {
      const likesQuery = query(
        collection(db, 'interacciones'),
        where('publicacionID', '==', postId),
        where('tipo', '==', 'like')
      );
      const likesSnapshot = await getDocs(likesQuery);

      const comentariosQuery = query(
        collection(db, 'interacciones'),
        where('publicacionID', '==', postId),
        where('tipo', '==', 'comentario')
      );
      const comentariosSnapshot = await getDocs(comentariosQuery);

      setUserPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, likes: likesSnapshot.size, comentarios: comentariosSnapshot.size }
            : post
        )
      );
    } catch (error) {
      console.error('Error actualizando conteos:', error);
    }
  };

  // Función para obtener lista de usuarios seguidos con datos completos
  const obtenerSeguidosCompletos = async (usuarioID: string): Promise<any[]> => {
    try {
      setLoadingUsers(true);
      const seguidosIDs = await obtenerListaSeguidos(usuarioID);
      console.log('📊 IDs de seguidos obtenidos:', seguidosIDs.length, seguidosIDs);
      
      // Usar un Set para evitar duplicados
      const usuariosUnicos = new Map<string, any>();
      
      for (const seguidoID of seguidosIDs) {
        // Evitar procesar el mismo ID dos veces
        if (usuariosUnicos.has(seguidoID)) continue;
        
        const usuario = await obtenerUsuarioPorId(seguidoID);
        if (usuario) {
          usuariosUnicos.set(seguidoID, {
            id: usuario.id,
            nombre: usuario.nombreCompleto || usuario.nombre || 'Usuario',
            codigo: usuario.codigo || usuario.codigoUniversitario || undefined,
            carrera: usuario.carrera || undefined,
            correo: usuario.correo || undefined,
            fotoPerfil: usuario.fotoPerfil || undefined,
          });
        }
      }

      const usuarios = Array.from(usuariosUnicos.values());
      console.log('📊 Usuarios seguidos únicos:', usuarios.length);
      return usuarios;
    } catch (error) {
      console.error('Error obteniendo seguidos:', error);
      return [];
    } finally {
      setLoadingUsers(false);
    }
  };

  // Función para obtener lista de seguidores con datos completos
  const obtenerSeguidoresCompletos = async (usuarioID: string): Promise<any[]> => {
    try {
      setLoadingUsers(true);
      const todosUsuarios = await getDocs(collection(db, 'Usuarios'));
      const seguidores: any[] = [];

      for (const usuarioDoc of todosUsuarios.docs) {
        const contactosRef = collection(db, 'Usuarios', usuarioDoc.id, 'contactos');
        const contactosSnapshot = await getDocs(contactosRef);

        let esSeguidor = false;
        contactosSnapshot.forEach((contactoDoc) => {
          const data = contactoDoc.data();
          if (data.seguidoID === usuarioID) {
            esSeguidor = true;
          }
        });

        if (esSeguidor) {
          const usuario = await obtenerUsuarioPorId(usuarioDoc.id);
          if (usuario) {
            seguidores.push({
              id: usuario.id,
              nombre: usuario.nombreCompleto || usuario.nombre || 'Usuario',
              codigo: usuario.codigo || usuario.codigoUniversitario || undefined,
              carrera: usuario.carrera || undefined,
              correo: usuario.correo || undefined,
              fotoPerfil: usuario.fotoPerfil || undefined,
            });
          }
        }
      }

      return seguidores;
    } catch (error) {
      console.error('Error obteniendo seguidores:', error);
      return [];
    } finally {
      setLoadingUsers(false);
    }
  };

  // Función para abrir modal de seguidos
  const handleOpenSeguidos = async () => {
    if (!currentUserID) return;
    setModalType('seguidos');
    setShowUsersModal(true);
    const usuarios = await obtenerSeguidosCompletos(currentUserID);
    setUsersList(usuarios);
    // Actualizar el contador basándose en la lista real
    setSeguidos(usuarios.length);
  };

  // Función para abrir modal de seguidores
  const handleOpenSeguidores = async () => {
    if (!currentUserID) return;
    setModalType('seguidores');
    setShowUsersModal(true);
    const usuarios = await obtenerSeguidoresCompletos(currentUserID);
    setUsersList(usuarios);
    // Actualizar el contador basándose en la lista real
    setSeguidores(usuarios.length);
  };

  // 🔹 Mostrar modal antes de salir
  const handleOpenLogoutModal = () => setShowModal(true);
  const handleCancelLogout = () => setShowModal(false);

  // 🔹 Cerrar sesión confirmado
  const handleLogout = async () => {
    try {
      setShowModal(false);
      setShowLoggingOutModal(true); // Mostrar modal "Cerrando sesión..."

      // Simular un pequeño retardo para UX más fluida
      setTimeout(async () => {
        await AsyncStorage.removeItem('usuarioID');
        await AsyncStorage.removeItem('usuarioNombre');
        setShowLoggingOutModal(false);
        router.replace('/iniciarSesion');
      }, 500);
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      setShowLoggingOutModal(false);
    }
  };

  // 🔹 Cambiar foto de perfil
  const handleChangeProfilePhoto = async () => {
    console.log('📸 handleChangeProfilePhoto llamado');
    try {
      console.log('🔐 Solicitando permisos de galería...');
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📋 Estado de permisos:', status);

      if (status !== 'granted') {
        Alert.alert('Permisos necesarios', 'Necesitamos acceso a tu galería para cambiar la foto de perfil.');
        return;
      }

      console.log('✅ Permisos otorgados, mostrando opciones...');

      // En web, mostrar directamente el selector de archivos
      if (Platform.OS === 'web') {
        console.log('🌐 Plataforma web detectada, usando selector directo');
        pickImage('library');
        return;
      }

      // En móvil, mostrar opciones
      Alert.alert(
        'Cambiar foto de perfil',
        'Selecciona una opción',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => console.log('❌ Usuario canceló'),
          },
          {
            text: 'Tomar foto',
            onPress: () => {
              console.log('📷 Usuario eligió tomar foto');
              pickImage('camera');
            },
          },
          {
            text: 'Elegir de galería',
            onPress: () => {
              console.log('🖼️ Usuario eligió galería');
              pickImage('library');
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error: any) {
      console.error('❌ Error solicitando permisos:', error);
      Alert.alert('Error', `No se pudieron solicitar los permisos necesarios.\n\n${error?.message || ''}`);
    }
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      let result;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permisos necesarios', 'Necesitamos acceso a tu cámara para tomar una foto.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0] && currentUserID) {
        setUploadingImage(true);
        const imageUri = result.assets[0].uri;
        console.log('📸 Imagen seleccionada:', imageUri);
        console.log('👤 Usuario ID:', currentUserID);

        try {
          // Validar y subir imagen (la validación es transparente)
          console.log('⬆️ Iniciando validación y subida...');
          const validacionResult = await validarYSubirImagen(
            imageUri,
            currentUserID
          );

          if (!validacionResult.success) {
            setUploadingImage(false);
            Alert.alert(
              'Contenido no permitido',
              validacionResult.error || 'La imagen no cumple con nuestras políticas de contenido.'
            );
            return;
          }

          const downloadURL = validacionResult.url!;
          console.log('✅ Imagen validada y subida, URL:', downloadURL);

          // Actualizar perfil en Firestore
          console.log('📝 Actualizando perfil en Firestore...');
          await actualizarFotoPerfil(currentUserID, downloadURL);
          console.log('✅ Perfil actualizado');

          // Recargar datos del perfil
          console.log('🔄 Recargando datos del perfil...');
          await loadUserData();
          console.log('✅ Datos recargados');

          setUploadingImage(false);
          Alert.alert('Éxito', 'Foto de perfil actualizada correctamente.');
        } catch (uploadError: any) {
          console.error('❌ Error en el proceso de subida:', uploadError);
          console.error('Mensaje de error:', uploadError?.message);
          console.error('Stack:', uploadError?.stack);
          setUploadingImage(false);
          Alert.alert(
            'Error',
            `No se pudo actualizar la foto de perfil.\n\nError: ${uploadError?.message || 'Error desconocido'}\n\nRevisa la consola para más detalles.`
          );
        }
      } else {
        console.log('⚠️ Selección cancelada o datos incompletos');
      }
    } catch (error: any) {
      console.error('❌ Error cambiando foto de perfil:', error);
      console.error('Mensaje de error:', error?.message);
      setUploadingImage(false);
      Alert.alert(
        'Error',
        `No se pudo cambiar la foto de perfil.\n\nError: ${error?.message || 'Error desconocido'}`
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F4AA6" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No se pudo cargar el perfil</Text>
      </View>
    );
  }

  const primerNombre = userProfile?.nombre?.split(' ')[0] || 'Usuario';

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2F4AA6" barStyle="light-content" />

      <Animated.View style={[styles.stickyHeader, { height: headerHeight }]} pointerEvents="box-none">
        <AnimatedLinearGradient
          colors={['#2F4AA6', '#0491C6']}
          style={[styles.headerGradient, { paddingBottom: paddingBottom }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => router.push('/tabs/editProfile')}
          >
            <MaterialIcons name="edit" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.profileImageContainer} pointerEvents="box-none">
            <Pressable
              onPress={() => {
                console.log('👆 Pressable presionado');
                handleChangeProfilePhoto();
              }}
              disabled={uploadingImage}
              style={({ pressed }) => [
                styles.profileImageTouchable,
                {
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Animated.Image
                source={
                  userProfile.fotoPerfil
                    ? { uri: userProfile.fotoPerfil }
                    : require('@/assets/images/react-logo.png')
                }
                style={[
                  styles.profileImage,
                  {
                    width: profileImageSize,
                    height: profileImageSize,
                    borderRadius: Animated.multiply(profileImageSize, 0.5),
                  },
                ]}

              />
              {uploadingImage && (
                <View style={[styles.uploadingOverlay, {
                  width: profileImageSize,
                  height: profileImageSize,
                  borderRadius: Animated.multiply(profileImageSize, 0.5),
                }]} pointerEvents="none">
                  <ActivityIndicator size="small" color="white" />
                </View>
              )}
              {!uploadingImage && (
                <Animated.View
                  style={[styles.editIconContainer, {
                    width: profileImageSize,
                    height: profileImageSize,
                  }]}
                  pointerEvents="none"
                >
                  <View style={styles.editIcon} pointerEvents="none">
                    <MaterialIcons name="camera-alt" size={16} color="white" />
                  </View>
                </Animated.View>
              )}
            </Pressable>
          </View>

          <Animated.View style={{ alignItems: 'center' }}>
            <Animated.Text style={[styles.name, { fontSize: nameSize }]}>
              {userProfile.nombre || 'Usuario'}
            </Animated.Text>
            <Animated.Text style={[styles.name, { fontSize: nameSize }]}>
              {userProfile.apellido || ''}
            </Animated.Text>
          </Animated.View>

          <Animated.Text style={[styles.carreraText, { opacity: buttonsOpacity }]}>
            {userProfile.carrera || 'Sin carrera'}
          </Animated.Text>

          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: buttonsOpacity,
                transform: [{ translateY: buttonsTranslateY }],
              },
            ]}
          >
            <TouchableOpacity 
              style={styles.statBox}
              onPress={handleOpenSeguidores}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{seguidores}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.statBox}
              onPress={handleOpenSeguidos}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{seguidos}</Text>
              <Text style={styles.statLabel}>Seguidos</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              styles.profileActions,
              {
                opacity: buttonsOpacity,
                transform: [{ translateY: buttonsTranslateY }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.profileActionButton}
              onPress={() => router.push('/tabs/cambiarContrasena')}
            >
              <FontAwesome name="lock" size={18} color="#919191ff" />
              <Text style={styles.profileActionText}>Cambiar Contraseña</Text>
              <MaterialIcons name="arrow-right" size={25} color="#919191ff" />
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.profileActionButton}
              onPress={() => router.push('../tabs/score')}
            >
              <FontAwesome name="star" size={18} color="#FFD700" />
              <Text style={styles.profileActionText}>Score</Text>
              <Text style={styles.starsText}>⭐⭐⭐⭐⭐</Text>
            </TouchableOpacity>

            {/* 🔹 Botón que abre el modal */}
            <TouchableOpacity
              style={styles.profileActionButton}
              onPress={handleOpenLogoutModal}
            >
              <Feather name="log-out" size={18} color="#919191ff" />
              <Text style={styles.profileActionText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </Animated.View>
        </AnimatedLinearGradient>
      </Animated.View>

      {/* 🧾 Publicaciones */}
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {userPosts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes publicaciones aún</Text>
            <TouchableOpacity
              style={styles.createPostButton}
              onPress={() => router.push('./newPost')}
            >
              <Text style={styles.createPostButtonText}>Crear publicación</Text>
            </TouchableOpacity>
          </View>
        ) : (
          userPosts.map((post) => {
            // Obtener el usuarioID actual de AsyncStorage si no está disponible
            const getCurrentUserId = async () => {
              if (!currentUserID) {
                const stored = await AsyncStorage.getItem('usuarioID');
                return stored || '';
              }
              return currentUserID;
            };
            
            // Verificar que el post pertenece al usuario actual
            // En el perfil propio, siempre debería ser true, pero verificamos por seguridad
            const storedUsuarioID = currentUserID; // Usar el valor actual
            const isOwner = post.usuarioID === storedUsuarioID || storedUsuarioID === userProfile?.id;
            
            console.log('📋 Post info:', { 
              postId: post.id, 
              postUsuarioID: post.usuarioID, 
              currentUserID: storedUsuarioID,
              userProfileId: userProfile?.id,
              isOwner 
            });
            
            return (
              <PostCard
                key={post.id}
                post={{
                  id: post.id,
                  usuarioID: post.usuarioID,
                  contenido: post.texto,
                  fechaCreacion: post.fechaCreacion,
                  imagen: post.imagenUrl,
                  autor: {
                    nombres: userProfile.nombre,
                    apellidos: userProfile.apellido,
                    fotoPerfil: userProfile.fotoPerfil
                  },
                  likes: post.likes,
                  comentarios: post.comentarios,
                  isOwner: true // SIEMPRE true en perfil propio - valor literal
                }}
                liked={likedPosts[post.id] || false}
                onLike={handleLike}
                onComment={handleComment}
                onDelete={handleDelete}
                currentUserId={currentUserID || userProfile?.id || ''}
              formatTime={(timestamp) => {
                if (!timestamp) return 'Hace un momento';
                const now = new Date();
                const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
                const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
                if (diffInSeconds < 60) return 'Hace un momento';
                if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
                if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
                if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
                return postDate.toLocaleDateString();
              }}
              comentarios={comentarios[post.id]}
              loadingComments={loadingComments === post.id}
              showCommentInput={showCommentInput === post.id}
              commentText={commentText}
              onCommentTextChange={setCommentText}
              onSendComment={handleSendComment}
              onCloseComment={() => {
                setShowCommentInput(null);
                setCommentText('');
                const newComentarios = { ...comentarios };
                delete newComentarios[post.id];
                setComentarios(newComentarios);
              }}
            />
            );
          })
        )}

        <View style={styles.bottomSpace} />
      </Animated.ScrollView>

      {/* 🔹 Modal de confirmación */}
      <Modal
        transparent
        animationType="fade"
        visible={showModal}
        onRequestClose={handleCancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar salida</Text>
            <Text style={styles.modalMessage}>
              ¿Deseas cerrar sesión?
            </Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelLogout}
              >
                <Text style={styles.cancelText}>No</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleLogout}
              >
                <Text style={styles.confirmText}>Sí</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🔹 Modal "Cerrando sesión..." */}
      <Modal transparent animationType="fade" visible={showLoggingOutModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#2F4AA6" />
            <Text style={styles.modalMessage}>Cerrando sesión...</Text>
          </View>
        </View>
      </Modal>

      {/* 🔹 Modal "Subiendo imagen..." */}
      <Modal transparent animationType="fade" visible={uploadingImage}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#2F4AA6" />
            <Text style={styles.modalMessage}>Subiendo foto de perfil...</Text>
          </View>
        </View>
      </Modal>

      {/* Modal de lista de usuarios */}
      <Modal
        visible={showUsersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUsersModal(false)}
      >
        <View style={styles.usersModalOverlay}>
          <View style={styles.usersModalContainer}>
            <View style={styles.usersModalHeader}>
              <Text style={styles.usersModalTitle}>
                {modalType === 'seguidos' ? 'Seguidos' : 'Seguidores'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowUsersModal(false)}
                style={styles.usersModalCloseButton}
              >
                <Text style={styles.usersModalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingUsers ? (
              <View style={styles.usersModalLoadingContainer}>
                <ActivityIndicator size="large" color="#2F4AA6" />
                <Text style={styles.usersModalLoadingText}>Cargando...</Text>
              </View>
            ) : usersList.length === 0 ? (
              <View style={styles.usersModalEmptyContainer}>
                <Text style={styles.usersModalEmptyText}>
                  {modalType === 'seguidos' 
                    ? 'No sigues a nadie' 
                    : 'No tienes seguidores'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={usersList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.usersModalUserItem}
                    onPress={() => {
                      setShowUsersModal(false);
                      if (item.id === currentUserID) {
                        // Ya estamos en nuestro perfil, no hacer nada o recargar
                        loadUserData();
                      } else {
                        router.push({
                          pathname: './otherProfile',
                          params: { userId: item.id }
                        });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={
                        item.fotoPerfil
                          ? { uri: item.fotoPerfil }
                          : require('@/assets/images/react-logo.png')
                      }
                      style={styles.usersModalUserAvatar}
                    />
                    <View style={styles.usersModalUserInfo}>
                      <Text style={styles.usersModalUserName}>{item.nombre}</Text>
                      {item.carrera && (
                        <Text style={styles.usersModalUserCarrera}>{item.carrera}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.usersModalList}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación para eliminar publicación */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deletingPost) {
            setShowDeleteModal(false);
            setPostToDelete(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Eliminar publicación</Text>
            <Text style={styles.modalMessage}>
              ¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  if (!deletingPost) {
                    setShowDeleteModal(false);
                    setPostToDelete(null);
                  }
                }}
                disabled={deletingPost}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton, deletingPost && styles.modalButtonDisabled]}
                onPress={confirmDelete}
                disabled={deletingPost}
              >
                {deletingPost ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmText}>Eliminar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
    pointerEvents: 'box-none',
  },
  headerGradient: {
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    height: '100%',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    paddingTop: 25,
  },
  profileImageContainer: {
    marginBottom: 10,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageTouchable: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
    elevation: Platform.OS === 'android' ? 11 : 0,
    minWidth: 100,
    minHeight: 100,
  },
  profileImage: {
    borderWidth: 3,
    borderColor: 'white',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 4,
  },
  editIcon: {
    backgroundColor: '#2F4AA6',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  name: {
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 5,
  },
  carreraText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 30,
    marginBottom: 25,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statNumber: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12 },
  profileActions: { width: '100%', gap: 12 },
  profileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 12,
    gap: 15,
  },
  profileActionText: { color: '#333', fontSize: 16, fontWeight: '500', flex: 1 },
  starsText: { fontSize: 14 },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 520, paddingBottom: 10 },
  postCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingBottom: 10,
  },
  postUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postUserImage: { width: 40, height: 40, borderRadius: 20 },
  postUserName: { fontWeight: '600', fontSize: 14, color: '#333' },
  postTimestamp: { fontSize: 12, color: '#666', marginTop: 2 },
  postContent: { paddingHorizontal: 15, paddingBottom: 10 },
  postDescription: { fontSize: 14, color: '#666', lineHeight: 20 },
  postImage: { width: '100%', height: 250, resizeMode: 'cover' },
  bottomSpace: { height: 50 },

  // 🔹 Modal de usuarios
  usersModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usersModalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  usersModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  usersModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  usersModalCloseButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usersModalCloseButtonText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  usersModalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  usersModalLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  usersModalEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  usersModalEmptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  usersModalList: {
    flex: 1,
  },
  usersModalUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  usersModalUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  usersModalUserInfo: {
    flex: 1,
  },
  usersModalUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  usersModalUserCarrera: {
    fontSize: 14,
    color: '#666',
  },
  // 🔹 Modal general
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '80%',
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginVertical: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: '#ccc' },
  confirmButton: { backgroundColor: '#ff4d4d' },
  modalButtonDisabled: { opacity: 0.6 },
  cancelText: { color: '#333', fontSize: 16 },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  errorText: { fontSize: 16, color: '#ff4444', textAlign: 'center' },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: { fontSize: 18, color: '#666', marginBottom: 10 },
  createPostButton: {
    backgroundColor: '#2F4AA6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editProfileButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1002,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  createPostButtonText: { color: 'white', fontSize: 16, fontWeight: '500' },
});

export default Profile;
