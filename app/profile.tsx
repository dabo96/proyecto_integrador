import { AntDesign, FontAwesome, FontAwesome6, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { Animated, Dimensions, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
const { width } = Dimensions.get('window');
const LinkedInProfile = () => {
  const scrollY = useRef(new Animated.Value(0)).current;

  // ANIMACION PARA EL HEADER CUANDO SE DESPLIEGA
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 350],
    outputRange: [480, 140],
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
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0077B5" barStyle="light-content" />


      {/* ANIMACION DE HEADER */}
      <Animated.View style={[styles.stickyHeader, { height: headerHeight }]}>
        <LinearGradient
          colors={['#2F4AA6', '#0491C6']}
          style={[styles.headerGradient, { paddingBottom: paddingBottom }]}
        >

          <View style={styles.profileImageContainer}>
            <Animated.Image
              source={{
                uri: "https://randomuser.me/api/portraits/women/54.jpg",
              }}
              style={[styles.profileImage, {
                width: profileImageSize,
                height: profileImageSize,
                borderRadius: Animated.divide(profileImageSize, 2),
              }]}
            />
          </View>

          <Animated.Text style={[styles.name, { fontSize: nameSize }]}>
            Andrea González Hernández
          </Animated.Text>



          {/* Estadísticas de seguidores */}
          <Animated.View style={[styles.statsContainer, {
            opacity: buttonsOpacity,
            transform: [{ translateY: buttonsTranslateY }],
          }]}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>524</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>850</Text>
              <Text style={styles.statLabel}>Seguidos</Text>
            </View>
          </Animated.View>

          {/* Botones de acción estilo perfil */}
          <Animated.View style={[styles.profileActions, {
            opacity: buttonsOpacity,
            transform: [{ translateY: buttonsTranslateY }],
          }]}>
            <TouchableOpacity style={styles.profileActionButton} 
            onPress={() => {    
              // Aquí navega a la pantalla de cambio de contraseña o muestra un modal
              alert('Funcionalidad próximamente');
            }}
            >
              <AntDesign name="message" size={16} color="#666" />
              <Text style={styles.profileActionText}>Cambiar Contraseña</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileActionButton}>
              <AntDesign name="star" size={16} color="#FFD700" />
              <Text style={styles.profileActionText}>Score</Text>
              <Text style={styles.starsText}>⭐⭐⭐</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileActionButton}>
              <AntDesign name="logout" size={16} color="#666" />
              <Text style={styles.profileActionText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Scroll */}
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >

        {/* PUBLICACIONES POST */}
        <View style={styles.postCard}>
          <Image source={{
            uri: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=250&fit=crop'
          }}
            style={styles.postImage}
          />
          <View style={styles.postActions}>
            <View style={styles.leftActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>❤️</Text>
                <Text style={styles.actionText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionText}>0</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Additional Posts for Scrolling */}
        <View style={styles.postCard}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop' }}
            style={styles.postImage}
          />

          <View style={styles.postActions}>
            <View style={styles.leftActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>❤️</Text>
                <Text style={styles.actionText}>5</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionText}>2</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.postCard}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=250&fit=crop'
            }}
            style={styles.postImage}
          />

          <View style={styles.postActions}>
            <View style={styles.leftActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>❤️</Text>
                <Text style={styles.actionText}>12</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionText}>3</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.postCard}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=250&fit=crop'
            }}
            style={styles.postImage}
          />

          <View style={styles.postActions}>
            <View style={styles.leftActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>❤️</Text>
                <Text style={styles.actionText}>8</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionText}>1</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.postCard}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=250&fit=crop' }}
            style={styles.postImage}
          />

          <View style={styles.postActions}>
            <View style={styles.leftActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>❤️</Text>
                <Text style={styles.actionText}>15</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionText}>4</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.postCard}>
          <Image
            source={
              {uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=250&fit=crop'
            }}
            style={styles.postImage}
          />

          <View style={styles.postActions}>
            <View style={styles.leftActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>❤️</Text>
                <Text style={styles.actionText}>22</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionText}>7</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </Animated.ScrollView>


      {/* BARRA DE NAVEGACIÓN */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <AntDesign name="home" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="people" size={24} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <FontAwesome6 name="circle-plus" size={19} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="search" size={22} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <FontAwesome name="user-plus" size={18} color="#919191ff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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

  /*PERFIL DE USUARIO*/
  headerGradient: {
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    height: '100%',
    justifyContent: 'flex-start',
    position: 'relative',
    overflow: 'hidden',
    paddingTop: 40,
  },
  gradientLayer1: {
    position: 'absolute',
    backgroundColor: '#1E90FF',
    opacity: 0.8,
  },
  gradientLayer2: {
    position: 'absolute',
    top: '30%',
    backgroundColor: '#4169E1',
    opacity: 0.6,
  },
  gradientLayer3: {
    position: 'absolute',
    top: '60%',
    backgroundColor: '#0066CC',
    opacity: 0.4,
  },

  /* ENCABEZADO FIJADO*/
  profileImageContainer: {
    marginBottom: 10,
    zIndex: 10,
  },
  profileImage: {
    borderWidth: 3,
    borderColor: 'white',
  },
  name: {
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
    zIndex: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 480,
    paddingBottom: 10,
  },
  /* PUBLICACIONES*/
  postCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  postImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  leftActions: {
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  bottomSpace: {
    height: 50,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },


  /* BOTONES DE ACCION PERFIL */
  profileActions: {
    width: '100%',
    gap: 12,
    zIndex: 10,
  },
  profileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 12,
    gap: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileActionText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  starsText: {
    fontSize: 14,
  },
  /* Estadísticas de seguidores */
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statNumber: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 30,
    marginBottom: 25,
    zIndex: 10,
  },
});

export default LinkedInProfile;