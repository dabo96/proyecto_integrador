
import { db } from '@/services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type NotiPublicacion = {
  id: string;
  name: string;
  avatar?: string;
  publicacionID: string;
  usuarioID: string;
  imagenUrl?: string;
  timestamp: number;
};

const relTime = (ms: number) => {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'Hace un momento';
  if (s < 3600) return `Hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
  if (s < 2592000) return `Hace ${Math.floor(s / 86400)} días`;
  return new Date(ms).toLocaleDateString();
};

export default function Notificaciones() {
  const router = useRouter();
  const [lista, setLista] = useState<NotiPublicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [currentUserID, setCurrentUserID] = useState<string>('');

  const obtenerPublicaciones = async (): Promise<NotiPublicacion[]> => {
    const publicacionesRef = collection(db, 'publicaciones');
    const q = query(publicacionesRef, where('estado', '==', 'activo'));
    const snap = await getDocs(q);

    const res: NotiPublicacion[] = [];
    for (const d of snap.docs) {
      const data = d.data() as any;

      const uRef = doc(db, 'Usuarios', data.usuarioID);
      const uDoc = await getDoc(uRef);
      if (!uDoc.exists()) continue;
      const u = uDoc.data() as any;

      const nombre = `${u.nombre || ''} ${u.apellidos || ''}`.trim() || 'Usuario';
      const ts = data.fechaCreacion?.toDate
        ? data.fechaCreacion.toDate().getTime()
        : new Date(data.fechaCreacion || Date.now()).getTime();

      res.push({
        id: d.id,
        name: nombre,
        avatar: u.fotoPerfil,
        publicacionID: d.id,
        usuarioID: data.usuarioID,
        imagenUrl: data.imagenUrl,
        timestamp: ts,
      });
    }
    res.sort((a, b) => b.timestamp - a.timestamp);
    return res;
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const userID = await AsyncStorage.getItem('usuarioID');
      if (userID) setCurrentUserID(userID);
      setLista(await obtenerPublicaciones());
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const Item = ({ n }: { n: NotiPublicacion }) => (
    <TouchableOpacity 
      style={styles.rowItem}
      onPress={() => {
        // Si es el mismo usuario, ir a profile.tsx, sino a otherProfile.tsx
        if (currentUserID === n.usuarioID) {
          router.push('./profile');
        } else {
          router.push({
            pathname: './otherProfile',
            params: { userId: n.usuarioID }
          });
        }
      }}
    >
      {n.avatar ? (
        <Image source={{ uri: n.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: '#ccc' }]} />
      )}

      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{n.name}</Text>
        <Text style={styles.rowTime}>hizo una publicación • {relTime(n.timestamp)}</Text>
      </View>

      {n.imagenUrl ? <Image source={{ uri: n.imagenUrl }} style={styles.thumbnail} /> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1e3c72" barStyle="light-content" />
      {/* Franja superior con gradiente */}
      <LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.header} />

      {/* Título centrado como en tu formato */}
      <Text style={styles.mainTitle}>Notificaciones</Text>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.section}>
          <Text style={styles.Subtitulos}>Todas las Notificaciones</Text>

          {cargando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2F4AA6" />
              <Text style={styles.loadingText}>Cargando notificaciones...</Text>
            </View>
          ) : lista.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay publicaciones</Text>
              <Text style={styles.emptySubtext}>Aún no hay actividad reciente</Text>
            </View>
          ) : (
            lista.map(n => <Item key={n.id} n={n} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // === Formato pedido ===
  header: { paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center' },
  mainTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#111',
    backgroundColor: 'white',
    paddingVertical: 12,
    textAlign: 'center', // centrado como la captura
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

  // Ítems de publicación
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    justifyContent: 'space-between',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 },
  rowTime: { fontSize: 13, color: '#666' },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },

  // Estados
  loadingContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 8, fontSize: 16, color: '#666' },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyText: { fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 8, fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center' },
});
