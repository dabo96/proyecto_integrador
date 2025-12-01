import { db, storage } from "@/services/firebase";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
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

    // console.log("🔹 Subiendo imagen a Firebase Storage:", nombreArchivo);

    // Convertir la URI a blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Subir la imagen
    await uploadBytes(storageRef, blob);

    // console.log("✅ Imagen subida, obteniendo URL...");

    // Obtener la URL pública
    const downloadURL = await getDownloadURL(storageRef);
    // console.log("✅ Imagen subida correctamente:", downloadURL);

    return downloadURL;
  } catch (error) {
    // console.error("❌ Error subiendo imagen:", error);
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

    // console.log("🔹 Subiendo archivo a Firebase Storage:", nombreArchivo);

    // Convertir la URI a blob
    const response = await fetch(uri);
    const blob = await response.blob();

    // Subir el archivo
    await uploadBytes(storageRef, blob);

    // console.log("✅ Archivo subido, obteniendo URL...");

    // Obtener la URL pública
    const downloadURL = await getDownloadURL(storageRef);
    // console.log("✅ Archivo subido correctamente:", downloadURL);

    return downloadURL;
  } catch (error) {
    // console.error("❌ Error subiendo archivo:", error);
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
    // console.warn("Faltan parámetros para enviar el mensaje");
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
  let deletedFor: string[] = [];

  if (chatDoc.exists()) {
    const chatData = chatDoc.data();
    isGroup = chatData.isGroup || false;
    participants = chatData.participants || [];
    deletedFor = chatData.deletedFor || [];
  }

  // Actualizar el chat
  const updateData: any = {
    lastMessage: previewMessage,
    updatedAt: serverTimestamp(),
    [`unreadCount.${senderId}`]: 0,
  };

  // REACTIVAR CHAT: Si alguien envía un mensaje, reactivar el chat para quienes lo eliminaron
  if (deletedFor.length > 0) {
    // console.log(`🔄 ANTES de reactivar - deletedFor:`, deletedFor);
    // console.log(`🔄 Reactivando chat para ${deletedFor.length} usuario(s) que lo eliminaron`);
    updateData.deletedFor = []; // Limpiar completamente el array
    updateData.deleted = false; // Marcar como no eliminado
    // console.log(`✅ DESPUÉS de reactivar - deletedFor será:`, updateData.deletedFor);
  }

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

// Actualizar el nombre de un chat grupal
export const updateGroupName = async (chatId: string, newGroupName: string): Promise<void> => {
  if (!chatId || !newGroupName || newGroupName.trim() === "") {
    throw new Error("El ID del chat y el nombre del grupo son requeridos");
  }

  const chatRef = doc(db, "Chats", chatId);
  await updateDoc(chatRef, {
    groupName: newGroupName.trim(),
    updatedAt: serverTimestamp(),
  });
};

// Eliminar chat completamente de la base de datos
export const deleteChat = async (chatId: string, userId: string) => {
  try {
    const chatRef = doc(db, "Chats", chatId);
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) {
      throw new Error("Chat no encontrado");
    }

    // 1. Eliminar todos los mensajes del chat
    const mensajesRef = collection(db, "Chats", chatId, "mensajes");
    const mensajesSnapshot = await getDocs(mensajesRef);

    // Usar batch para eliminar mensajes en lotes (máximo 500 por batch)
    const batch = writeBatch(db);
    let batchCount = 0;
    const maxBatchSize = 500;

    for (const mensajeDoc of mensajesSnapshot.docs) {
      batch.delete(mensajeDoc.ref);
      batchCount++;

      // Si alcanzamos el límite del batch, ejecutamos y creamos uno nuevo
      if (batchCount >= maxBatchSize) {
        await batch.commit();
        batchCount = 0;
      }
    }

    // Ejecutar el batch final si hay documentos pendientes
    if (batchCount > 0) {
      await batch.commit();
    }

    // 2. Eliminar el documento del chat
    await deleteDoc(chatRef);

  } catch (error) {
    // console.error("Error eliminando chat:", error);
    throw error;
  }
};

// Eliminar un mensaje específico para todos los usuarios
export const deleteMessage = async (chatId: string, messageId: string): Promise<void> => {
  try {
    const messageRef = doc(db, "Chats", chatId, "mensajes", messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      throw new Error("Mensaje no encontrado");
    }

    const chatRef = doc(db, "Chats", chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error("Chat no encontrado");
    }

    const messageData = messageDoc.data();
    const currentLastMessage = (chatDoc.data().lastMessage || "").trim();
    const messageText = (messageData.text || "").trim();
    
    // Determinar qué preview tendría este mensaje ANTES de eliminarlo
    let messagePreview = "";
    if (messageText && messageText !== "Este mensaje fue eliminado") {
      messagePreview = messageText.trim();
    } else if (messageData.imageUrl) {
      messagePreview = "📷 Imagen";
    } else if (messageData.fileUrl) {
      messagePreview = `📎 ${messageData.fileName || "Archivo"}`;
    }
    
    // Verificar si este mensaje es el que aparece como lastMessage
    // Comparar tanto el preview como el texto directamente (sin espacios)
    const isLastMessage = currentLastMessage === messagePreview || 
                          currentLastMessage === messageText.trim() ||
                          (messagePreview && currentLastMessage.includes(messagePreview));

    // Actualizar el mensaje para marcarlo como eliminado
    await updateDoc(messageRef, {
      text: "Este mensaje fue eliminado",
      deleted: true,
      deletedAt: serverTimestamp(),
      imageUrl: null,
      fileUrl: null,
      fileName: null,
      fileType: null,
    });

    // SIEMPRE buscar y actualizar el lastMessage después de eliminar
    // Esto asegura que el preview se actualice correctamente en todos los casos
    const mensajesRef = collection(db, "Chats", chatId, "mensajes");
    const mensajesQuery = query(mensajesRef, orderBy("timestamp", "desc"));
    const mensajesSnapshot = await getDocs(mensajesQuery);
    
    // Buscar el siguiente mensaje más reciente que no esté eliminado
    let nuevoLastMessage = "";
    for (const mensajeDoc of mensajesSnapshot.docs) {
      // Saltar el mensaje que acabamos de eliminar
      if (mensajeDoc.id === messageId) continue;
      
      const mensajeData = mensajeDoc.data();
      
      // Saltar mensajes eliminados
      if (mensajeData.deleted || mensajeData.text === "Este mensaje fue eliminado") continue;
      
      // Determinar el preview del mensaje
      const mensajeTexto = (mensajeData.text || "").trim();
      if (mensajeTexto && mensajeTexto !== "Este mensaje fue eliminado") {
        nuevoLastMessage = mensajeTexto;
      } else if (mensajeData.imageUrl) {
        nuevoLastMessage = "📷 Imagen";
      } else if (mensajeData.fileUrl) {
        nuevoLastMessage = `📎 ${mensajeData.fileName || "Archivo"}`;
      }
      
      if (nuevoLastMessage) break; // Encontramos un mensaje válido
    }
    
    // SIEMPRE actualizar el lastMessage del chat para asegurar sincronización
    // Esto garantiza que el listener detecte el cambio y actualice la UI
    await updateDoc(chatRef, {
      lastMessage: nuevoLastMessage,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // console.error("Error eliminando mensaje:", error);
    throw error;
  }
};
