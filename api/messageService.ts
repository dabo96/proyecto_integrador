import { db } from "@/services/firebase";
import { addDoc, collection, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, } from "firebase/firestore";

// Crear o reutilizar un chat entre dos usuarios
export const getOrCreateChat = async (emisorId: string, receptorId: string) => {
  const chatsRef = collection(db, "Chats");

  const participants = [emisorId, receptorId].sort();
  const chatKey = participants.join("_");

  // Buscar si ya existe un chat
  const q = query(chatsRef, where("chatKey", "==", chatKey));
  const existing = await getDocs(q);

  if (!existing.empty) return existing.docs[0].id;

  // Crear nuevo chat
  const newChat = await addDoc(chatsRef, {
    participants,
    chatKey,
    lastMessage: "",
    updatedAt: serverTimestamp(),
    isGroup: false,
  });

  return newChat.id;
};

// Crear o reutilizar un chat grupal con múltiples participantes
export const getOrCreateGroupChat = async (participantIds: string[], groupName?: string) => {
  const chatsRef = collection(db, "Chats");

  // Ordenar IDs para crear una clave única
  const sortedParticipants = [...participantIds].sort();
  const chatKey = sortedParticipants.join("_");

  // Buscar si ya existe un chat con exactamente estos participantes
  const q = query(chatsRef, where("chatKey", "==", chatKey));
  const existing = await getDocs(q);

  if (!existing.empty) return existing.docs[0].id;

  // Crear nuevo chat grupal
  const newChat = await addDoc(chatsRef, {
    participants: sortedParticipants,
    chatKey,
    lastMessage: "",
    updatedAt: serverTimestamp(),
    isGroup: true,
    groupName: groupName || `Chat grupal (${sortedParticipants.length})`,
  });

  return newChat.id;
};

// Enviar mensaje (soporta chats individuales y grupales)
export const sendMessage = async (
  chatId: string,
  senderId: string,
  receiverId: string | null, // Opcional para chats grupales
  text: string
): Promise<void> => {
  if (!chatId || !senderId || !text.trim()) {
    console.warn("Faltan parámetros para enviar el mensaje");
    return;
  }

  const messagesRef = collection(db, "Chats", chatId, "mensajes");

  await addDoc(messagesRef, {
    senderId,
    text,
    timestamp: serverTimestamp(),
    seen: false,
  });

  // Obtener información del chat para determinar si es grupal
  const chatRef = doc(db, "Chats", chatId);
  const chatDoc = await getDoc(chatRef);
  
  let isGroup = false;
  let participants: string[] = [];
  
  if (chatDoc.exists()) {
    const chatData = chatDoc.data();
    isGroup = chatData.isGroup || false;
    participants = chatData.participants || [];
  }

  // Actualizar el chat
  const updateData: any = {
    lastMessage: text,
    updatedAt: serverTimestamp(),
    [`unreadCount.${senderId}`]: 0,
  };

  // Para chats grupales, incrementar contador de todos los demás participantes
  if (isGroup && participants.length > 0) {
    participants.forEach((participantId) => {
      if (participantId !== senderId) {
        updateData[`unreadCount.${participantId}`] = increment(1);
      }
    });
  } else if (receiverId) {
    // Para chats individuales, incrementar solo el receptor
    updateData[`unreadCount.${receiverId}`] = increment(1);
  }

  await updateDoc(chatRef, updateData);
};

// eschucar mensajes en tiempo real
export const listenMessages = (chatId: string, callback: Function) => {
  const messagesRef = collection(db, "Chats", chatId, "mensajes");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(messages);
  });
};

// escuchar lista de chats del usuario logueado
export const listenUserChats = (userId: string, callback: Function) => {
  const chatsRef = collection(db, "Chats");
  const q = query(chatsRef, where("participants", "array-contains", userId));

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(chats);
  });
};

// Marcar mensajes como leídos
export const markMessagesAsRead = async (chatId: string, userId: string) => {
  const chatRef = doc(db, "Chats", chatId);
  await updateDoc(chatRef, {
    [`unreadCount.${userId}`]: 0, // Reinicia su contador
  });
};


// eIncrementar contador no leídos (para el receptor)
export const incrementUnreadCount = async (chatId: string, receiverId: string) => {
  const chatRef = doc(db, "Chats", chatId);
  await updateDoc(chatRef, {
    [`unreadCount.${receiverId}`]: increment(1), // Necesita import: import { increment } from "firebase/firestore";
  });
};
