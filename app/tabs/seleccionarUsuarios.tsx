import { getOrCreateGroupChat } from '@/api/messageService';
import { escucharEstadoUsuario, obtenerTodosLosUsuarios, obtenerUsuarioActual, Usuario } from '@/api/usuariosService';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SeleccionarUsuarios = () => {
    const router = useRouter();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [loading, setLoading] = useState(true);
    const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<Set<string>>(new Set());
    const [creandoChat, setCreandoChat] = useState(false);
    const [onlineStatus, setOnlineStatus] = useState<{ [userId: string]: boolean }>({});

    useEffect(() => {
        cargarUsuarios();
    }, []);

    useEffect(() => {
        filtrarUsuarios();
    }, [busqueda, usuarios]);

    // Escuchar estados de conexión de los usuarios
    useEffect(() => {
        if (usuariosFiltrados.length === 0) return;

        const unsubscribes: (() => void)[] = [];
        const userIds = usuariosFiltrados.map(u => u.id);
        
        console.log("👂 Configurando listeners de estado para usuarios seleccionados:", userIds);
        
        usuariosFiltrados.forEach(usuario => {
            const unsubscribe = escucharEstadoUsuario(usuario.id, (online) => {
                console.log(`📡 Estado actualizado para ${usuario.id}:`, online ? "en línea" : "desactivado");
                setOnlineStatus(prev => ({
                    ...prev,
                    [usuario.id]: online
                }));
            });
            unsubscribes.push(unsubscribe);
        });

        return () => {
            console.log("🧹 Limpiando listeners de estado de usuarios seleccionados");
            unsubscribes.forEach(unsub => unsub());
        };
    }, [usuariosFiltrados]);

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

    const toggleSeleccionUsuario = (usuarioId: string) => {
        const nuevosSeleccionados = new Set(usuariosSeleccionados);
        if (nuevosSeleccionados.has(usuarioId)) {
            nuevosSeleccionados.delete(usuarioId);
        } else {
            nuevosSeleccionados.add(usuarioId);
        }
        setUsuariosSeleccionados(nuevosSeleccionados);
    };

    const crearChatGrupal = async () => {
        if (usuariosSeleccionados.size === 0) {
            Alert.alert('Error', 'Selecciona al menos un usuario para crear un chat');
            return;
        }

        try {
            setCreandoChat(true);
            const usuarioActual = await obtenerUsuarioActual();
            
            if (!usuarioActual) {
                Alert.alert('Error', 'No se pudo obtener el usuario actual');
                return;
            }

            // Incluir al usuario actual en los participantes
            const participantIds = [usuarioActual.id, ...Array.from(usuariosSeleccionados)];
            
            // Crear el chat grupal
            const chatId = await getOrCreateGroupChat(participantIds);
            
            // Navegar al chat grupal
            router.push({
                pathname: './chatDetails',
                params: {
                    chatId: chatId,
                    isGroup: 'true',
                }
            });
        } catch (error) {
            console.error('Error al crear chat grupal:', error);
            Alert.alert('Error', 'No se pudo crear el chat grupal');
        } finally {
            setCreandoChat(false);
        }
    };

    const seleccionarUsuarioIndividual = (usuario: Usuario) => {
        // Si hay usuarios seleccionados, agregar a la selección
        // Si no hay selección, crear chat individual directamente
        if (usuariosSeleccionados.size > 0) {
            toggleSeleccionUsuario(usuario.id);
        } else {
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
        }
    };

    const renderUsuario = ({ item }: { item: Usuario }) => {
        const estaSeleccionado = usuariosSeleccionados.has(item.id);
        const isOnline = onlineStatus[item.id] ?? false;
        
        return (
            <TouchableOpacity
                style={[
                    styles.usuarioItem,
                    estaSeleccionado && styles.usuarioItemSeleccionado
                ]}
                onPress={() => seleccionarUsuarioIndividual(item)}
            >
                <View style={styles.avatarWrapper}>
                    <View style={styles.avatarContainer}>
                        {item.fotoPerfil ? (
                            <Image
                                source={{ uri: item.fotoPerfil }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Text style={styles.avatarText}>
                                {(item.nombreCompleto || item.nombre || 'U')
                                    .charAt(0)
                                    .toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <View style={[
                        styles.onlineDot,
                        isOnline ? styles.onlineDotActive : styles.onlineDotInactive
                    ]} />
                </View>
                <View style={styles.usuarioInfo}>
                    <View style={styles.usuarioNombreRow}>
                        <Text style={styles.usuarioNombre}>
                          {(() => {
                            const nombreFuente = item.nombreCompleto || item.nombre || '';
                            const partes = nombreFuente.trim().split(' ').filter(p => p.length > 0);
                            const primerNombre = partes[0] || '';
                            const primerApellido = partes.length > 1 ? partes[1] : '';
                            return primerApellido ? `${primerNombre} ${primerApellido}`.trim() : primerNombre;
                          })()}
                        </Text>
                    </View>
                    <Text style={styles.usuarioCodigo}>{item.codigoUniversitario || item.codigo}</Text>
                    <Text style={styles.usuarioCarrera}>{item.carrera}</Text>
                </View>
                {estaSeleccionado ? (
                    <View style={styles.checkboxSeleccionado}>
                        <Text style={styles.checkboxText}>✓</Text>
                    </View>
                ) : (
                    <View style={styles.checkbox}>
                        <Text style={styles.checkboxText}>○</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.titulo}>
                    {usuariosSeleccionados.size > 0 
                        ? `Seleccionados: ${usuariosSeleccionados.size}` 
                        : 'Nuevo Chat'}
                </Text>
                {usuariosSeleccionados.size > 0 && (
                    <TouchableOpacity 
                        onPress={crearChatGrupal} 
                        style={styles.crearButton}
                        disabled={creandoChat}
                    >
                        <Text style={styles.crearButtonText}>
                            {creandoChat ? '...' : 'Crear'}
                        </Text>
                    </TouchableOpacity>
                )}
                {usuariosSeleccionados.size === 0 && <View style={styles.placeholder} />}
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
    avatarWrapper: {
        position: 'relative',
        marginRight: 12,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#0491C6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: '#fff',
    },
    onlineDotActive: {
        backgroundColor: '#22c55e',
    },
    onlineDotInactive: {
        backgroundColor: '#ef4444',
    },
    usuarioInfo: {
        flex: 1,
    },
    usuarioNombreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    usuarioNombre: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginRight: 8,
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
    usuarioItemSeleccionado: {
        backgroundColor: '#E3F2FD',
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#0491C6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSeleccionado: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#0491C6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    crearButton: {
        backgroundColor: '#0491C6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    crearButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
