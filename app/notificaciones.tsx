import { AntDesign, FontAwesome, FontAwesome6, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import IconButton from '@/components/button/IconButton'; 
import type { ImageSourcePropType } from 'react-native';


type Noti = {
  id: number;
  name: string;
  text: string;
  time: string;
  avatar: ImageSourcePropType;
  thumb?: ImageSourcePropType;
};

const Notificaciones = () => {
  const router = useRouter();

  const [recent] = useState<Noti[]>([
    {
      id: 1,
      name: 'Henry Cavill',
      text: 'Comenzó a seguirte',
      time: '1 d',
      avatar: require('../assets/images/perfil_6.jpg'),
    },
    {
      id: 2,
      name: 'Ricardo Marín',
      text: 'Le gustó tu publicación',
      time: '1 d',
      avatar: require('../assets/images/perfil_1.jpg'),
      thumb: require('../assets/images/publicacion_1.jpg'),
    },

    {
      id: 3,
      name: 'Fernando Vargas',
      text: 'Le gustó tu publicación',
      time: '1 d',
      avatar: require('../assets/images/perfil_7.jpg'),
      thumb: require('../assets/images/publicacion_1.jpg'),
    },

    {
      id: 4,
      name: 'Diego Castillo',
      text: 'Le gustó tu publicación',
      time: '1 d',
      avatar: require('../assets/images/perfil_8.jpg'),
      thumb: require('../assets/images/publicacion_3.jpg'),
    },

    {
      id: 5,
      name: 'Sofía Herrera',
      text: 'Le gustó tu publicación',
      time: '1 d',
      avatar: require('../assets/images/perfil_10.jpg'),
      thumb: require('../assets/images/publicacion_1.jpg'),
    },

    {
      id: 6,
      name: 'Andrés Pineda',
      text: 'Le gustó tu publicación',
      time: '1 d',
      avatar: require('../assets/images/perfil_9.jpg'),
      thumb: require('../assets/images/publicacion_2.jpg'),
    },

    {
      id: 7,
      name: 'Alejandra Fuentes',
      text: 'Le gustó tu publicación',
      time: '1 d',
      avatar: require('../assets/images/perfil_12.jpg'),
      thumb: require('../assets/images/publicacion_3.jpg'),
    },

    {
      id: 8,
      name: 'Miguel Torres',
      text: 'Le gustó tu publicación',
      time: '1 d',
      avatar: require('../assets/images/perfil_15.jpg'),
      thumb: require('../assets/images/publicacion_2.jpg'),
    },

    {
      id: 9,
      name: 'Carla Navarro',
      text: 'Le gustó tu publicación',
      time: '1 d',
      avatar: require('../assets/images/perfil_13.jpg'),
      thumb: require('../assets/images/publicacion_1.jpg'),
    },

    {
      id: 10,
      name: 'Héctor Gómez',
      text: 'Le gustó tu publicación',
      time: '1 d',
      avatar: require('../assets/images/perfil_16.jpg'),
      thumb: require('../assets/images/publicacion_2.jpg'),
    },

    {
      id: 11,
      name: 'Lucía Morales',
      text: 'Le gustó tu publicación',
      time: '1 d',
      avatar: require('../assets/images/perfil_14.jpg'),
      thumb: require('../assets/images/publicacion_3.jpg'),
    },

  ]);

  const previous: Noti[] = [
    {
      id: 3,
      name: 'Javier Reyes',
      text: 'Le gustó tu comentario',
      time: '1 d',
      avatar: require('../assets/images/perfil_3.jpg'),
    },
    {
      id: 4,
      name: 'Valeria Mendoza',
      text: 'Le gustó tu publicación',
      time: '1 d',
      avatar: require('../assets/images/perfil_4.jpg'),
      thumb: require('../assets/images/publicacion_2.jpg'),
    },
    {
      id: 5,
      name: 'Isabel Ramos',
      text: 'Le gustó tu publicación',
      time: '1 d',
      avatar: require('../assets/images/perfil_2.jpg'),
      thumb: require('../assets/images/publicacion_3.jpg'),
    },
  ];

  const NotificationItem = ({ item }: { item: Noti }) => {
    const [following, setFollowing] = useState(false);

    return (
      <View style={styles.rowItem}>
        <Image source={item.avatar} style={styles.avatar} />

        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>{item.name}</Text>
          <Text style={styles.rowSub}>{item.text}</Text>
          <Text style={styles.rowTime}>{item.time}</Text>
        </View>

        {item.thumb ? (
          <Image source={item.thumb} style={styles.thumb} />
        ) : (
          <IconButton
            title={following ? 'Siguiendo' : 'Seguir'}
            onPress={() => setFollowing((p) => !p)}
            textColor="#fff"
            fontWeight="600"
            style={styles.iconBtn}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1e3c72" barStyle="light-content" />

      {/* Franja azul */}
      <LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.header} />
      <Text style={styles.mainTitle}>Notificaciones</Text>

      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.Subtitulos}>Nuevas</Text>
        <View style={styles.section}>
          {recent.map((n) => (
            <NotificationItem key={`new-${n.id}`} item={n} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.Subtitulos}>Anteriores</Text>
          {previous.map((n) => (
            <NotificationItem key={`old-${n.id}`} item={n} />
          ))}
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/')}>
          <AntDesign name="home" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/contacts')}>
          <MaterialIcons name="people" size={24} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => console.log('Ir a crear')}>
          <FontAwesome6 name="circle-plus" size={19} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => console.log('Ir a buscar')}>
          <MaterialIcons name="search" size={22} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/notificaciones')}>
          <FontAwesome name="user-plus" size={18} color="#0491C6" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center' },

  mainTitle: {
  fontSize: 23,
  fontWeight: '700',
  color: '#111',
  backgroundColor: 'white',
  paddingVertical: 12,
  paddingRight: 20,
  textAlign:'right',
},


  Subtitulos: {
    paddingTop: 10,
    paddingLeft: 15,
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    backgroundColor: 'white',
  },
  scrollContainer: { flex: 1 },
  section: { backgroundColor: 'white', marginBottom: 10, paddingVertical: 10 },

  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 },
  rowSub: { fontSize: 13, color: '#666', marginBottom: 1 },
  rowTime: { fontSize: 12, color: '#999' },

  iconBtn: {
    minWidth: 90,
    alignSelf: 'center',
  },

  thumb: { width: 40, height: 40, borderRadius: 8 },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 5 },
});

export default Notificaciones;
