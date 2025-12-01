import { deleteChat, listenUserChats } from "@/api/messageService";
import { escucharEstadoUsuario, obtenerUsuarioActual, obtenerUsuarioPorId, Usuario } from "@/api/usuariosService";
import { showAlert } from "@/utils/alert";
import { formatShortName } from "@/utils/nameFormatter";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Chat = {
  id: string;            // ID del chat
  otherUserId: string | null;   // ID del otro usuario (null para chats grupales)
  name: string;
  message: string;
  time: string;
  avatar: string;
  online: boolean;
  unread: number;
  isGroup: boolean;      // Indica si es un chat grupal
  participants?: string[]; // IDs de todos los participantes
};

const ChatCreem = () => {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<{ [userId: string]: boolean }>({});
  const [usuariosCache, setUsuariosCache] = useState<{ [id: string]: Usuario }>({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteChatModal, setShowDeleteChatModal] = useState(false);

  // Obtener usuario actual
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        const u = await obtenerUsuarioActual();

        if (u) {
          console.log("✅ Usuario actual obtenido:", u.id, u.nombre);
          setCurrentUser(u);
        } else {
          console.error("❌ obtenerUsuarioActual() retornó null");
          showAlert(
            "Error",
            "No se pudo obtener la información del usuario. Por favor, inicia sesión nuevamente."
          );
        }
      } catch (err) {
        console.error("❌ Error obteniendo usuario actual:", err);
        showAlert(
          "Error",
          "Ocurrió un error al cargar tu información. Por favor, intenta de nuevo."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Escuchar chats del usuario actual
  useEffect(() => {
    if (!currentUser) return;

    const cacheRef = { current: { ...usuariosCache } };

    const unsubscribe = listenUserChats(currentUser.id, async (data: any[]) => {
      // IDs de los otros participantes (excluyendo al usuario actual)
      const userIds = [
        ...new Set(
          data
            .flatMap(chat => chat.participants)
            .filter((id: string) => id !== currentUser.id)
        ),
      ];
      //console.log("💬 IDs de usuarios en chats:", userIds);

      // Solo buscar los que no estén en caché
      const newUserIds = userIds.filter(id => !cacheRef.current[id]);
      //console.log("💬 Nuevos IDs de usuario", newUserIds);

      if (newUserIds.length > 0) {
        const fetchedUsers = await Promise.all(
          newUserIds.map(id => obtenerUsuarioPorId(id))
        );

        fetchedUsers.forEach(u => {
          console.log("💬 Usuario cacheado:", u);
          if (u && u.id) cacheRef.current[u.id] = u;
        });

        // Actualizamos cache global una sola vez
        setUsuariosCache({ ...cacheRef.current });
        //console.log("💬 Chats recibidos:", usuariosCache);
      }

      // Filtrar chats vacíos (sin mensajes), eliminados, y donde el usuario ya no es participante
      const filteredChats = data.filter(chat => {
        const lastMessage = (chat.lastMessage || "").trim();
        // No considerar mensajes eliminados o vacíos como mensajes válidos
        const hasMessage = lastMessage !== "" && 
                          lastMessage !== "Este mensaje fue eliminado" &&
                          !lastMessage.toLowerCase().includes("este mensaje fue eliminado");
        const notDeleted = !chat.deleted;
        const notDeletedForUser = !chat.deletedFor?.includes(currentUser.id);
        const isParticipant = chat.participants?.includes(currentUser.id);

        const shouldShow = hasMessage && notDeleted && notDeletedForUser && isParticipant;

        return shouldShow;
      });

      // Mapeamos los chats con la info de los usuarios
      const formattedChats = filteredChats.map(chat => {
        const isGroup = chat.isGroup || (chat.participants?.length || 0) > 2;

        if (isGroup) {
          // Chat grupal: mostrar nombre del grupo o lista de participantes
          const otherParticipants = (chat.participants || []).filter(
            (id: string) => id !== currentUser.id
          );

          // Obtener nombres de los participantes (solo primer nombre y primer apellido)
          const participantNames = otherParticipants
            .map((id: string) => {
              const user = cacheRef.current[id];
              return formatShortName(user);
            })
            .slice(0, 3); // Mostrar máximo 3 nombres

          const groupName = chat.groupName ||
            (participantNames.length > 0
              ? participantNames.join(", ") + (otherParticipants.length > 3 ? "..." : "")
              : `Chat grupal (${otherParticipants.length + 1})`);

          // Filtrar mensajes eliminados del preview
          const lastMessage = (chat.lastMessage || "").trim();
          const displayMessage = (lastMessage === "Este mensaje fue eliminado" || 
                                 lastMessage === "" ||
                                 lastMessage.toLowerCase().includes("este mensaje fue eliminado")) ? "" : lastMessage;

          return {
            id: chat.id,
            otherUserId: null, // Chats grupales no tienen un solo "otro usuario"
            name: groupName,
            message: displayMessage,
            time:
              chat.updatedAt?.toDate?.().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) || "",
            avatar: "", // Los chats grupales pueden tener un avatar especial más adelante
            online: false, // Se actualizará con el listener de estado
            unread: chat.unreadCount?.[currentUser.id] || 0,
            isGroup: true,
            participants: chat.participants || [],
          };
        } else {
          // Chat individual
          const otherUserId = chat.participants.find(
            (id: string) => id !== currentUser.id
          );

      

          const otherUser = cacheRef.current[otherUserId] || { nombre: "Desconocido" };
          //console.log("💬 Formateando chat con usuario:", otherUser);
          
          // Filtrar mensajes eliminados del preview
          const lastMessage = (chat.lastMessage || "").trim();
          const displayMessage = (lastMessage === "Este mensaje fue eliminado" || 
                                 lastMessage === "" ||
                                 lastMessage.toLowerCase().includes("este mensaje fue eliminado")) ? "" : lastMessage;

          return {
            id: chat.id,
            otherUserId, // 👈 ID del otro usuario
            name: formatShortName(otherUser),
            message: displayMessage,
            time:
              chat.updatedAt?.toDate?.().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) || "",
            avatar: otherUser.fotoPerfil || "",
            online: onlineStatus[otherUserId] ?? false,
            unread: chat.unreadCount?.[currentUser.id] || 0,
            isGroup: false,
            participants: chat.participants || [],
          };
        }
      });



      //console.log("💬 Chats formateados:", chats);
      setChats(formattedChats);
    });



    return () => unsubscribe();


}, [currentUser, onlineStatus]);

// Escuchar estados de conexión de los usuarios en los chats
useEffect(() => {
  if (!currentUser || chats.length === 0) return;

  const unsubscribes: (() => void)[] = [];
  const userIdsToListen = new Set<string>();

  // Recopilar todos los IDs de usuarios únicos de chats individuales
  chats.forEach(chat => {
    if (!chat.isGroup && chat.otherUserId) {
      userIdsToListen.add(chat.otherUserId);
    }
  });

  console.log("👂 Configurando listeners de estado para usuarios:", Array.from(userIdsToListen));

  // Escuchar estado de cada usuario
  userIdsToListen.forEach(userId => {
    const unsubscribe = escucharEstadoUsuario(userId, (online, lastSeen) => {
      console.log(`📡 [CHATS] Estado actualizado para ${userId}:`, online ? "en línea" : "desactivado");
      setOnlineStatus(prev => {
        // Solo actualizar si el valor realmente cambió
        if (prev[userId] === online) {
          console.log(`⚠️ [CHATS] Estado no cambió para ${userId}, ya era ${online}`);
          return prev; // Retornar el mismo objeto si no hay cambio
        }
        const newStatus = {
          ...prev,
          [userId]: online
        };
        console.log(`✅ [CHATS] Estado completo actualizado para ${userId}:`, newStatus);
        return newStatus;
      });
    });
    unsubscribes.push(unsubscribe);
  });

  return () => {
    console.log("🧹 Limpiando listeners de estado");
    unsubscribes.forEach(unsub => unsub());
  };
}, [chats, currentUser]);

  // Función para abrir modal de confirmación de eliminación
  const handleOpenDeleteChat = (chatId: string) => {
    if (!currentUser) {
      showAlert(
        "Error de sesión",
        "No se pudo identificar tu usuario. Por favor, cierra la app y vuelve a iniciar sesión.",
        [{ text: "OK" }]
      );
      return;
    }
    setSelectedChatId(chatId);
    setMenuVisible(false);
    setShowDeleteChatModal(true);
  };

  // Función para manejar la eliminación de chat
  const handleDeleteChat = async () => {
    if (!currentUser || !selectedChatId) return;

    try {
      setDeleting(true);
      await deleteChat(selectedChatId, currentUser.id);

      setShowDeleteChatModal(false);
      setSelectedChatId(null);
    } catch (error) {
      showAlert(
        "Error",
        "No se pudo eliminar el chat. Por favor, intenta de nuevo."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <TouchableOpacity onPress={() => router.push("./seleccionarUsuarios")}>
          <Plus size={28} color="black" />
        </TouchableOpacity>
      </View>

      {/* Lista de chats */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Cargando chats...</Text>
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No tienes chats aún</Text>
          <Text style={styles.emptySubtitle}>
            Presiona el botón "+" para iniciar un nuevo chat
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const otherUser = item.otherUserId ? usuariosCache[item.otherUserId] : null;
            return (
              <View style={styles.chatItemContainer} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.chatItem}
                  onPress={() => {
                    if (item.isGroup) {
                      // Navegar a chat grupal
                      router.push({
                        pathname: "./chatDetails",
                        params: {
                          chatId: item.id,
                          isGroup: 'true',
                        },
                      });
                    } else {
                      // Navegar a chat individual
                      router.push({
                        pathname: "./chatDetails",
                        params: {
                          userId: item.otherUserId, // ✅ ID real del otro usuario
                          name: item.name,
                          avatar: item.avatar,
                          codigo: otherUser?.codigo || '',
                          carrera: otherUser?.carrera || '',
                          correo: otherUser?.correo || '',
                        },
                      });
                    }
                  }}
                >
                  {/* Avatar */}
                  <View style={styles.avatarWrapper}>
                    <View style={[styles.avatar, item.isGroup && styles.avatarGroup]}>
                      {item.isGroup ? (
                        <Text style={styles.avatarText}>👥</Text>
                      ) : (
                        <>
                          {otherUser?.fotoPerfil ? (
                            <Image
                              source={{ uri: otherUser.fotoPerfil }}
                              style={styles.avatarImage}
                            />
                          ) : (
                            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                          )}
                        </>
                      )}
                    </View>
                    {!item.isGroup && (
                      <View style={[
                        styles.onlineDot,
                        item.online ? styles.onlineDotActive : styles.onlineDotInactive
                      ]} />
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.chatInfo}>
                    <View style={styles.rowBetween}>
                      <View style={styles.nameContainer}>
                        <Text style={styles.chatName}>{item.name}</Text>
                      </View>
                      <Text style={styles.chatTime}>{item.time}</Text>
                    </View>
                    <View style={styles.rowBetween}>
                      <Text
                        style={styles.chatMessage}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.message}
                      </Text>
                      {item.unread > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{item.unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Three-dot menu button */}
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => {
                    setSelectedChatId(item.id);
                    setMenuVisible(true);
                  }}
                  disabled={deleting}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={20}
                    color={deleting ? "#d1d5db" : "#6b7280"}
                  />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Menu Modal */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => {
          setMenuVisible(false);
          setSelectedChatId(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setMenuVisible(false);
            setSelectedChatId(null);
          }}
        >
          <TouchableWithoutFeedback>
            <View style={styles.menuModal}>
              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  if (selectedChatId) {
                    handleOpenDeleteChat(selectedChatId);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text style={styles.menuOptionTextDelete}>Eliminar chat</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setMenuVisible(false);
                  setSelectedChatId(null);
                }}
              >
                <Text style={styles.menuOptionTextCancel}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>

      {/* Modal de confirmación para eliminar chat */}
      <Modal
        visible={showDeleteChatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteChatModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalHeader}>
              <Text style={styles.deleteModalTitle}>Eliminar chat</Text>
              <TouchableOpacity
                onPress={() => setShowDeleteChatModal(false)}
                style={styles.deleteModalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalLabel}>
                ¿Estás seguro de que deseas eliminar este chat? Se eliminará completamente, incluyendo todos los mensajes.
              </Text>
              <Text style={[styles.deleteModalLabel, { fontSize: 12, marginTop: 8, color: "#999" }]}>
                Esta acción no se puede deshacer.
              </Text>
            </View>

            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={() => setShowDeleteChatModal(false)}
                disabled={deleting}
              >
                <Text style={styles.deleteModalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalDeleteButton, deleting && styles.deleteModalButtonDisabled]}
                onPress={handleDeleteChat}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteModalDeleteButtonText}>Eliminar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default ChatCreem;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  chatItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  chatItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0491C6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarGroup: {
    backgroundColor: "#7C3AED", // Color diferente para chats grupales
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  nameContainer: {
    flex: 1,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  onlineDotActive: {
    backgroundColor: "#22c55e",
  },
  onlineDotInactive: {
    backgroundColor: "#ef4444",
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
  },
  chatTime: {
    fontSize: 12,
    color: "#6b7280",
  },
  chatMessage: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: "#ef4444",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  menuButton: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuModal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuOptionTextDelete: {
    fontSize: 16,
    color: "#ef4444",
    marginLeft: 12,
    fontWeight: "500",
  },
  menuOptionTextCancel: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
    textAlign: "center",
    width: "100%",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#e5e5e5",
    marginVertical: 4,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModalContainer: {
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
  deleteModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  deleteModalCloseButton: {
    padding: 4,
  },
  deleteModalContent: {
    padding: 20,
  },
  deleteModalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  deleteModalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  deleteModalCancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#E0E0E0",
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteModalCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  deleteModalDeleteButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteModalDeleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  deleteModalButtonDisabled: {
    opacity: 0.6,
  },
});
