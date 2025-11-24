import { listenUserChats } from "@/api/messageService";
import { obtenerUsuarioActual, obtenerUsuarioPorId, Usuario } from "@/api/usuariosService";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const [usuariosCache, setUsuariosCache] = useState<{ [id: string]: Usuario }>({});

  // Obtener usuario actual
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        const u = await obtenerUsuarioActual();
        setCurrentUser(u);
      } catch (err) {
        console.error("Error obteniendo usuario actual:", err);
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

      // Filtrar chats vacíos (sin mensajes)
      const filteredChats = data.filter(chat => chat.lastMessage && chat.lastMessage.trim() !== "");
      //console.log("💬 Chats recibidos:", usuariosCache)
      //console.log("💬 Chats filtrados (con mensajes):", filteredChats);
      // Mapeamos los chats con la info de los usuarios
      const formattedChats = filteredChats.map(chat => {
        const isGroup = chat.isGroup || (chat.participants?.length || 0) > 2;
        
        if (isGroup) {
          // Chat grupal: mostrar nombre del grupo o lista de participantes
          const otherParticipants = (chat.participants || []).filter(
            (id: string) => id !== currentUser.id
          );
          
          // Obtener nombres de los participantes
          const participantNames = otherParticipants
            .map((id: string) => {
              const user = cacheRef.current[id];
              return user?.nombre || "Usuario";
            })
            .slice(0, 3); // Mostrar máximo 3 nombres
          
          const groupName = chat.groupName || 
            (participantNames.length > 0 
              ? participantNames.join(", ") + (otherParticipants.length > 3 ? "..." : "")
              : `Chat grupal (${otherParticipants.length + 1})`);
          
          return {
            id: chat.id,
            otherUserId: null, // Chats grupales no tienen un solo "otro usuario"
            name: groupName,
            message: chat.lastMessage || "",
            time:
              chat.updatedAt?.toDate?.().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) || "",
            avatar: "", // Los chats grupales pueden tener un avatar especial más adelante
            online: false,
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
          return {
            id: chat.id,
            otherUserId, // 👈 ID del otro usuario
            name: otherUser.nombre || "Desconocido",
            message: chat.lastMessage || "",
            time:
              chat.updatedAt?.toDate?.().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) || "",
            avatar: otherUser.fotoPerfil || "",
            online: otherUser.online || false,
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
  }, [currentUser]);

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
                      <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                    )}
                  </View>
                  {!item.isGroup && item.online && <View style={styles.onlineDot} />}
                </View>

                {/* Info */}
                <View style={styles.chatInfo}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.chatName}>{item.name}</Text>
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
            );
          }}
        />
      )}
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
  chatItem: {
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
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: "#22c55e",
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
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
});
