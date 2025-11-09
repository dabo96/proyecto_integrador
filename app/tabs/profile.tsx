import { obtenerPerfilUsuario, obtenerPublicacionesPerfil, PerfilUsuario, PublicacionPerfil, } from '@/api/profileService';
import { Feather, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Modal, Pressable, StatusBar, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const Profile = () => {
  const router = useRouter();
  const { userId: usuarioId } = useLocalSearchParams();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<PerfilUsuario | null>(null);
  const [userPosts, setUserPosts] = useState<PublicacionPerfil[]>([]);

  const [seguidores, setSeguidores] = useState<number>(0);

  // 🔹 Modales
  const [showModal, setShowModal] = useState(false); // Confirmar cierre
  const [showLoggingOutModal, setShowLoggingOutModal] = useState(false); // Mostrando "Cerrando sesión..."

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

  useEffect(() => {
    loadUserData();
  }, [usuarioId]);

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

      console.log('🔍 Cargando perfil para usuario:', targetUserId);

      const perfil = await obtenerPerfilUsuario(targetUserId);
      if (!perfil) return console.error('No se pudo cargar el perfil');
      setUserProfile(perfil);

      const publicaciones = await obtenerPublicacionesPerfil(targetUserId);
      setUserPosts(publicaciones);

      setSeguidores(perfil.seguidores);
    } catch (error) {
      console.error('Error cargando datos del perfil:', error);
    } finally {
      setLoading(false);
    }
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

      <Animated.View style={[styles.stickyHeader, { height: headerHeight }]}>
        <AnimatedLinearGradient
          colors={['#2F4AA6', '#0491C6']}
          style={[styles.headerGradient, { paddingBottom: paddingBottom }]}
        >
          <View style={styles.profileImageContainer}>
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
          </View>

          <Animated.Text style={[styles.name, { fontSize: nameSize }]}>
            {`${userProfile.nombre || 'Usuario'} ${userProfile.apellido || ''}`}
          </Animated.Text>

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
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{seguidores}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Seguidos</Text>
            </View>
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
          userPosts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.postUserInfo}>
                  <Image
                    source={
                      userProfile.fotoPerfil
                        ? { uri: userProfile.fotoPerfil }
                        : require('@/assets/images/react-logo.png')
                    }
                    style={styles.postUserImage}
                  />
                  <View>
                    <Text style={styles.postUserName}>{primerNombre}</Text>
                    <Text style={styles.postTimestamp}>Hace un rato</Text>
                  </View>
                </View>
                <TouchableOpacity>
                  <MaterialIcons name="more-horiz" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.postContent}>
                <Text style={styles.postDescription}>{post.texto}</Text>
              </View>

              {post.imagenUrl && (
                <Image source={{ uri: post.imagenUrl }} style={styles.postImage} />
              )}
            </View>
          ))
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
  profileImageContainer: { marginBottom: 10 },
  profileImage: { borderWidth: 3, borderColor: 'white' },
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
  createPostButtonText: { color: 'white', fontSize: 16, fontWeight: '500' },
});

export default Profile;
