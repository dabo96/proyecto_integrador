import { obtenerListaSeguidos, seguirUsuario, verificarSiSigue } from '@/api/profileService';
import { db } from '@/services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Notificacion = {
  id: string;
  tipo: 'publicacion' | 'comentario' | 'like' | 'seguidor';
  name: string;
  avatar?: string;
  publicacionID?: string;
  usuarioID: string;
  imagenUrl?: string;
  timestamp: number;
  publicacionTexto?: string;
  yaSeguido?: boolean;
  solicitudPendiente?: boolean;
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
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [currentUserID, setCurrentUserID] = useState<string>('');

  const obtenerNotificaciones = async (userID?: string): Promise<Notificacion[]> => {
    const userId = userID || currentUserID;
    if (!userId) return [];

    const notificaciones: Notificacion[] = [];
    const usuarioCache = new Map<string, any>();

    const getUsuario = async (uid: string) => {
      if (usuarioCache.has(uid)) return usuarioCache.get(uid);
      const uRef = doc(db, 'Usuarios', uid);
      const uDoc = await getDoc(uRef);
      const data = uDoc.exists() ? uDoc.data() : null;
      usuarioCache.set(uid, data);
      return data;
    };

    // === Publicaciones de usuarios seguidos ===
    try {
      const seguidosIDs = await obtenerListaSeguidos(userId);
      if (seguidosIDs.length > 0) {
        const chunkSize = 10;
        for (let i = 0; i < seguidosIDs.length; i += chunkSize) {
          const chunk = seguidosIDs.slice(i, i + chunkSize);
          const publicacionesRef = collection(db, 'publicaciones');
          const qPub = query(publicacionesRef, where('usuarioID', 'in', chunk), where('estado', '==', 'activo'));
          const snapPub = await getDocs(qPub);
          for (const d of snapPub.docs) {
            const data = d.data() as any;
            const u = await getUsuario(data.usuarioID);
            if (!u) continue;
            const nombre = `${u.nombre || ''} ${u.apellido || u.apellidos || ''}`.trim();
            const ts = data.fechaCreacion?.toDate
              ? data.fechaCreacion.toDate().getTime()
              : new Date(data.fechaCreacion || Date.now()).getTime();
            notificaciones.push({
              id: `pub_${d.id}`,
              tipo: 'publicacion',
              name: nombre,
              avatar: u.fotoPerfil,
              publicacionID: d.id,
              usuarioID: data.usuarioID,
              imagenUrl: data.imagenUrl,
              timestamp: ts,
            });
          }
        }
      }
    } catch (e) {
      console.error('Error cargando publicaciones:', e);
    }

    // === Mis publicaciones (para filtrar interacciones) ===
    const misPublicacionesRef = collection(db, 'publicaciones');
    const qMis = query(misPublicacionesRef, where('usuarioID', '==', userId), where('estado', '==', 'activo'));
    const misSnap = await getDocs(qMis);
    const misIds = new Set<string>();
    const mapaMisPublicaciones = new Map<string, any>();
    for (const d of misSnap.docs) {
      misIds.add(d.id);
      mapaMisPublicaciones.set(d.id, d.data());
    }

    // === Comentarios (sin mostrar texto del comentario) ===
    try {
      const comentariosQ = query(collection(db, 'interacciones'), where('tipo', '==', 'comentario'));
      const comSnap = await getDocs(comentariosQ);
      for (const d of comSnap.docs) {
        const data = d.data() as any;
        if (!misIds.has(data.publicacionID)) continue;
        const u = await getUsuario(data.usuarioID);
        if (!u) continue;
        const ts = data.fecha?.toDate
          ? data.fecha.toDate().getTime()
          : new Date(data.fecha || Date.now()).getTime();
        const postData = mapaMisPublicaciones.get(data.publicacionID) || {};
        const nombre = `${u.nombre || ''} ${u.apellido || u.apellidos || ''}`.trim();
        notificaciones.push({
          id: `com_${d.id}`,
          tipo: 'comentario',
          name: nombre,
          avatar: u.fotoPerfil,
          publicacionID: data.publicacionID,
          usuarioID: data.usuarioID,
          imagenUrl: postData.imagenUrl,
          timestamp: ts,
          publicacionTexto: postData.texto,
        });
      }
    } catch (e) {
      console.error('Error cargando comentarios:', e);
    }

    // === Likes ===
    try {
      const likesQ = query(collection(db, 'interacciones'), where('tipo', '==', 'like'));
      const likesSnap = await getDocs(likesQ);
      for (const d of likesSnap.docs) {
        const data = d.data() as any;
        if (!misIds.has(data.publicacionID)) continue;
        const u = await getUsuario(data.usuarioID);
        if (!u) continue;
        const ts = data.fecha?.toDate
          ? data.fecha.toDate().getTime()
          : new Date(data.fecha || Date.now()).getTime();
        const postData = mapaMisPublicaciones.get(data.publicacionID) || {};
        const nombre = `${u.nombre || ''} ${u.apellido || u.apellidos || ''}`.trim();
        notificaciones.push({
          id: `like_${d.id}`,
          tipo: 'like',
          name: nombre,
          avatar: u.fotoPerfil,
          publicacionID: data.publicacionID,
          usuarioID: data.usuarioID,
          imagenUrl: postData.imagenUrl,
          timestamp: ts,
          publicacionTexto: postData.texto,
        });
      }
    } catch (e) {
      console.error('Error cargando likes:', e);
    }

    // === Seguidores ===
    try {
      const todosUsuarios = await getDocs(collection(db, 'Usuarios'));
      for (const usuarioDoc of todosUsuarios.docs) {
        const contactosRef = collection(db, 'Usuarios', usuarioDoc.id, 'contactos');
        const contactosSnapshot = await getDocs(contactosRef);
        for (const contactoDoc of contactosSnapshot.docs) {
          const contactoData = contactoDoc.data();
          if (contactoData.seguidoID === userId) {
            const u = await getUsuario(usuarioDoc.id);
            if (!u) continue;
            const yaLoEstoySiguiendo = await verificarSiSigue(userId, usuarioDoc.id);
            const ts = contactoData.fechaSeguimiento?.toDate
              ? contactoData.fechaSeguimiento.toDate().getTime()
              : new Date(contactoData.fechaSeguimiento || Date.now()).getTime();
            const nombre = `${u.nombre || ''} ${u.apellido || u.apellidos || ''}`.trim();
            notificaciones.push({
              id: `seguidor_${contactoDoc.id}`,
              tipo: 'seguidor',
              name: nombre,
              avatar: u.fotoPerfil,
              usuarioID: usuarioDoc.id,
              timestamp: ts,
              yaSeguido: yaLoEstoySiguiendo,
            });
          }
        }
      }
    } catch (e) {
      console.error('Error cargando seguidores:', e);
    }

    notificaciones.sort((a, b) => b.timestamp - a.timestamp);
    return notificaciones;
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const userID = await AsyncStorage.getItem('usuarioID');
      if (userID) {
        setCurrentUserID(userID);
        const datos = await obtenerNotificaciones(userID);
        setLista(datos);
      } else setLista([]);
    } catch (error) {
      console.error('Error en cargar:', error);
      setLista([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const getNotificationText = (n: Notificacion) => {
    if (n.tipo === 'publicacion') return 'hizo una publicación';
    if (n.tipo === 'comentario') return 'comentó en tu publicación';
    if (n.tipo === 'like') return 'le gustó tu publicación';
    if (n.tipo === 'seguidor') return 'comenzó a seguirte';
    return '';
  };

  const handleSeguir = async (usuarioID: string, notificacionId: string) => {
    if (!currentUserID) return;
    try {
      const resultado = await seguirUsuario(currentUserID, usuarioID);

      if (resultado === 'enviada') {
        Alert.alert('Solicitud enviada', 'Tu solicitud de seguimiento ha sido enviada.');
      } else if (resultado === 'pendiente') {
        Alert.alert('Solicitud pendiente', 'Ya enviaste una solicitud que está pendiente.');
      } else if (resultado === 'ya_sigue') {
        Alert.alert('Éxito', 'Ahora sigues a este usuario.');
      }

      setLista(prev =>
        prev.map(n => {
          if (n.id !== notificacionId) return n;

          if (resultado === 'ya_sigue') {
            return { ...n, yaSeguido: true, solicitudPendiente: false };
          }

          if (resultado === 'enviada' || resultado === 'pendiente') {
            return { ...n, solicitudPendiente: true };
          }

          return n;
        })
      );
    } catch (error) {
      console.error('Error siguiendo usuario:', error);
    }
  };

  const Item = ({ n }: { n: Notificacion }) => (
    <View style={styles.rowItem}>
      <TouchableOpacity
        style={styles.userInfoContainer}
        onPress={() =>
          currentUserID === n.usuarioID
            ? router.push('./profile')
            : router.push({ pathname: './otherProfile', params: { userId: n.usuarioID } })
        }
      >
        <View style={styles.avatarContainer}>
          {n.avatar ? (
            <Image source={{ uri: n.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#ccc' }]} />
          )}
        </View>

        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>{n.name}</Text>
          <Text style={styles.rowTime}>
            {getNotificationText(n)} • {relTime(n.timestamp)}
          </Text>
          {n.publicacionTexto && n.tipo !== 'publicacion' && (
            <Text style={styles.postPreview} numberOfLines={1}>
              En: {n.publicacionTexto}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* ✅ Miniatura restaurada */}
      {n.imagenUrl ? (
        <Image source={{ uri: n.imagenUrl }} style={styles.thumbnail} />
      ) : null}

      {/* ✅ Botón seguir con degradado */}
      {n.tipo === 'seguidor' && (
        n.yaSeguido ? (
          <View style={[styles.followButton, styles.followingButton]}>
            <Text style={[styles.followButtonText, styles.followingButtonText]}>Siguiendo</Text>
          </View>
        ) : n.solicitudPendiente ? (
          <View style={[styles.followButton, styles.pendingButton]}>
            <Text style={[styles.followButtonText, styles.pendingButtonText]}>Solicitud enviada</Text>
          </View>
        ) : (
          <LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.gradientButton}>
            <TouchableOpacity
              style={styles.followButton}
              onPress={() => handleSeguir(n.usuarioID, n.id)}
            >
              <Text style={styles.followButtonText}>Seguir</Text>
            </TouchableOpacity>
          </LinearGradient>
        )
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1e3c72" barStyle="light-content" />
      <LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.header} />
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
  header: { paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center' },
  mainTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#111',
    backgroundColor: 'white',
    paddingVertical: 12,
    textAlign: 'center',
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
    justifyContent: 'space-between',
  },
  userInfoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarContainer: { marginRight: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
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
  gradientButton: {
    borderRadius: 20,
    marginLeft: 10,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  followingButton: {
    backgroundColor: '#d3d3d3',
    marginLeft: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followingButtonText: { color: '#555' },
  pendingButton: {
    backgroundColor: '#e5e7eb',
    marginLeft: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pendingButtonText: {
    color: '#555',
  },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 8, fontSize: 16, color: '#666' },
  emptyContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 18, color: '#666', marginBottom: 8, fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#999' },
  postPreview: { fontSize: 12, color: '#888', marginTop: 2, fontStyle: 'italic' },
});
