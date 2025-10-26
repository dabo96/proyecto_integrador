import { obtenerUsuarioPorId, Usuario } from '@/api/usuariosService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type Message = {
  id: number;
  text: string;
  time: string;
  isMe: boolean;
};

const ChatDetails = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userId } = params; 
  
  // Estados para el usuario y mensajes
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Cargar datos del usuario desde la base de datos
  useEffect(() => {
    const cargarUsuario = async () => {
      if (!userId || typeof userId !== 'string') {
        setError('ID de usuario no válido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const usuarioData = await obtenerUsuarioPorId(userId);

        if (usuarioData) {
          setUsuario(usuarioData);
        } else {
          setError('Usuario no encontrado');
        }
      } catch (err) {
        console.error('Error al cargar usuario:', err);
        setError('Error al cargar datos del usuario');
      } finally {
        setLoading(false);
      }
    };

    cargarUsuario();
  }, [userId]);

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
          <View style={styles.messageAvatarContainer}>
            <Text style={styles.messageAvatarText}>
              {String(usuario?.nombre || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
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

  // Mostrar pantalla de carga
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#1e3c72" barStyle="light-content" />
        <LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.topBar} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0491C6" />
          <Text style={styles.loadingText}>Cargando datos del usuario...</Text>
        </View>
      </View>
    );
  }

  // Mostrar pantalla de error
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#1e3c72" barStyle="light-content" />
        <LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.topBar} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#F44336" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1e3c72" barStyle="light-content" />

{/* Franja azul superior */}
<LinearGradient colors={['#2F4AA6', '#0491C6']} style={styles.topBar} />

{/* Franja blanca con info */}
<View style={styles.headerWhite}>
  <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
    <Ionicons name="arrow-back" size={24} color="#333" />
  </TouchableOpacity>

  <View style={styles.headerUserInfo}>
    <View style={styles.headerAvatarContainer}>
      <Text style={styles.headerAvatarText}>
        {String(usuario?.nombre || 'U').charAt(0).toUpperCase()}
      </Text>
    </View>
    <View>
      <Text style={styles.headerNameBlack}>{usuario?.nombre || 'Usuario'}</Text>
      <Text style={styles.headerStatusBlack}>
        {usuario?.carrera && usuario?.codigo ? `${usuario.carrera} - ${usuario.codigo}` : 'En línea'}
      </Text>
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
          {messages.length === 0 ? (
            <View style={styles.emptyChatContainer}>
              <Text style={styles.emptyChatTitle}>¡Inicia una conversación!</Text>
              <Text style={styles.emptyChatSubtitle}>
                Escribe un mensaje para comenzar a chatear con {usuario?.nombre || 'este usuario'}
              </Text>
              <Text style={styles.userInfoText}>
                {usuario?.carrera && usuario?.codigo ? `${usuario.carrera} - ${usuario.codigo}` : ''}
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
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
    </View>
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
  
  headerAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0491C6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
  
  messageAvatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0491C6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
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

  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },

  emptyChatTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyChatSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  userInfoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },

  // Estilos para pantalla de carga
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  // Estilos para pantalla de error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#0491C6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatDetails;