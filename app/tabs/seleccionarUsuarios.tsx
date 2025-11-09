import { obtenerTodosLosUsuarios, obtenerUsuarioActual, Usuario } from '@/api/usuariosService';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SeleccionarUsuarios = () => {
    const router = useRouter();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarUsuarios();
    }, []);

    useEffect(() => {
        filtrarUsuarios();
    }, [busqueda, usuarios]);

    const cargarUsuarios = async () => {
        try {
            setLoading(true);
            const usuarioActual = await obtenerUsuarioActual();
            const todosLosUsuarios = await obtenerTodosLosUsuarios();

            const usuariosFiltrados = usuarioActual
                ? todosLosUsuarios.filter(u => u.id !== usuarioActual.id)
                : todosLosUsuarios;

            setUsuarios(usuariosFiltrados);
            setUsuariosFiltrados(usuariosFiltrados);
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            Alert.alert('Error', 'No se pudieron cargar los usuarios');
        } finally {
            setLoading(false);
        }
    };

    const filtrarUsuarios = () => {
        if (!busqueda.trim()) {
            setUsuariosFiltrados(usuarios);
            return;
        }

        const terminoBusqueda = busqueda.toLowerCase().trim();
        const filtrados = usuarios.filter(usuario => {
            const nombreFuente = usuario.nombreCompleto || usuario.nombre || '';
            const codigoFuente = usuario.codigoUniversitario || usuario.codigo;
            const nombreMatch = nombreFuente?.toLowerCase().includes(terminoBusqueda);
            const codigoMatch = codigoFuente?.toLowerCase().includes(terminoBusqueda);
            return nombreMatch || codigoMatch;
        });

        setUsuariosFiltrados(filtrados);
    };

    const seleccionarUsuario = (usuario: Usuario) => {
        // Navegar a los detalles del chat con toda la información del usuario
        router.push({
            pathname: './chatDetails',
            params: {
                userId: usuario.id,
                name: usuario.nombreCompleto || usuario.nombre,
                codigo: usuario.codigoUniversitario || usuario.codigo,
                carrera: usuario.carrera,
                correo: usuario.correo,
            }
        });
    };

    const renderUsuario = ({ item }: { item: Usuario }) => (
        <TouchableOpacity
            style={styles.usuarioItem}
            onPress={() => seleccionarUsuario(item)}
        >
            <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                    {(item.nombreCompleto || item.nombre || 'U')
                        .charAt(0)
                        .toUpperCase()}
                </Text>
            </View>
            <View style={styles.usuarioInfo}>
                <Text style={styles.usuarioNombre}>{item.nombreCompleto || item.nombre}</Text>
                <Text style={styles.usuarioCodigo}>{item.codigoUniversitario || item.codigo}</Text>
                <Text style={styles.usuarioCarrera}>{item.carrera}</Text>
            </View>
            <TouchableOpacity style={styles.chatButton}>
                <Text style={styles.chatButtonText}>📩</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.titulo}>Nuevo Chat</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre o código..."
                    placeholderTextColor="#999"
                    value={busqueda}
                    onChangeText={setBusqueda}
                    autoCapitalize="none"
                />
                <Text style={styles.searchIcon}>🔍</Text>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.loadingText}>Cargando usuarios...</Text>
                </View>
            ) : usuariosFiltrados.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>
                        {busqueda ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={usuariosFiltrados}
                    renderItem={renderUsuario}
                    keyExtractor={(item) => item.id}
                    style={styles.lista}
                />
            )}
        </SafeAreaView>
    );
};

export default SeleccionarUsuarios;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 24,
        color: '#000',
    },
    titulo: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    placeholder: {
        width: 40,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 25,
        paddingHorizontal: 16,
        height: 50,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
    },
    searchIcon: {
        fontSize: 20,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    lista: {
        flex: 1,
    },
    usuarioItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#0491C6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    usuarioInfo: {
        flex: 1,
    },
    usuarioNombre: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    usuarioCodigo: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    usuarioCarrera: {
        fontSize: 12,
        color: '#999',
    },
    chatButton: {
        paddingHorizontal: 12,
    },
    chatButtonText: {
        fontSize: 24,
    },
});
