import { aceptarSolicitud, Contacto, obtenerContactos, rechazarSolicitud, SolicitudContacto } from '@/api/contactsService';
import { escucharEstadoUsuario } from '@/api/usuariosService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const Contacts = () => {
  const router = useRouter();
  const [contactRequests, setContactRequests] = useState<SolicitudContacto[]>([]);
  const [contacts, setContacts] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuarioID, setUsuarioID] = useState<string | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<{ [userId: string]: boolean }>({});

  useEffect(() => {
    cargarDatos();
  }, []);

  // Escuchar estados de conexión de los contactos
  useEffect(() => {
    if (contacts.length === 0) return;

    const unsubscribes: (() => void)[] = [];
    const userIds: string[] = [];
    
    contacts.forEach(contact => {
      const userId = 'usuarioID' in contact ? contact.usuarioID : undefined;
      if (userId) {
        userIds.push(userId);
        const unsubscribe = escucharEstadoUsuario(userId, (online) => {
          // console.log(`📡 [CONTACTS] Estado actualizado para contacto ${userId}:`, online ? "en línea" : "desactivado");
          setOnlineStatus(prev => {
            // Solo actualizar si el valor realmente cambió
            if (prev[userId] === online) {
              // console.log(`⚠️ [CONTACTS] Estado no cambió para ${userId}, ya era ${online}`);
              return prev;
            }
            const newStatus = {
              ...prev,
              [userId]: online
            };
            // console.log(`✅ [CONTACTS] Estado actualizado para ${userId}:`, newStatus);
            return newStatus;
          });
        });
        unsubscribes.push(unsubscribe);
      }
    });

    // console.log("👂 Configurando listeners de estado para contactos:", userIds);

    return () => {
      // console.log("🧹 Limpiando listeners de estado de contactos");
      unsubscribes.forEach(unsub => unsub());
    };
  }, [contacts]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const storedUsuarioID = await AsyncStorage.getItem('usuarioID');
      if (storedUsuarioID) {
        setUsuarioID(storedUsuarioID);
      }

      const data = await obtenerContactos(storedUsuarioID ?? undefined);
      setContacts(data.contactos);
      setContactRequests(data.solicitudes);
    } catch (error) {
      // console.error('Error cargando contactos:', error);
      Alert.alert('Error', 'No se pudieron cargar tus contactos en este momento.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptRequest = async (id: string) => {
    try {
      const current = usuarioID ?? (await AsyncStorage.getItem('usuarioID'));
      if (!current) {
        Alert.alert('Sesión finalizada', 'Vuelve a iniciar sesión para gestionar tus contactos.');
        return;
      }
      await aceptarSolicitud(current, id);
      await cargarDatos();
    } catch (error) {
      // console.error('Error aceptando solicitud:', error);
      Alert.alert('Error', 'No pudimos aceptar la solicitud. Intenta nuevamente.');
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      const current = usuarioID ?? (await AsyncStorage.getItem('usuarioID'));
      if (!current) {
        Alert.alert('Sesión finalizada', 'Vuelve a iniciar sesión para gestionar tus contactos.');
        return;
      }
      await rechazarSolicitud(current, id);
      await cargarDatos();
    } catch (error) {
      // console.error('Error rechazando solicitud:', error);
      Alert.alert('Error', 'No pudimos rechazar la solicitud. Intenta nuevamente.');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const ContactItem = ({
    contact,
    showButtons = false
  }: {
    contact: Contacto | SolicitudContacto;
    showButtons?: boolean;
  }) => {
    const userId = 'usuarioID' in contact ? contact.usuarioID : undefined;
    const isOnline = userId ? onlineStatus[userId] ?? false : false;
    
    return (
      <View style={styles.contactItem}>
        <View style={styles.avatarWrapper}>
          {contact.avatar ? (
            <Image source={{ uri: contact.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {contact.nombre.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {userId && isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.contactInfo}>
          <View style={styles.contactNameRow}>
            <Text style={styles.contactName}>
              {(() => {
                // Formatear nombre para mostrar solo primer nombre y primer apellido
                const nombreCompleto = contact.nombre || '';
                const partes = nombreCompleto.trim().split(' ').filter(p => p.length > 0);
                const primerNombre = partes[0] || '';
                const primerApellido = partes.length > 1 ? partes[1] : '';
                return primerApellido ? `${primerNombre} ${primerApellido}`.trim() : primerNombre;
              })()}
            </Text>
            {userId && (
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusDot,
                  isOnline ? styles.statusDotOnline : styles.statusDotOffline
                ]} />
                <Text style={[
                  styles.statusText,
                  isOnline ? styles.statusTextOnline : styles.statusTextOffline
                ]}>
                  {isOnline ? "en línea" : "desactivado"}
                </Text>
              </View>
            )}
          </View>
          {contact.descripcion ? (
            <Text style={styles.contactDescription}>{contact.descripcion}</Text>
          ) : null}
          {contact.tiempo ? (
            <Text style={styles.contactTime}>{contact.tiempo}</Text>
          ) : null}
        </View>
      {showButtons ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptRequest(contact.id)}>
            <Text style={styles.buttonText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={() => handleRejectRequest(contact.id)}>
            <Text style={styles.buttonText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.viewMoreButtonContainer}>
          <LinearGradient colors={['#4762bbff', '#0491C6']} style={styles.viewMoreButton}>
            <Text
              style={styles.viewMoreText}
              onPress={() =>
                router.push({
                  pathname: './otherProfile',
                  params: { userId: 'usuarioID' in contact ? contact.usuarioID : contact.solicitanteID },
                })
              }
            >
              Ver perfil
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>Cargando contactos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1e3c72" barStyle="light-content" />

      <LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.header} />

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2F4AA6" />
        }
      >
        <Text style={styles.Subtitulos}>Contactos</Text>
        <View style={styles.section}>
          {contacts.map((contact, index) => (
            <ContactItem key={`contact-${contact.id}-${index}`} contact={contact} />
          ))}
        </View>

        <Text style={styles.Subtitulos}>Solicitudes</Text>
        <View style={styles.section}>
          {contactRequests.map((request, index) => (
            <ContactItem key={`request-${request.id}-${index}`} contact={request} showButtons={true} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingVertical: 16, paddingHorizontal: 10, alignItems: 'center' },
  Subtitulos: { paddingTop: 10, paddingLeft: 15, fontSize: 24, fontWeight: 'bold', color: 'black', backgroundColor: 'white' },
  scrollContainer: { flex: 1 },
  section: { backgroundColor: 'white', marginBottom: 10, paddingVertical: 10 },
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0' },
  avatarWrapper: { position: 'relative', marginRight: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: {
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    backgroundColor: '#22c55e',
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  contactInfo: { flex: 1 },
  contactNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  contactName: { fontSize: 16, fontWeight: '600', color: '#333', marginRight: 8 },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusDotOnline: {
    backgroundColor: '#22c55e',
  },
  statusDotOffline: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusTextOnline: {
    color: '#22c55e',
  },
  statusTextOffline: {
    color: '#ef4444',
  },
  contactDescription: { fontSize: 13, color: '#666', marginBottom: 1 },
  contactTime: { fontSize: 12, color: '#999' },
  buttonContainer: { flexDirection: 'row', gap: 10 },
  acceptButton: { backgroundColor: '#4CAF50', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  rejectButton: { backgroundColor: '#F44336', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  viewMoreButtonContainer: { borderRadius: 20, overflow: 'hidden' },
  viewMoreButton: { paddingHorizontal: 20, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  viewMoreText: { color: 'white', fontSize: 14, fontWeight: '500' },
});

export default Contacts;
