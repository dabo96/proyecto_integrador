import React, { useState } from 'react';
import { View, TextInput, StyleSheet, FlatList, Text, TouchableOpacity } from 'react-native';

const mockResults = [
    { id: '1', title: 'Daniel Smith', subtitle: 'Software Engineer at LinkedIn' },
    { id: '2', title: 'Lesly Johnson', subtitle: 'Product Manager at Microsoft' },
    { id: '3', title: 'Jane Doe', subtitle: 'UX Designer at Google' },
];

type ResultItem = { id: string; title: string; subtitle: string };

export default function Busqueda() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ResultItem[]>([]);

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Buscar"
                    value={query}
                    onChangeText={()=>{}}
                />
            </View>
            <FlatList
                data={results}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.resultItem}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.subtitle}>{item.subtitle}</Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    query.length > 0 ? (
                        <Text style={styles.noResults}>No se encontraron resultados</Text>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 40,
        paddingHorizontal: 16,
    },
    searchBar: {
        flexDirection: 'row',
        backgroundColor: '#eef3f8',
        borderRadius: 8,
        padding: 8,
        marginBottom: 16,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: 16,
        backgroundColor: 'transparent',
        padding: 0,
        fontFamily: 'Montserrat_400Regular',
    },
    resultItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    subtitle: {
        color: '#555',
        fontSize: 14,
    },
    noResults: {
        textAlign: 'center',
        color: '#888',
        marginTop: 20,
    },
});