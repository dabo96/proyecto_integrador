import { db, storage } from "@/services/firebase";
import { addDoc, collection, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

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

// Subir imagen a Firebase Storage
export const uploadImageToStorage = async (uri: string, chatId: string): Promise<string> => {
  try {
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 10000);
    const nombreArchivo = `chats/${chatId}/imagenes/${timestamp}_${randomId}.jpg`;
    const storageRef = ref(storage, nombreArchivo);

    console.log("🔹 Subiendo imagen a Firebase Storage:", nombreArchivo);
    
    // Convertir la URI a blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Subir la imagen
    await uploadBytes(storageRef, blob);

    console.log("✅ Imagen subida, obteniendo URL...");
    
    // Obtener la URL pública
    const downloadURL = await getDownloadURL(storageRef);
    console.log("✅ Imagen subida correctamente:", downloadURL);

    return downloadURL;
  } catch (error) {
    console.error("❌ Error subiendo imagen:", error);
    throw error;
  }
};

// Subir archivo a Firebase Storage
export const uploadFileToStorage = async (uri: string, fileName: string, mimeType: string, chatId: string): Promise<string> => {
  try {
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 10000);
    // Obtener extensión del archivo original o usar mimeType
    const extension = fileName.split('.').pop() || mimeType.split('/').pop() || 'bin';
    const nombreArchivo = `chats/${chatId}/archivos/${timestamp}_${randomId}.${extension}`;
    const storageRef = ref(storage, nombreArchivo);

    console.log("🔹 Subiendo archivo a Firebase Storage:", nombreArchivo);
    
    // Convertir la URI a blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Subir el archivo
    await uploadBytes(storageRef, blob);

    console.log("✅ Archivo subido, obteniendo URL...");
    
    // Obtener la URL pública
    const downloadURL = await getDownloadURL(storageRef);
    console.log("✅ Archivo subido correctamente:", downloadURL);

    return downloadURL;
  } catch (error) {
    console.error("❌ Error subiendo archivo:", error);
    throw error;
  }
};

// Enviar mensaje (soporta chats individuales y grupales)
export const sendMessage = async (
  chatId: string,
  senderId: string,
  receiverId: string | null, // Opcional para chats grupales
  text: string,
  imageUrl?: string,
  fileUrl?: string,
  fileName?: string,
  fileType?: string
): Promise<void> => {
  // Validar que haya al menos texto, imagen o archivo
  if (!chatId || !senderId || (!text.trim() && !imageUrl && !fileUrl)) {
    console.warn("Faltan parámetros para enviar el mensaje");
    return;
  }

  const messagesRef = collection(db, "Chats", chatId, "mensajes");

  // Determinar el mensaje de preview para lastMessage
  let previewMessage = text.trim();
  if (!previewMessage) {
    if (imageUrl) {
      previewMessage = "📷 Imagen";
    } else if (fileUrl) {
      previewMessage = `📎 ${fileName || "Archivo"}`;
    }
  }

  const messageData: any = {
    senderId,
    text: text || "",
    timestamp: serverTimestamp(),
    seen: false,
  };

  // Agregar datos de imagen si existe
  if (imageUrl) {
    messageData.imageUrl = imageUrl;
    messageData.type = "image";
  }

  // Agregar datos de archivo si existe
  if (fileUrl) {
    messageData.fileUrl = fileUrl;
    messageData.fileName = fileName || "Archivo";
    messageData.fileType = fileType || "application/octet-stream";
    if (!messageData.type) {
      messageData.type = "file";
    }
  }

  // Si tiene texto e imagen/archivo, es un mensaje mixto
  if (text.trim() && (imageUrl || fileUrl)) {
    messageData.type = "mixed";
  } else if (!messageData.type) {
    messageData.type = "text";
  }

  await addDoc(messagesRef, messageData);

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
    lastMessage: previewMessage,
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
