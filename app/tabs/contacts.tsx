import { Contacto, obtenerContactos } from '@/api/contactsService';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const Contacts = () => {
  const [contactRequests, setContactRequests] = useState<Contacto[]>([]);
  const [contacts, setContacts] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      const data = await obtenerContactos();
      setContacts(data.contactos);
      setContactRequests(data.solicitudes);
      setLoading(false);
    };
    cargarDatos();
  }, []);

  const handleAcceptRequest = (id: string) => {
    setContactRequests(prev => prev.filter(request => request.id !== id));
  };

  const handleRejectRequest = (id: string) => {
    setContactRequests(prev => prev.filter(request => request.id !== id));
  };

  const ContactItem = ({ contact, showButtons = false }: { contact: Contacto; showButtons?: boolean }) => (
    <View style={styles.contactItem}>
      <Image source={{ uri: contact.avatar }} style={styles.avatar} />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.nombre}</Text>
        <Text style={styles.contactDescription}>{contact.descripcion}</Text>
        <Text style={styles.contactTime}>{contact.tiempo}</Text>
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
            <Text style={styles.viewMoreText}>Ver más</Text>
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

      <ScrollView style={styles.scrollContainer}>
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
