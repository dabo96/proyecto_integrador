import { AntDesign, FontAwesome, FontAwesome6, MaterialIcons, Ionicons } from '@expo/vector-icons';
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

type Message = {
  id: number;
  text: string;
  time: string;
  isMe: boolean;
  avatar?: any;
};

const ChatDetails = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { name, avatar } = params; 


  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: '¡Andrea! 😫 ¡Acabo de ver el horario! Es una broma de mal gusto. Programación Avanzada y Cálculo a la misma hora. 🤯 El universo me odia. 😭',
      time: '10:30',
      isMe: false,
      avatar: avatar ? { uri: avatar } : require('../assets/images/perfil_1.jpg'),
    },
    {
      id: 2,
      text: '  ¡Qué horror, Ric! 🫠 Yo quiero Bases de Datos pero choca con Ética. Es como si la universidad te forzara a ser un programador sin moral. 😂',
      time: '10:31',
      isMe: true,
    },
    {
      id: 3,
      text: '¡Total! ¡Y solo quedan secciones a las 7 a.m.! ☀️ Tendré que elegir entre mi cama 😴 y mi futuro como desarrollador. Esto es muy tóxico. 💔',
      time: '10:32',
      isMe: false,
      avatar: avatar ? { uri: avatar } : require('../assets/images/perfil_1.jpg'),
    },
    {
      id: 4,
      text: '💪 Anótate en la de las 7 a.m.,',
      time: '10:33',
      isMe: true,
    },
  ]);

  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
    if (newMessage.trim() === '') return;

    const newMsg: Message = {
      id: messages.length + 1,
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setMessages([...messages, newMsg]);
    setNewMessage('');
  };

  const MessageBubble = ({ message }: { message: Message }) => {
    return (
      <View style={[
        styles.messageContainer,
        message.isMe ? styles.myMessage : styles.theirMessage
      ]}>
        
        {!message.isMe && (
          <Image source={message.avatar} style={styles.messageAvatar} />
        )}
        
        <View style={[
          styles.bubble,
          message.isMe ? styles.myBubble : styles.theirBubble
        ]}>
          <Text style={[
            styles.messageText,
            message.isMe ? styles.myMessageText : styles.theirMessageText
          ]}>
            {message.text}
          </Text>
          <Text style={[
            styles.timeText,
            message.isMe ? styles.myTimeText : styles.theirTimeText
          ]}>
            {message.time}
          </Text>
        </View>

        {message.isMe && (
          <View style={styles.myMessageIndicator} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1e3c72" barStyle="light-content" />

{/* Franja azul superior */}
<LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.topBar} />

{/* Franja blanca con info */}
<View style={styles.headerWhite}>
  <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
    <Ionicons name="arrow-back" size={24} color="#333" />
  </TouchableOpacity>

  <View style={styles.headerUserInfo}>
    <Image 
      source={avatar ? { uri: avatar } : require('../assets/images/perfil_1.jpg')} 
      style={styles.headerAvatar} 
    />
    <View>
      <Text style={styles.headerNameBlack}>{name || 'Ricardo Marin'}</Text>
      <Text style={styles.headerStatusBlack}>En línea</Text>
    </View>
  </View>

  <TouchableOpacity style={styles.menuButton}>
    <Ionicons name="ellipsis-vertical" size={20} color="#333" />
  </TouchableOpacity>
</View>


      {/* Mensajes */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView style={styles.messagesContainer}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </ScrollView>

        {/* Input de mensaje */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach" size={24} color="#0491C6" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            value={newMessage}
            onChangeText={setNewMessage}
          />
          
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom nav (igual que en notificaciones) */}
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
          <FontAwesome name="user-plus" size={18} color="#666" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },

  topBar: {
  height: 60, 
},

headerWhite: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: 'white',
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderBottomWidth: 0.5,
  borderBottomColor: '#E0E0E0',
},

headerNameBlack: {
  fontSize: 18,
  fontWeight: '600',
  color: '#333',
},

headerStatusBlack: {
  fontSize: 12,
  color: '#666',
},

  
  backButton: {
    padding: 5,
  },
  
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 15,
  },
  
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  
  headerStatus: {
    fontSize: 12,
    color: '#E0E0E0',
  },
  
  menuButton: {
    padding: 5,
  },
  
  keyboardAvoid: {
    flex: 1,
  },
  
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 5,
  },
  
  myMessage: {
    justifyContent: 'flex-end',
  },
  
  theirMessage: {
    justifyContent: 'flex-start',
  },
  
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  
  bubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 18,
    marginHorizontal: 5,
  },
  
  myBubble: {
    backgroundColor: '#949494ff',
    borderBottomRightRadius: 5,
  },
  
  theirBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  
  myMessageText: {
    color: 'white',
  },
  
  theirMessageText: {
    color: '#333',
  },
  
  timeText: {
    fontSize: 11,
    marginTop: 5,
    textAlign: 'right',
  },
  
  myTimeText: {
    color: '#E0E0E0',
  },
  
  theirTimeText: {
    color: '#999',
  },
  
  myMessageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6c6c6cff',
    marginLeft: 5,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  
  attachButton: {
    padding: 5,
    marginRight: 10,
  },
  
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 15,
    color: '#333',
  },
  
  sendButton: {
    backgroundColor: '#0491C6',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
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
});

export default ChatDetails;