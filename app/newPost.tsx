import IconButton from '@/components/button/IconButton';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

interface Props {
  onGoBack?: () => void;
  onPublicar?: (texto: string) => void;
  usuarioNombre?: string;
}

const NuevaPublicacionScreen: React.FC<Props> = ({
  onGoBack = () => console.log('Atrás'),
  onPublicar = (texto) => console.log('Publicar:', texto),
  usuarioNombre = "Sofia"
}) => {
  const [texto, setTexto] = useState('');

  const publicar = () => {
    if (!texto.trim()) return Alert.alert('Error', 'Escribe algo');
    onPublicar(texto);
    setTexto('');
  };

  return (
  <SafeAreaView style={styles.container}>
    {/* Header */}
    <LinearGradient
      colors={['#2F4AA6', '#0491C6']}
      style={styles.mainHeader}
    />

    {/* Sub-header*/}
    <View style={styles.subHeader}>
      <View style={styles.headerLeft}>
        <Pressable onPress={onGoBack}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Image 
          source={{ uri: "https://i.pinimg.com/736x/96/55/d8/9655d8c062e1019d5619b882c0baf989.jpg" }} 
          style={styles.avatar} 
        />
        <Text style={styles.name}>{usuarioNombre}</Text>
      </View>
      <IconButton title="Publicar" onPress={() => { }} backgroundColor="#1d4ed8" style={{borderRadius:20,}} />
    </View>

    {/* Input*/}
    <TextInput
      style={styles.input}
      placeholder="¿Qué está pasando?"
      placeholderTextColor="#999"
      multiline
      value={texto}
      onChangeText={setTexto}
      maxLength={280}
    />

    {/* Footer */}
    <View style={styles.footer}>
      <Pressable style={styles.actionBtn}>
        <Text style={styles.icon}>📷</Text>
      </Pressable>
      <Text style={styles.counter}>{280 - texto.length}</Text>
    </View>
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mainHeader: { 
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
  },

  subHeader: { 
    position: 'absolute',
    top: 30, 
    left: 0,
    right: 0,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    zIndex: 999,
  },

  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  back: { fontSize: 24, color: '#2F4AA6', marginRight: 16 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  name: { fontSize: 16, color: '#333', fontWeight: '500' },

  btn: { backgroundColor: '#2F80ED', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  btnDisabled: { backgroundColor: '#2F80ED' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnTextDisabled: { color: 'rgba(255,255,255,0.7)' },

  input: { 
    flex: 1, 
    fontSize: 18, 
    padding: 16, 
    textAlignVertical: 'top',
    marginTop: 60,
  },

  footer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#E5E5E5' 
  },
  actionBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#F5F5F5', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  icon: { fontSize: 20 },
  counter: { fontSize: 14, color: '#666' }
});
export default NuevaPublicacionScreen;