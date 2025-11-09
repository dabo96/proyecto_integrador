import { aceptarSolicitud, Contacto, obtenerContactos, rechazarSolicitud, SolicitudContacto } from '@/api/contactsService';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Contacts = () => {
  const router = useRouter();
  const [contactRequests, setContactRequests] = useState<SolicitudContacto[]>([]);
  const [contacts, setContacts] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuarioID, setUsuarioID] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

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
      console.error('Error cargando contactos:', error);
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
      console.error('Error aceptando solicitud:', error);
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
      console.error('Error rechazando solicitud:', error);
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
  }) => (
    <View style={styles.contactItem}>
      {contact.avatar ? (
        <Image source={{ uri: contact.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>
            {contact.nombre.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.nombre}</Text>
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
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
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
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 },
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
