import { AntDesign, FontAwesome, FontAwesome6, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Image, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

const Contacts = () => {
  const [contactRequests, setContactRequests] = useState([
    {
      id: 1,
      name: 'Enrique Lopez Cuevas',
      description: 'Estudiante de Ingeniería Civil',
      time: 'Hoy',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    },
    {
      id: 2,
      name: 'María González Pérez',
      description: 'Estudiante de Medicina',
      time: 'Ayer',
      avatar: 'https://randomuser.me/api/portraits/women/5.jpg',
    },
    {
      id: 3,
      name: 'Carlos Mendoza Silva',
      description: 'Estudiante de Arquitectura',
      time: '2 días',
      avatar: 'https://randomuser.me/api/portraits/men/8.jpg',
    },
    {
      id: 4,
      name: 'Ana Rodríguez Torres',
      description: 'Estudiante de Psicología',
      time: '3 días',
      avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
    },
    {
      id: 5,
      name: 'Sofia Ramirez Wong',
      description: 'Estudiante de Psicología',
      time: '5 horas',
      avatar: 'https://randomuser.me/api/portraits/women/14.jpg',
    },
    {
      id: 6,
      name: 'Cludia Vega Ramirez',
      description: 'Estudiante de Psicología',
      time: '2 días',
      avatar: 'https://randomuser.me/api/portraits/women/15.jpg',
    },
  ]);

  const contacts = [
    {
      id: 1,
      name: 'Sofía Martínez López',
      description: 'Estudiante de Ingeniería de Sistemas',
      time: '2 días',
      avatar: 'https://randomuser.me/api/portraits/women/15.jpg',
    },
    {
      id: 2,
      name: 'Diego Fernández Ruiz',
      description: 'Estudiante de Administración',
      time: 'Hace 1 semana',
      avatar: 'https://randomuser.me/api/portraits/men/20.jpg',
    },
    {
      id: 3,
      name: 'Valeria Castro Moreno',
      description: 'Estudiante de Diseño Gráfico',
      time: '3 días',
      avatar: 'https://randomuser.me/api/portraits/women/25.jpg',
    },
    {
      id: 4,
      name: 'Alejandro Herrera Jiménez',
      description: 'Estudiante de Comunicaciones',
      time: '5 días',
      avatar: 'https://randomuser.me/api/portraits/men/30.jpg',
    },
    {
      id: 5,
      name: 'Isabella Ramos Delgado',
      description: 'Estudiante de Derecho',
      time: 'Hace 2 semanas',
      avatar: 'https://randomuser.me/api/portraits/women/35.jpg',
    },
    {
      id: 6,
      name: 'Mateo Sánchez Vargas',
      description: 'Estudiante de Ingeniería Mecánica',
      time: '1 semana',
      avatar: 'https://randomuser.me/api/portraits/men/40.jpg',
    },
    {
      id: 7,
      name: 'Lucas Gómez Navarro',
      description: 'Estudiante de Ingeniería Eléctrica',
      time: 'ahora',
      avatar: 'https://randomuser.me/api/portraits/men/50.jpg',
    },
    {
      id: 8,
      name: 'Diego Fernández Ruiz',
      description: 'Estudiante de Administración',
      time: '2 días',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
    {
      id: 9,
      name: 'Mateo Sánchez Vargas',
      description: 'Estudiante de física',
      time: '3 horas',
      avatar: 'https://randomuser.me/api/portraits/men/44.jpg',
    },
  ];

  const handleAcceptRequest = (id: number) => {
    setContactRequests(prev => prev.filter(request => request.id !== id));
  };

  const handleRejectRequest = (id: number) => {
    setContactRequests(prev => prev.filter(request => request.id !== id));
  };

  const ContactItem = ({ contact, showButtons = false }: { contact: { id: number; name: string; description: string; time: string; avatar: string }; showButtons?: boolean }) => (
    <View style={styles.contactItem}>
      <Image source={{ uri: contact.avatar }} style={styles.avatar} />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactDescription}>{contact.description}</Text>
        <Text style={styles.contactTime}>{contact.time}</Text>
      </View>
      {showButtons ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleAcceptRequest(contact.id)}
          >
            <Text style={styles.buttonText}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => handleRejectRequest(contact.id)}
          >
            <Text style={styles.buttonText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.viewMoreButtonContainer}>
          <LinearGradient
            colors={['#4762bbff', '#0491C6']}
            style={styles.viewMoreButton}
          >
            <Text style={styles.viewMoreText}>Ver más</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1e3c72" barStyle="light-content" />

      {/* Header*/}
      <LinearGradient
        colors={['#2F4AA6', '#0491C6']}
        style={styles.header}
      >
      </LinearGradient>

      <ScrollView style={styles.scrollContainer}>


        {/* CONTACTOS */}
        <Text style={styles.Subtitulos}>Contactos</Text>
        <View style={styles.section}>
          {contacts.map((contact, index) => (
            <ContactItem
              key={`contact-${contact.id}-${index}`}
              contact={contact}
              showButtons={false}
            />
          ))}
        </View>

        {/* SOLICITUDESS */}
        <View style={styles.section}>
          <Text style={styles.Subtitulos}>Solicitudes</Text>
          {contactRequests.map((request, index) => (
            <ContactItem
              key={`request-${request.id}-${index}`}
              contact={request}
              showButtons={true}
            />
          ))}
        </View>
      </ScrollView>

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
  con:{
    backgroundColor: '#a3a3a3ff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  Subtitulos: {
    paddingTop: 10,
    paddingLeft: 15,
    fontSize: 38,
    fontWeight: 'bold',
    color: 'black',
    backgroundColor: 'white',
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 10,
    paddingVertical: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 1,
  },
  contactLocation: {
    fontSize: 13,
    color: '#666',
    marginBottom: 1,
  },
  contactTime: {
    fontSize: 12,
    color: '#999',
  },
  viewMoreButtonContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  viewMoreButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMoreText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#F44336',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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
  navIcon: {
    fontSize: 20,
  },
});

export default Contacts;