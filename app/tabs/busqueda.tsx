import ImageButton from '@/components/ImageButton';
import { db } from '@/services/firebase';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Usuario {
    id: string;
    nombres: string;
    apellidos: string;
    fotoPerfil?: string;
    usuarioID: string;
}

export default function Busqueda() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const buscarUsuarios = async (texto: string) => {
        setQuery(texto);

        if (!texto.trim()) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        setLoading(true);
        setHasSearched(true);

        try {
            console.log('Buscando usuarios con texto:', texto);
            const usuariosRef = collection(db, 'Usuarios');
            const usuariosSnapshot = await getDocs(usuariosRef);
            const resultados: Usuario[] = [];

            usuariosSnapshot.forEach((doc) => {
                const data = doc.data();

                // Usar el campo "nombre" que contiene el nombre completo
                const nombreOrigen = data.nombreCompleto || data.nombre || [data.nombres, data.apellidos].filter(Boolean).join(' ');
                const nombreCompleto = String(nombreOrigen || '').trim().toLowerCase();
                const textoBusqueda = texto.trim().toLowerCase();

                // Buscar si el texto está en el nombre completo
                const coincideNombre = nombreCompleto.includes(textoBusqueda);

                if (coincideNombre) {
                    // Dividir el nombre completo para separar nombres y apellidos
                    const partesNombre = (nombreOrigen || '').trim().split(' ');
                    const nombres = data.nombres || partesNombre[0] || '';
                    const apellidos = data.apellidos || partesNombre.slice(1).join(' ') || '';

                    resultados.push({
                        id: doc.id,
                        usuarioID: doc.id,
                        nombres,
                        apellidos,
                        fotoPerfil: data.fotoPerfil
                    });
                }
            });

            setResults(resultados);
        } catch (error) {
            console.error('Error buscando usuarios:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Buscar personas..."
                    value={query}
                    onChangeText={buscarUsuarios}
                    placeholderTextColor="#999"
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => buscarUsuarios('')}>
                        <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#2F4AA6" />
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.resultItem}
                            onPress={() => {
                                router.push({
                                    pathname: './otherProfile',
                                    params: { userId: item.id }
                                });
                            }}
                        >
                            <ImageButton
                                source={item.fotoPerfil ?
                                    { uri: item.fotoPerfil } :
                                    require("@/assets/images/react-logo.png")
                                }
                                onPress={() => { }}
                                size={50}
                                style={styles.avatar}
                                borderWidth={0}
                            />
                            <View style={styles.textContainer}>
                                <Text style={styles.title}>{item.nombres} {item.apellidos}</Text>
                                <Text style={styles.subtitle}>Ver perfil</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        hasSearched && query.length > 0 ? (
                            <View style={styles.centerContainer}>
                                <Text style={styles.noResults}>No se encontraron resultados para "{query}"</Text>
                            </View>
                        ) : (
                            !hasSearched ? (
                                <View style={styles.centerContainer}>
                                    <Ionicons name="search-outline" size={64} color="#ddd" />
                                    <Text style={styles.placeholderText}>Busca personas por nombre</Text>
                                </View>
                            ) : null
                        )
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 50, // Ajustado para status bar
        paddingHorizontal: 16,
    },
    searchBar: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
        alignItems: 'center',
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        padding: 0,
        fontFamily: 'Montserrat_400Regular',
    },
    listContent: {
        paddingBottom: 20,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    avatar: {
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        color: '#333',
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: 2,
    },
    subtitle: {
        color: '#888',
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50,
    },
    noResults: {
        textAlign: 'center',
        color: '#888',
        fontSize: 16,
        fontFamily: 'Montserrat_400Regular',
    },
    placeholderText: {
        marginTop: 16,
        color: '#999',
        fontSize: 16,
        fontFamily: 'Montserrat_400Regular',
    },
});