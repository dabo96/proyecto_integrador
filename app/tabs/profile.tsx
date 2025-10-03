import { EvilIcons, Feather, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { Animated, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const Profile = () => {
  const scrollY = useRef(new Animated.Value(0)).current;

  // ANIMACION PARA EL HEADER CUANDO SE DESPLIEGA
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

  const profileData = {
    name: "Andrea González Hernández",
    profileImage: "https://randomuser.me/api/portraits/women/54.jpg",
    followers: 524,
    following: 850,
    bio: "Estudiante de Ingeniería de Sistemas",
  };

  // ... actionButtonsData, postsData, handlers (sin cambios) ...
  const actionButtonsData = [
    { id: 1, icon: { name: 'lock', type: FontAwesome }, title: 'Cambiar Contraseña', action: () => alert('Cambiar contraseña'), showArrow: true },
    { id: 2, icon: { name: 'shopping-basket', type: FontAwesome }, title: 'Score Profesional', action: () => alert('Ver score'), stars: '⭐⭐⭐⭐⭐', showArrow: false },
    { id: 3, icon: { name: 'user-circle', type: FontAwesome }, title: 'Editar Perfil', action: () => alert('Editar perfil'), showArrow: true },
    { id: 4, icon: { name: 'cog', type: FontAwesome }, title: 'Configuración', action: () => alert('Configuración'), showArrow: true },
    { id: 5, icon: { name: 'log-out', type: Feather }, title: 'Cerrar Sesión', action: () => alert('Cerrar sesión'), showArrow: false }
  ];

  const postsData = [
    { id: 1, image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=250&fit=crop', description: 'Trabajando en una aplicación increíble con React Native y Expo. ¡Los resultados están siendo geniales!', timestamp: '2 horas' },
    { id: 2, image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop', description: 'Excelente presentación sobre las últimas tendencias en desarrollo mobile. Aprendizaje constante es clave.', timestamp: '5 horas' },
    { id: 3, image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=250&fit=crop', description: 'Nada mejor que trabajar con un equipo increíble. La colaboración hace la diferencia en cada proyecto.', timestamp: '1 día' },
    { id: 4, image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=250&fit=crop', description: 'El espacio de trabajo influye mucho en la productividad. ¿Cuál es tu lugar favorito para programar?', timestamp: '2 días' },
    { id: 5, image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=250&fit=crop', description: 'La importancia de escribir código limpio y mantenible. Cada línea cuenta para el futuro del proyecto.', timestamp: '3 días' },
    { id: 6, image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=250&fit=crop', description: 'Las conexiones profesionales son fundamentales. Cada conversación puede abrir nuevas oportunidades.', timestamp: '5 días' }
  ];

  const handleLike = (postId: number) => { alert(`Te gustó el post ${postId}`); };
  const handleComment = (postId: number) => { alert(`Comentar en el post ${postId}`); };
  const handleShare = (postId: number) => { alert(`Compartir el post ${postId}`); };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0077B5" barStyle="light-content" />

      {/* HEADER ANIMADO */}
      <Animated.View style={[styles.stickyHeader, { height: headerHeight }]}>
        {/* Use animated LinearGradient so paddingBottom (Animated) is accepted */}
        <AnimatedLinearGradient
          colors={['#2F4AA6', '#0491C6']}
          style={[styles.headerGradient, { paddingBottom: paddingBottom }]}
        >
          {/* IMAGEN DE PERFIL */}
          <View style={styles.profileImageContainer}>
            <Animated.Image
              source={{ uri: profileData.profileImage }}
              style={[
                styles.profileImage,
                {
                  width: profileImageSize,
                  height: profileImageSize,
                  // Half of the size -> multiply by 0.5
                  borderRadius: Animated.multiply(profileImageSize, 0.5),
                },
              ]}
            />
          </View>

          {/* NOMBRE Y BIO */}
          <Animated.Text style={[styles.name, { fontSize: nameSize }]}>
            {profileData.name}
          </Animated.Text>

          <Animated.View style={[styles.bioContainer, { opacity: buttonsOpacity }]}>
            <Text style={styles.bioText}>{profileData.bio}</Text>
            <Text style={styles.locationText}></Text>
          </Animated.View>

          {/* ESTADÍSTICAS */}
          <Animated.View style={[styles.statsContainer, {
            opacity: buttonsOpacity,
            transform: [{ translateY: buttonsTranslateY }],
          }]}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{profileData.followers}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{profileData.following}</Text>
              <Text style={styles.statLabel}>Seguidos</Text>
            </View>
          </Animated.View>

          {/* BOTONES DEL PERFIL DE USUARIOS */}
          <Animated.View style={[styles.profileActions, {
            opacity: buttonsOpacity,
            transform: [{ translateY: buttonsTranslateY }],
          }]}>
            <TouchableOpacity style={styles.profileActionButton} onPress={() => { }}>
              <FontAwesome name="lock" size={18} color="#919191ff" />
              <Text style={styles.profileActionText}>Cambiar Contraseña</Text>
              <MaterialIcons name="arrow-right" size={25} color="#919191ff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileActionButton}>
              <FontAwesome name="shopping-basket" size={18} color="#919191ff" />
              <Text style={styles.profileActionText}>Score</Text>
              <Text style={styles.starsText}>⭐⭐⭐</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileActionButton}>
              <Feather name="log-out" size={18} color="#919191ff" />
              <Text style={styles.profileActionText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </Animated.View>
        </AnimatedLinearGradient>
      </Animated.View>

      {/* Scroll */}
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {postsData.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* HEADER DEL POST */}
            <View style={styles.postHeader}>
              <View style={styles.postUserInfo}>
                <Image source={{ uri: profileData.profileImage }} style={styles.postUserImage} />
                <View>
                  <Text style={styles.postUserName}>{profileData.name}</Text>
                  <Text style={styles.postTimestamp}>{post.timestamp}</Text>
                </View>
              </View>
              <TouchableOpacity>
                <MaterialIcons name="more-horiz" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* CONTENIDO DEL POST */}
            <View style={styles.postContent}>
              <Text style={styles.postDescription}>{post.description}</Text>
            </View>

            {/* IMAGEN DEL POST */}
            <Image source={{ uri: post.image }} style={styles.postImage} />

            {/* ACCIONES DEL POST */}
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(post.id)}>
                <Feather name="heart" size={18} color="#666" />
                <Text style={styles.actionText}></Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={() => handleComment(post.id)}>
                <EvilIcons name="comment" size={25} color="#666" />
                <Text style={styles.actionText}></Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.bottomSpace} />
      </Animated.ScrollView>
    </View>
  );
};

// --- styles (sin cambios) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  stickyHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerGradient: {
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    height: '100%',
    justifyContent: 'flex-start',
    position: 'relative',
    overflow: 'hidden',
    paddingTop: 25,
  },
  profileImageContainer: { marginBottom: 10, zIndex: 10 },
  profileImage: { borderWidth: 3, borderColor: 'white' },
  name: { fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 15, zIndex: 10 },
  actionButtons: { flexDirection: 'row', gap: 15, zIndex: 10 },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 520, paddingBottom: 10 },
  postCard: { backgroundColor: 'white', marginHorizontal: 15, marginVertical: 8, borderRadius: 15, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84 },
  postImage: { width: '100%', height: 250, resizeMode: 'cover' },
  postActions: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 20, paddingVertical: 15, gap: 10, alignItems: 'center' },
  leftActions: { flexDirection: 'row', gap: 20 },
  actionButton: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  actionIcon: { fontSize: 18 },
  actionText: { fontSize: 16, color: '#666', fontWeight: '500' },
  bottomSpace: { height: 50 },
  bottomNav: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: '#E0E0E0' },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 5 },
  profileActions: { width: '100%', gap: 12, zIndex: 10 },
  profileActionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingHorizontal: 20, paddingVertical: 18, borderRadius: 12, gap: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  profileActionText: { color: '#333', fontSize: 16, fontWeight: '500', flex: 1 },
  starsText: { fontSize: 14 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, paddingBottom: 10 },
  postUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postUserImage: { width: 40, height: 40, borderRadius: 20 },
  postUserName: { fontWeight: '600', fontSize: 14, color: '#333' },
  postTimestamp: { fontSize: 12, color: '#666', marginTop: 2 },
  postContent: { paddingHorizontal: 15, paddingBottom: 10 },
  postTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 5 },
  postDescription: { fontSize: 14, color: '#666', lineHeight: 20 },
  postStats: { paddingHorizontal: 15, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0' },
  postStatsText: { fontSize: 12, color: '#666' },
  statBox: { alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  statNumber: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, fontWeight: '500' },
  statsContainer: { flexDirection: 'row', gap: 30, marginBottom: 25, zIndex: 10 },
  bioContainer: { alignItems: 'center', marginBottom: 15, zIndex: 10 },
  bioText: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 14, textAlign: 'center', marginBottom: 4 },
  locationText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, textAlign: 'center' },
});

export default Profile;
