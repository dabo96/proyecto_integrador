import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, } from "react-native";
import { obtenerUsuarioActual, obtenerUsuarioPorId, Usuario } from "@/api/usuariosService";
import { getOrCreateChat, listenMessages, markMessagesAsRead, sendMessage, } from "@/api/messageService";

type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  seen: boolean;
};

const ChatDetails = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userId } = params; // receptor

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  useEffect(() => {
    if (chatId && currentUser?.uid) {
      markMessagesAsRead(chatId, currentUser.uid);
    }
  }, [chatId]);

  useEffect(() => {
    let mounted = true;
    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        const u = await obtenerUsuarioActual();
        if (mounted) setCurrentUser(u);
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
      if (!userId || typeof userId !== "string") {
        setError("ID de usuario no válido");
        setLoading(false);
        console.error("ID de usuario no válido:", userId);
        return;
      }

      if (!currentUser) {
        setError("No hay usuario autenticado");
        setLoading(false);
        return;
      }
      console.log("Cargando chat con usuario ID:", userId, "desde usuario ID:", currentUser.id);
      try {
        setLoading(true);
        const usuarioData = await obtenerUsuarioPorId(userId);
        setUsuario(usuarioData);

        // Crear o reutilizar chat
        const chat = await getOrCreateChat(currentUser.id, userId);
        setChatId(chat);

        console.log("Chat ID:", chat);

        // Escuchar mensajes en tiempo real
        const unsubscribe = listenMessages(chat, (msgs: Message[]) => {
          setMessages(msgs);
        });
        console.log("Suscripción a mensajes establecida para chat ID:", messages);
        console.log("Mensajes cargados:", messages.length);
        return () => unsubscribe();
      } catch (err) {
        console.error("Error al cargar chat:", err);
        setError("No se pudo cargar el chat");
      } finally {
        setLoading(false);
      }
    };

    cargarChat();
  }, [userId, currentUser]);

  // 🔹 Enviar mensaje
  const handleSendMessage = async () => {
    if (!chatId || !currentUser || newMessage.trim() === "") return;

    try {
      if (!userId) return console.warn("No se encontró el ID del receptor.");
      await sendMessage(chatId, currentUser.id, String(userId), newMessage);
      setNewMessage("");
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    }
  };

  // 🔹 Render burbujas de mensaje
  const MessageBubble = ({ message }: { message: Message }) => {
    const isMe = message.senderId === currentUser?.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessage : styles.theirMessage,
        ]}
      >
        {!isMe && (
          <View style={styles.messageAvatarContainer}>
            <Text style={styles.messageAvatarText}>
              {String(usuario?.nombre || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
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
  if (!error) {
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

        <View style={styles.headerUserInfo}>
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
        </View>

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
                Escribe un mensaje para comenzar a chatear con {usuario?.nombre || "este usuario"}
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
  headerUserInfo: { flexDirection: "row", alignItems: "center", flex: 1, marginLeft: 15 },
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
  headerNameBlack: { fontSize: 18, fontWeight: "600", color: "#333" },
  headerStatusBlack: { fontSize: 12, color: "#666" },
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
