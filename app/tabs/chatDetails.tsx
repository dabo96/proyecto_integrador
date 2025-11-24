import { getOrCreateChat, listenMessages, markMessagesAsRead, sendMessage } from "@/api/messageService";
import { obtenerUsuarioActual, obtenerUsuarioPorId, Usuario } from "@/api/usuariosService";
import { db } from "@/services/firebase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, } from "react-native";

type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  seen: boolean;
};

// Colores para diferenciar participantes en chats grupales
const PARTICIPANT_COLORS = [
  "#7C3AED", // Morado
  "#EC4899", // Rosa
  "#F59E0B", // Naranja
  "#10B981", // Verde
  "#3B82F6", // Azul
  "#EF4444", // Rojo
  "#8B5CF6", // Morado claro
  "#F97316", // Naranja oscuro
  "#06B6D4", // Cian
  "#84CC16", // Verde lima
];

// Función para obtener un color consistente basado en el ID del usuario
// Usa un hash más robusto para asegurar colores diferentes
const getParticipantColor = (userId: string): string => {
  if (!userId) return PARTICIPANT_COLORS[0];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a entero de 32 bits
  }
  
  // Asegurar que el hash sea positivo
  const positiveHash = Math.abs(hash);
  const index = positiveHash % PARTICIPANT_COLORS.length;
  
  return PARTICIPANT_COLORS[index];
};

const ChatDetails = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userId, chatId: paramChatId, isGroup: paramIsGroup } = params; // receptor o chatId para grupos

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [participantes, setParticipantes] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [participantColorMap, setParticipantColorMap] = useState<{ [userId: string]: string }>({});

  useEffect(() => {
    if (chatId && currentUser?.id) {
      markMessagesAsRead(chatId, currentUser.id);
    }
  }, [chatId, currentUser]);

  useEffect(() => {
    let mounted = true;
    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        setError(null); // Limpiar errores previos
        const u = await obtenerUsuarioActual();
        if (mounted) {
          if (!u) {
            setError("No hay usuario autenticado");
          } else {
            setCurrentUser(u);
            setError(null); // Limpiar error si se obtuvo el usuario
          }
        }
      } catch (err) {
        console.error("Error obteniendo usuario actual:", err);
        if (mounted) setError("No hay usuario autenticado");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCurrentUser();
    return () => {
      mounted = false;
    };
  }, []);

  // 🔹 Cargar receptor y crear/obtener chat
  useEffect(() => {
    const cargarChat = async () => {
      // No cargar si aún no tenemos el usuario actual o si hay un error de autenticación
      if (!currentUser) {
        return; // Esperar a que se cargue el usuario
      }

      try {
        setLoading(true);
        setError(null); // Limpiar errores previos
        
        // Verificar si es un chat grupal
        const esGrupal = paramIsGroup === 'true' || paramChatId;
        
        if (esGrupal && paramChatId) {
          // Chat grupal: usar el chatId proporcionado
          setIsGroup(true);
          const finalChatId = String(paramChatId);
          setChatId(finalChatId);
          
          // Obtener información del chat grupal
          const chatDoc = await getDoc(doc(db, "Chats", finalChatId));
          if (chatDoc.exists()) {
            const chatData = chatDoc.data();
            setGroupName(chatData.groupName || "Chat grupal");
            
            // Cargar información de todos los participantes
            const participantIds = chatData.participants || [];
            
            // Filtrar IDs únicos para evitar duplicados
            const uniqueParticipantIds = [...new Set(participantIds)];
            
            const participantesData = await Promise.all(
              uniqueParticipantIds.map((id: string) => obtenerUsuarioPorId(id))
            );
            const participantesFiltrados = participantesData.filter(u => u !== null) as Usuario[];
            
            // Asegurar que el usuario actual esté en la lista si no está
            const currentUserInList = participantesFiltrados.some(p => p.id === currentUser.id);
            if (!currentUserInList && currentUser) {
              participantesFiltrados.push(currentUser as Usuario);
            }
            
            setParticipantes(participantesFiltrados);
            
            // Crear mapa de colores único para cada participante
            const colorMap: { [userId: string]: string } = {};
            participantesFiltrados.forEach((participant, index) => {
              // Asignar colores de manera secuencial para evitar duplicados
              colorMap[participant.id] = PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
            });
            setParticipantColorMap(colorMap);
            
            // Verificar que el usuario actual esté en los participantes
            const currentUserInParticipants = uniqueParticipantIds.includes(currentUser.id);
            if (!currentUserInParticipants) {
              setError("No eres participante de este chat");
              setLoading(false);
              return;
            }
          } else {
            setError("El chat no existe");
            setLoading(false);
            return;
          }
        } else if (userId && typeof userId === "string") {
          // Chat individual
          setIsGroup(false);
          console.log("Cargando chat con usuario ID:", userId, "desde usuario ID:", currentUser.id);
          const usuarioData = await obtenerUsuarioPorId(userId);
          setUsuario(usuarioData);

          // Crear o reutilizar chat
          const chat = await getOrCreateChat(currentUser.id, userId);
          setChatId(chat);
          console.log("Chat ID:", chat);
        } else {
          setError("ID de usuario o chat no válido");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error al cargar chat:", err);
        setError("No se pudo cargar el chat");
      } finally {
        setLoading(false);
      }
    };

    cargarChat();
  }, [userId, currentUser, paramChatId, paramIsGroup]);

  // 🔹 Escuchar mensajes cuando tenemos el chatId
  useEffect(() => {
    if (!chatId) return;

    console.log("Estableciendo suscripción a mensajes para chat ID:", chatId);
    const unsubscribe = listenMessages(chatId, (msgs: Message[]) => {
      setMessages(msgs);
      
      // Si es un chat grupal, asegurar que todos los remitentes tengan color asignado
      if (isGroup) {
        setParticipantColorMap(prevMap => {
          const senderIds = [...new Set(msgs.map(m => m.senderId))];
          const newColorMap = { ...prevMap };
          let colorIndex = Object.keys(prevMap).length;
          let hasChanges = false;
          
          senderIds.forEach(senderId => {
            if (!newColorMap[senderId] && senderId) {
              // Asignar color secuencialmente
              newColorMap[senderId] = PARTICIPANT_COLORS[colorIndex % PARTICIPANT_COLORS.length];
              colorIndex++;
              hasChanges = true;
            }
          });
          
          return hasChanges ? newColorMap : prevMap;
        });
      }
    });
    
    return () => unsubscribe();
  }, [chatId, isGroup]);

  // 🔹 Enviar mensaje
  const handleSendMessage = async () => {
    if (!chatId || !currentUser || newMessage.trim() === "") return;

    try {
      if (isGroup) {
        // Para chats grupales, no necesitamos un receiverId específico
        await sendMessage(chatId, currentUser.id, null, newMessage);
      } else {
        if (!userId) return console.warn("No se encontró el ID del receptor.");
        await sendMessage(chatId, currentUser.id, String(userId), newMessage);
      }
      setNewMessage("");
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    }
  };

  // 🔹 Render burbujas de mensaje
  const MessageBubble = ({ message }: { message: Message }) => {
    const isMe = message.senderId === currentUser?.id;
    
    // Para chats grupales, obtener el nombre del remitente y su color
    // Buscar en participantes o usar el usuario actual si es el remitente
    let sender: Usuario | null = null;
    if (isGroup) {
      if (isMe && currentUser) {
        sender = currentUser as Usuario;
      } else {
        sender = participantes.find(p => p.id === message.senderId) || null;
      }
    } else if (!isMe) {
      sender = usuario;
    }
    
    const senderName = sender?.nombre || sender?.nombreCompleto || "Usuario";
    const senderPhoto = sender?.fotoPerfil;
    
    // Obtener color del participante (usar mapa si está disponible, sino usar función hash)
    let senderColor = "#0491C6"; // Color por defecto
    if (isGroup && message.senderId) {
      // Priorizar el mapa de colores asignado
      if (participantColorMap[message.senderId]) {
        senderColor = participantColorMap[message.senderId];
      } else {
        // Fallback a función hash si no está en el mapa
        senderColor = getParticipantColor(message.senderId);
      }
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessage : styles.theirMessage,
        ]}
      >
        {isGroup && (
          <View style={[styles.messageAvatarContainer, { backgroundColor: senderColor }]}>
            {senderPhoto ? (
              <Image 
                source={{ uri: senderPhoto }} 
                style={styles.messageAvatarImage}
              />
            ) : (
              <Text style={styles.messageAvatarText}>
                {senderName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        )}
        {!isGroup && !isMe && (
          <View style={[styles.messageAvatarContainer, { backgroundColor: senderColor }]}>
            {usuario?.fotoPerfil ? (
              <Image 
                source={{ uri: usuario.fotoPerfil }} 
                style={styles.messageAvatarImage}
              />
            ) : (
              <Text style={styles.messageAvatarText}>
                {String(usuario?.nombre || "U").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        )}

        <View style={[
          styles.bubble, 
          isMe ? styles.myBubble : styles.theirBubble,
          isGroup && !isMe && { 
            backgroundColor: senderColor + "15", // Color con transparencia para fondo
            borderLeftWidth: 3,
            borderLeftColor: senderColor,
          },
          isGroup && isMe && {
            backgroundColor: senderColor + "25", // Color más visible para mensajes propios
            borderRightWidth: 3,
            borderRightColor: senderColor,
          }
        ]}>
          {isGroup && senderName && (
            <Text style={[styles.senderName, { color: senderColor, fontWeight: "600" }]}>
              {senderName}
            </Text>
          )}
          <Text
            style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}
          >
            {message.text}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText]}>
            {message.timestamp
              ? new Date(message.timestamp.seconds * 1000).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
              : ""}
          </Text>
        </View>
      </View>
    );
  };

  // 🔹 Pantalla de carga
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#2F4AA6", "#0491C6"]} style={styles.topBar} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0491C6" />
          <Text style={styles.loadingText}>Cargando chat...</Text>
        </View>
      </View>
    );
  }

  // 🔹 Pantalla de error
  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#2F4AA6", "#0491C6"]} style={styles.topBar} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#F44336" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 🔹 Pantalla principal
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1e3c72" barStyle="light-content" />

      {/* Barra superior */}
      <LinearGradient colors={["#2F4AA6", "#0491C6"]} style={styles.topBar} />

      {/* Header usuario */}
      <View style={styles.headerWhite}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        {isGroup ? (
          <View style={styles.headerUserInfo}>
            <View style={[styles.headerAvatarContainer, styles.headerAvatarGroup]}>
              <Text style={styles.headerAvatarText}>👥</Text>
            </View>
            <View>
              <Text style={styles.headerNameBlack}>{groupName || "Chat grupal"}</Text>
              <Text style={styles.headerStatusBlack}>
                {participantes.length} {participantes.length === 1 ? "participante" : "participantes"}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.headerUserInfo}
            onPress={() => {
              console.log('Click en perfil - usuario:', usuario);
              console.log('userId del parámetro:', userId);
              console.log('usuario.id:', usuario?.id);
              
              // Usar el userId del parámetro directamente, que es más confiable
              if (userId) {
                router.push({
                  pathname: './otherProfile',
                  params: { userId: String(userId) }
                });
              } else if (usuario?.id) {
                router.push({
                  pathname: './otherProfile',
                  params: { userId: usuario.id }
                });
              } else {
                console.error('No se encontró userId para navegar al perfil');
              }
            }}
          >
            <View style={styles.headerAvatarContainer}>
              <Text style={styles.headerAvatarText}>
                {String(usuario?.nombre || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.headerNameBlack}>{usuario?.nombre || "Usuario"}</Text>
              <Text style={styles.headerStatusBlack}>
                {usuario?.carrera && usuario?.codigo
                  ? `${usuario.carrera} - ${usuario.codigo}`
                  : "En línea"}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Mensajes */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <ScrollView style={styles.messagesContainer}>
          {messages.length === 0 ? (
            <View style={styles.emptyChatContainer}>
              <Text style={styles.emptyChatTitle}>¡Inicia una conversación!</Text>
              <Text style={styles.emptyChatSubtitle}>
                {isGroup 
                  ? `Escribe un mensaje para comenzar a chatear en ${groupName || "este grupo"}`
                  : `Escribe un mensaje para comenzar a chatear con ${usuario?.nombre || "este usuario"}`}
              </Text>
            </View>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
        </ScrollView>

        {/* Input */}
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

          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatDetails;

// ⬇️ estilos (idénticos a los tuyos)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  topBar: { height: 60 },
  headerWhite: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
  },
  backButton: { padding: 5 },
  headerUserInfo: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1, 
    marginLeft: 15,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  headerAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0491C6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerAvatarText: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  headerAvatarGroup: { backgroundColor: "#7C3AED" },
  headerNameBlack: { fontSize: 18, fontWeight: "600", color: "#333" },
  headerStatusBlack: { fontSize: 12, color: "#666" },
  senderName: { fontSize: 12, fontWeight: "600", color: "#666", marginBottom: 4 },
  menuButton: { padding: 5 },
  keyboardAvoid: { flex: 1 },
  messagesContainer: { flex: 1, paddingHorizontal: 15, paddingVertical: 10 },
  messageContainer: { flexDirection: "row", alignItems: "flex-end", marginVertical: 5 },
  myMessage: { justifyContent: "flex-end", alignSelf: "flex-end" },
  theirMessage: { justifyContent: "flex-start", alignSelf: "flex-start" },
  messageAvatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0491C6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    overflow: "hidden",
  },
  messageAvatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  messageAvatarText: { fontSize: 12, fontWeight: "bold", color: "#fff" },
  bubble: { maxWidth: "70%", padding: 12, borderRadius: 18, marginHorizontal: 5 },
  myBubble: { backgroundColor: "#949494ff", borderBottomRightRadius: 5 },
  theirBubble: {
    backgroundColor: "white",
    borderBottomLeftRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: "white" },
  theirMessageText: { color: "#333" },
  timeText: { fontSize: 11, marginTop: 5, textAlign: "right" },
  myTimeText: { color: "#E0E0E0" },
  theirTimeText: { color: "#999" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  attachButton: { padding: 5, marginRight: 10 },
  textInput: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 15,
    color: "#333",
  },
  sendButton: {
    backgroundColor: "#0491C6",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyChatTitle: { fontSize: 20, fontWeight: "600", color: "#333", marginBottom: 8 },
  emptyChatSubtitle: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorTitle: { fontSize: 24, fontWeight: "bold", color: "#333", marginTop: 16 },
  errorText: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 24 },
  retryButton: { backgroundColor: "#0491C6", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
});
