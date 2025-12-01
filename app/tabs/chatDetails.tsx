import { deleteChat, deleteMessage, getOrCreateChat, listenMessages, markMessagesAsRead, sendMessage, updateGroupName, uploadFileToStorage, uploadImageToStorage } from "@/api/messageService";
import { escucharEstadoUsuario, obtenerUsuarioActual, obtenerUsuarioPorId, Usuario } from "@/api/usuariosService";
import { db } from "@/services/firebase";
import { showAlert } from "@/utils/alert";
import { formatShortName } from "@/utils/nameFormatter";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  seen: boolean;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  type?: "text" | "image" | "file" | "mixed";
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
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [showEditGroupNameModal, setShowEditGroupNameModal] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [savingGroupName, setSavingGroupName] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [showDeleteChatModal, setShowDeleteChatModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

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
      } catch (err) {        if (mounted) setError("No hay usuario autenticado");
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
              uniqueParticipantIds.map((id) => obtenerUsuarioPorId(String(id)))
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
          setIsGroup(false);          const usuarioData = await obtenerUsuarioPorId(userId);
          setUsuario(usuarioData);

          // Crear o reutilizar chat
          const chat = await getOrCreateChat(currentUser.id, userId);
          setChatId(chat);        } else {
          setError("ID de usuario o chat no válido");
          setLoading(false);
          return;
        }
      } catch (err) {        setError("No se pudo cargar el chat");
      } finally {
        setLoading(false);
      }
    };

    cargarChat();
  }, [userId, currentUser, paramChatId, paramIsGroup]);

  // 🔹 Escuchar cambios en el chat grupal (para actualizar nombre del grupo en tiempo real)
  useEffect(() => {
    if (!chatId || !isGroup) return;

    const chatRef = doc(db, "Chats", chatId);
    const unsubscribe = onSnapshot(chatRef, (chatDoc) => {
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        if (chatData.groupName && chatData.groupName !== groupName) {
          setGroupName(chatData.groupName);
        }
      }
    }, (error) => {    });

    return () => unsubscribe();
  }, [chatId, isGroup]);

  useEffect(() => {
    if (isGroup || !userId) return;
    const unsubscribe = escucharEstadoUsuario(String(userId), (online, lastSeen) => {      setIsUserOnline(online);
    });

    return () => {      unsubscribe();
    };
  }, [userId, isGroup]);


  // 🔹 Escuchar mensajes cuando tenemos el chatId
  useEffect(() => {
    if (!chatId) return;    const unsubscribe = listenMessages(chatId, (msgs: Message[]) => {
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

  // 🔹 Seleccionar imagen de la galería
  const handleSelectImage = async () => {
    try {      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Se necesita acceso a la galería para seleccionar imágenes."
        );
        return;
      }      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {        setSelectedImage(result.assets[0].uri);
        setSelectedFile(null); // Limpiar archivo si había uno seleccionado
      } else {      }
    } catch (error) {      Alert.alert("Error", `No se pudo seleccionar la imagen: ${error instanceof Error ? error.message : "Error desconocido"}`);
    }
  };

  // 🔹 Tomar foto con la cámara
  const handleTakePhoto = async () => {
    try {      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Se necesita acceso a la cámara para tomar fotos."
        );
        return;
      }      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {        setSelectedImage(result.assets[0].uri);
        setSelectedFile(null); // Limpiar archivo si había uno seleccionado
      } else {      }
    } catch (error) {      Alert.alert("Error", `No se pudo tomar la foto: ${error instanceof Error ? error.message : "Error desconocido"}`);
    }
  };

  // 🔹 Seleccionar archivo
  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile({
          uri: result.assets[0].uri,
          name: result.assets[0].name || "Archivo",
          mimeType: result.assets[0].mimeType || "application/octet-stream",
        });
        setSelectedImage(null); // Limpiar imagen si había una seleccionada
      }
    } catch (error) {      Alert.alert("Error", "No se pudo seleccionar el archivo");
    }
  };

  // 🔹 Abrir selector de imágenes (galería por defecto, cámara con long press)
  const handleImageOptions = () => {    handleSelectImage();
  };

  // 🔹 Abrir cámara (para long press)
  const handleImageOptionsLongPress = () => {    handleTakePhoto();
  };

  // 🔹 Enviar mensaje
  const handleSendMessage = async () => {
    if (!chatId || !currentUser) return;
    if (newMessage.trim() === "" && !selectedImage && !selectedFile) return;

    // Guardar el mensaje antes de limpiarlo
    const messageToSend = newMessage;
    const imageToSend = selectedImage;
    const fileToSend = selectedFile;

    // Limpiar el campo de texto inmediatamente
    setNewMessage("");
    setSelectedImage(null);
    setSelectedFile(null);

    try {
      setUploading(true);
      let imageUrl: string | undefined;
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileType: string | undefined;

      // Subir imagen si hay una seleccionada
      if (imageToSend) {
        imageUrl = await uploadImageToStorage(imageToSend, chatId);
      }

      // Subir archivo si hay uno seleccionado
      if (fileToSend) {
        fileUrl = await uploadFileToStorage(
          fileToSend.uri,
          fileToSend.name,
          fileToSend.mimeType,
          chatId
        );
        fileName = fileToSend.name;
        fileType = fileToSend.mimeType;
      }

      // Enviar mensaje
      if (isGroup) {
        await sendMessage(
          chatId,
          currentUser.id,
          null,
          messageToSend,
          imageUrl,
          fileUrl,
          fileName,
          fileType
        );
      } else {
        if (!userId) {          // Restaurar el mensaje si hay error
          setNewMessage(messageToSend);
          if (imageToSend) setSelectedImage(imageToSend);
          if (fileToSend) setSelectedFile(fileToSend);
          return;
        }
        await sendMessage(
          chatId,
          currentUser.id,
          String(userId),
          messageToSend,
          imageUrl,
          fileUrl,
          fileName,
          fileType
        );
      }
    } catch (error) {      // Restaurar el mensaje si hay error
      setNewMessage(messageToSend);
      if (imageToSend) setSelectedImage(imageToSend);
      if (fileToSend) setSelectedFile(fileToSend);
      Alert.alert("Error", "No se pudo enviar el mensaje");
    } finally {
      setUploading(false);
    }
  };

  // 🔹 Abrir archivo
  const handleOpenFile = (fileUrl: string) => {
    Linking.openURL(fileUrl).catch((err) => {      Alert.alert("Error", "No se pudo abrir el archivo");
    });
  };

  // 🔹 Abrir modal de edición de nombre del grupo
  const handleOpenEditGroupName = () => {
    setEditingGroupName(groupName);
    setShowEditGroupNameModal(true);
    setShowGroupMenu(false); // Cerrar el menú si está abierto
  };

  // 🔹 Abrir modal de confirmación para eliminar chat
  const handleOpenDeleteChat = () => {
    if (!currentUser || !chatId) {
      showAlert(
        "Error de sesión",
        "No se pudo identificar tu usuario. Por favor, cierra la app y vuelve a iniciar sesión.",
        [{ text: "OK" }]
      );
      return;
    }
    setShowGroupMenu(false);
    setShowDeleteChatModal(true);
  };

  // 🔹 Función para manejar la eliminación de chat
  const handleDeleteChat = async () => {
    if (!currentUser || !chatId) return;

    try {
      setDeletingChat(true);
      await deleteChat(chatId, currentUser.id);

      setShowDeleteChatModal(false);
      router.back();
    } catch (error) {
      showAlert(
        "Error",
        "No se pudo eliminar el chat. Por favor, intenta de nuevo."
      );
    } finally {
      setDeletingChat(false);
    }
  };

  // 🔹 Guardar nuevo nombre del grupo
  const handleSaveGroupName = async () => {
    if (!chatId || !editingGroupName.trim()) {
      Alert.alert("Error", "El nombre del grupo no puede estar vacío");
      return;
    }

    if (editingGroupName.trim() === groupName) {
      setShowEditGroupNameModal(false);
      return;
    }

    try {
      setSavingGroupName(true);
      await updateGroupName(chatId, editingGroupName.trim());
      setGroupName(editingGroupName.trim());
      setShowEditGroupNameModal(false);
      Alert.alert("Éxito", "El nombre del grupo se ha actualizado correctamente");
    } catch (error) {      Alert.alert("Error", "No se pudo actualizar el nombre del grupo");
    } finally {
      setSavingGroupName(false);
    }
  };

  // 🔹 Abrir modal de confirmación para eliminar mensaje
  const handleOpenDeleteMessage = (message: Message) => {
    setMessageToDelete(message);
    setShowDeleteModal(true);
  };

  // 🔹 Eliminar mensaje para todos
  const handleDeleteMessage = async () => {
    if (!chatId || !messageToDelete) return;

    try {
      setDeletingMessage(true);
      await deleteMessage(chatId, messageToDelete.id);
      setShowDeleteModal(false);
      setMessageToDelete(null);
    } catch (error) {      Alert.alert("Error", "No se pudo eliminar el mensaje");
    } finally {
      setDeletingMessage(false);
    }
  };

  // 🔹 Render burbujas de mensaje
  const MessageBubble = ({ message }: { message: Message }) => {
    const isMe = message.senderId === currentUser?.id;
    const [showMessageMenu, setShowMessageMenu] = useState(false);

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

    // Formatear nombre para mostrar solo primer nombre y primer apellido
    const formatShortName = (user: any): string => {
      if (!user) return 'Usuario';
      let primerNombre = '';
      let primerApellido = '';
      if (user.nombres) primerNombre = user.nombres.split(' ')[0];
      if (user.apellidos) primerApellido = user.apellidos.split(' ')[0];
      if (!primerNombre && user.nombre) primerNombre = user.nombre.split(' ')[0];
      if (!primerApellido && user.apellido) primerApellido = user.apellido.split(' ')[0];
      if (!primerNombre || !primerApellido) {
        const nombreFuente = user.nombreCompleto || user.nombre || '';
        const partes = nombreFuente.trim().split(' ').filter((p: string) => p.length > 0);
        if (!primerNombre && partes.length > 0) primerNombre = partes[0];
        if (!primerApellido && partes.length > 1) primerApellido = partes[1];
      }
      return primerApellido ? `${primerNombre} ${primerApellido}`.trim() : primerNombre.trim() || 'Usuario';
    };
    const senderName = formatShortName(sender);
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
          isMe && !(message as any).deleted && styles.bubbleWithMenu, // Agregar padding extra cuando hay menú
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
          {/* Menú de tres puntos para mensajes propios */}
          {isMe && !(message as any).deleted && (
            <TouchableOpacity
              style={styles.messageMenuButton}
              onPress={() => setShowMessageMenu(!showMessageMenu)}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={isMe ? "#fff" : "#666"} />
            </TouchableOpacity>
          )}

          {/* Modal de menú del mensaje */}
          <Modal
            transparent
            visible={showMessageMenu}
            animationType="fade"
            onRequestClose={() => setShowMessageMenu(false)}
          >
            <Pressable
              style={styles.messageMenuOverlay}
              onPress={() => setShowMessageMenu(false)}
            >
              <Pressable
                style={styles.messageMenuBox}
                onPress={(e) => e.stopPropagation()}
              >
                <TouchableOpacity
                  style={styles.messageMenuItem}
                  onPress={() => {
                    setShowMessageMenu(false);
                    handleOpenDeleteMessage(message);
                  }}
                >
                  <Ionicons name="trash" size={20} color="#ef4444" style={styles.messageMenuIcon} />
                  <Text style={[styles.messageMenuText, { color: "#ef4444" }]}>Eliminar para todos</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          {isGroup && senderName && (
            <Text style={[styles.senderName, { color: senderColor, fontWeight: "600" }]}>
              {senderName}
            </Text>
          )}

          {/* Mostrar imagen si existe y no está eliminado */}
          {message.imageUrl && !(message as any).deleted && (
            <TouchableOpacity
              style={styles.messageImageContainer}
              onPress={() => setPreviewImage(message.imageUrl!)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: message.imageUrl }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}

          {/* Mostrar archivo si existe y no está eliminado */}
          {message.fileUrl && !(message as any).deleted && (
            <TouchableOpacity
              style={[
                styles.messageFileContainer,
                isMe
                  ? { backgroundColor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.3)" }
                  : { backgroundColor: "rgba(4,145,198,0.1)", borderColor: "rgba(4,145,198,0.2)" },
                { borderWidth: 1 },
              ]}
              onPress={() => handleOpenFile(message.fileUrl!)}
            >
              <Ionicons name="document" size={24} color={isMe ? "#fff" : "#0491C6"} />
              <View style={styles.messageFileInfo}>
                <Text
                  style={[styles.messageFileName, isMe ? styles.myMessageText : styles.theirMessageText]}
                  numberOfLines={1}
                >
                  {message.fileName || "Archivo"}
                </Text>
                <Text style={[styles.messageFileType, isMe ? styles.myTimeText : styles.theirTimeText]}>
                  {message.fileType?.split('/')[1]?.toUpperCase() || "ARCHIVO"}
                </Text>
              </View>
              <Ionicons name="download-outline" size={20} color={isMe ? "#fff" : "#0491C6"} />
            </TouchableOpacity>
          )}

          {/* Mostrar texto si existe */}
          {message.text && message.text.trim() !== "" && (
            <Text
              style={[
                styles.messageText,
                isMe ? styles.myMessageText : styles.theirMessageText,
                (message as any).deleted && styles.deletedMessageText
              ]}
            >
              {message.text}
            </Text>
          )}

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
        <TouchableOpacity onPress={() => router.push('./chats')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        {isGroup ? (
          <TouchableOpacity
            style={styles.headerUserInfo}
            onPress={handleOpenEditGroupName}
            activeOpacity={0.7}
          >
            <View style={[styles.headerAvatarContainer, styles.headerAvatarGroup]}>
              <Text style={styles.headerAvatarText}>👥</Text>
            </View>
            <View style={styles.headerGroupInfo}>
              <View style={styles.headerGroupNameRow}>
                <Text style={styles.headerNameBlack}>{groupName || "Chat grupal"}</Text>
                <Ionicons name="pencil" size={16} color="#666" style={styles.editIcon} />
              </View>
              <Text style={styles.headerStatusBlack}>
                {participantes.length} {participantes.length === 1 ? "participante" : "participantes"}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.headerUserInfo}
            onPress={() => {
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
              } else {              }
            }}
          >
            <View style={styles.headerAvatarContainer}>
              <Text style={styles.headerAvatarText}>
                {String(usuario?.nombre || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.headerNameBlack}>{formatShortName(usuario)}</Text>
              <View style={styles.headerStatusRow}>
                <View style={[
                  styles.statusDotHeader,
                  isUserOnline ? styles.statusDotOnlineHeader : styles.statusDotOfflineHeader
                ]} />
                <Text style={[
                  styles.headerStatusBlack,
                  isUserOnline ? styles.statusTextOnlineHeader : styles.statusTextOfflineHeader
                ]}>
                  {isUserOnline ? "en línea" : "desactivado"}
                </Text>
              </View>



            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {
            setShowGroupMenu(true);
          }}
          disabled={deletingChat}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={20}
            color={deletingChat ? "#d1d5db" : "#333"}
          />
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
                  : `Escribe un mensaje para comenzar a chatear con ${formatShortName(usuario)}`}
              </Text>
            </View>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          {/* Mostrar preview de imagen seleccionada */}
          {selectedImage && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.previewCloseButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* Mostrar preview de archivo seleccionado */}
          {selectedFile && (
            <View style={styles.previewContainer}>
              <View style={styles.previewFile}>
                <Ionicons name="document" size={24} color="#0491C6" />
                <Text style={styles.previewFileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <TouchableOpacity
                  style={styles.previewCloseButton}
                  onPress={() => setSelectedFile(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handleImageOptions}
              onLongPress={handleImageOptionsLongPress}
            >
              <Ionicons name="camera" size={24} color="#0491C6" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachButton} onPress={handleSelectFile}>
              <Ionicons name="attach" size={24} color="#0491C6" />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#999"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              style={[styles.sendButton, uploading && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modal de menú de opciones */}
      <Modal
        transparent
        visible={showGroupMenu}
        animationType="fade"
        onRequestClose={() => setShowGroupMenu(false)}
      >
        <Pressable
          style={styles.menuModalOverlay}
          onPress={() => setShowGroupMenu(false)}
        >
          <View style={styles.groupMenuBox}>
            {isGroup && (
              <TouchableOpacity
                style={styles.groupMenuItem}
                onPress={handleOpenEditGroupName}
              >
                <Ionicons name="pencil" size={20} color="#333" style={styles.groupMenuIcon} />
                <Text style={styles.groupMenuText}>Editar nombre del grupo</Text>
              </TouchableOpacity>
            )}

            {isGroup && <View style={styles.menuDivider} />}

            {isGroup && (
              <TouchableOpacity
                style={styles.groupMenuItem}
                onPress={() => {
                  setShowGroupMenu(false);
                  setShowParticipantsModal(true);
                }}
              >
                <Ionicons name="people" size={20} color="#333" style={styles.groupMenuIcon} />
                <Text style={styles.groupMenuText}>Ver participantes</Text>
              </TouchableOpacity>
            )}

            {isGroup && <View style={styles.menuDivider} />}

            <TouchableOpacity
              style={styles.groupMenuItem}
              onPress={handleOpenDeleteChat}
              disabled={deletingChat}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" style={styles.groupMenuIcon} />
              <Text style={[styles.groupMenuText, { color: "#ef4444" }]}>
                Eliminar chat
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.groupMenuItem}
              onPress={() => setShowGroupMenu(false)}
            >
              <Text style={[styles.groupMenuText, { textAlign: "center", width: "100%" }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Modal de participantes del grupo */}
      <Modal
        visible={showParticipantsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowParticipantsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Participantes del grupo</Text>
              <TouchableOpacity
                onPress={() => setShowParticipantsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={[styles.modalLabel, { marginBottom: 16 }]}>
                {participantes.length} {participantes.length === 1 ? 'participante' : 'participantes'}
              </Text>
              <ScrollView style={styles.participantsList}>
                {participantes.map((participant) => {
                  const isCurrentUser = participant.id === currentUser?.id;
                  const participantColor = participantColorMap[participant.id] || getParticipantColor(participant.id);
                  
                  return (
                    <View key={participant.id} style={styles.participantItem}>
                      <View style={styles.participantAvatarContainer}>
                        {participant.fotoPerfil ? (
                          <Image
                            source={{ uri: participant.fotoPerfil }}
                            style={styles.participantAvatar}
                          />
                        ) : (
                          <View style={[styles.participantAvatarPlaceholder, { backgroundColor: participantColor }]}>
                            <Text style={styles.participantAvatarText}>
                              {(participant.nombreCompleto || participant.nombre || 'U')
                                .charAt(0)
                                .toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName}>
                          {formatShortName(participant)}
                          {isCurrentUser && (
                            <Text style={styles.currentUserLabel}> (Tú)</Text>
                          )}
                        </Text>
                        {participant.codigoUniversitario || participant.codigo ? (
                          <Text style={styles.participantCode}>
                            {participant.codigoUniversitario || participant.codigo}
                          </Text>
                        ) : null}
                        {participant.carrera ? (
                          <Text style={styles.participantCarrera}>{participant.carrera}</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowParticipantsModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de previsualización de imagen */}
      <Modal
        visible={previewImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity
            style={styles.imagePreviewCloseButton}
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Modal para editar nombre del grupo */}
      <Modal
        visible={showEditGroupNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditGroupNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar nombre del grupo</Text>
              <TouchableOpacity
                onPress={() => setShowEditGroupNameModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Nombre del grupo</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ingresa el nombre del grupo"
                placeholderTextColor="#999"
                value={editingGroupName}
                onChangeText={setEditingGroupName}
                maxLength={50}
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowEditGroupNameModal(false);
                  setEditingGroupName("");
                }}
                disabled={savingGroupName}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, savingGroupName && styles.modalSaveButtonDisabled]}
                onPress={handleSaveGroupName}
                disabled={savingGroupName || !editingGroupName.trim()}
              >
                {savingGroupName ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación para eliminar mensaje */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Eliminar mensaje</Text>
              <TouchableOpacity
                onPress={() => setShowDeleteModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>¿Estás seguro de que deseas eliminar este mensaje para todos?</Text>
              <Text style={[styles.modalLabel, { fontSize: 12, marginTop: 8, color: "#999" }]}>
                Esta acción no se puede deshacer.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  setMessageToDelete(null);
                }}
                disabled={deletingMessage}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteButton, deletingMessage && styles.modalSaveButtonDisabled]}
                onPress={handleDeleteMessage}
                disabled={deletingMessage}
              >
                {deletingMessage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Eliminar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación para eliminar chat */}
      <Modal
        visible={showDeleteChatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteChatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Eliminar chat</Text>
              <TouchableOpacity
                onPress={() => setShowDeleteChatModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>
                ¿Estás seguro de que deseas eliminar este chat? Se eliminará completamente, incluyendo todos los mensajes.
              </Text>
              <Text style={[styles.modalLabel, { fontSize: 12, marginTop: 8, color: "#999" }]}>
                Esta acción no se puede deshacer.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteChatModal(false)}
                disabled={deletingChat}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteButton, deletingChat && styles.modalSaveButtonDisabled]}
                onPress={handleDeleteChat}
                disabled={deletingChat}
              >
                {deletingChat ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Eliminar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusDotHeader: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDotOnlineHeader: {
    backgroundColor: "#22c55e",
  },
  statusDotOfflineHeader: {
    backgroundColor: "#ef4444",
  },
  statusTextOnlineHeader: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: "500",
  },
  statusTextOfflineHeader: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "500",
  },
  messageAvatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  messageAvatarText: { fontSize: 12, fontWeight: "bold", color: "#fff" },
  bubble: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 18,
    marginHorizontal: 5,
    position: "relative",
  },
  bubbleWithMenu: {
    paddingRight: 40, // Espacio extra para los 3 puntitos
  },
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
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cameraButton: { padding: 5, marginRight: 5 },
  attachButton: { padding: 5, marginRight: 10 },
  textInput: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 15,
    color: "#333",
    maxHeight: 100,
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
  sendButtonDisabled: {
    opacity: 0.5,
  },
  previewContainer: {
    marginBottom: 10,
    position: "relative",
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 5,
  },
  previewFile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  previewFileName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
  },
  previewCloseButton: {
    marginLeft: 10,
  },
  messageImageContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  messageImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
    maxWidth: '100%',
  },
  messageFileContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  messageFileInfo: {
    flex: 1,
    marginLeft: 10,
  },
  messageFileName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  messageFileType: {
    fontSize: 11,
    opacity: 0.7,
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
  headerGroupInfo: { flex: 1 },
  headerGroupNameRow: { flexDirection: "row", alignItems: "center" },
  editIcon: { marginLeft: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "85%",
    maxWidth: 400,
    padding: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  modalSaveButton: {
    backgroundColor: "#0491C6",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 10,
  },
  groupMenuBox: {
    backgroundColor: "white",
    borderRadius: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: "hidden",
  },
  groupMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  groupMenuIcon: {
    marginRight: 12,
  },
  groupMenuText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 4,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  messageMenuButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  messageMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  messageMenuBox: {
    backgroundColor: "white",
    borderRadius: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: "hidden",
  },
  messageMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  messageMenuIcon: {
    marginRight: 12,
  },
  messageMenuText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalDeleteButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  deletedMessageText: {
    fontStyle: "italic",
    opacity: 0.6,
  },
  participantsList: {
    maxHeight: 400,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  participantAvatarContainer: {
    marginRight: 12,
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  participantAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  participantAvatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  currentUserLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "#666",
    fontStyle: "italic",
  },
  participantCode: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  participantCarrera: {
    fontSize: 12,
    color: "#999",
  },
});

