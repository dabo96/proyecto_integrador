import {collection, query, where, getDocs, addDoc, updateDoc, onSnapshot, orderBy, serverTimestamp, doc, increment,} from "firebase/firestore";
import { db } from "@/services/firebase";

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
  });

  return newChat.id;
};

// ennviar mensaje
export const sendMessage = async (
  chatId: string,
  senderId: string,
  receiverId: string,
  text: string
): Promise<void> => {
  if (!chatId || !senderId || !receiverId || !text.trim()) {
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

  const chatRef = doc(db, "Chats", chatId);
  await updateDoc(chatRef, {
    lastMessage: text,
    updatedAt: serverTimestamp(),
    [`unreadCount.${senderId}`]: 0,
    [`unreadCount.${receiverId}`]: increment(1),
  });
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
