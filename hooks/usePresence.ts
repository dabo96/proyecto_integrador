import { actualizarEstadoOffline, actualizarEstadoOnline } from '@/api/usuariosService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Hook para manejar el estado de presencia del usuario
 * Actualiza el estado online/offline automáticamente y mantiene un heartbeat
 */
export const usePresence = () => {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const userIdRef = useRef<string | null>(null);

  // Intervalo de heartbeat: actualiza el estado cada 5 segundos para detección más rápida
  const HEARTBEAT_INTERVAL = 5000; // 5 segundos

  useEffect(() => {
    let mounted = true;

    const initializePresence = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('usuarioID');
        if (!storedUserId || !mounted) return;

        userIdRef.current = storedUserId;

        // Marcar como online al iniciar (actualización inmediata)
        try {
          await actualizarEstadoOnline(storedUserId);
          console.log('✅ Estado online inicializado para:', storedUserId);
        } catch (error) {
          console.error('❌ Error inicializando estado online:', error);
        }

        // Configurar heartbeat para mantener el estado actualizado
        // Ejecutar inmediatamente y luego cada intervalo
        const executeHeartbeat = async () => {
          if (userIdRef.current && appStateRef.current === 'active' && mounted) {
            try {
              await actualizarEstadoOnline(userIdRef.current);
              console.log('💓 Heartbeat: estado online actualizado para:', userIdRef.current);
            } catch (error) {
              console.error('❌ Error en heartbeat:', error);
            }
          }
        };

        // Ejecutar inmediatamente
        executeHeartbeat();

        // Configurar intervalo
        heartbeatIntervalRef.current = setInterval(executeHeartbeat, HEARTBEAT_INTERVAL);

        // Listener para cambios de estado de la app
        const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
          const previousAppState = appStateRef.current;
          appStateRef.current = nextAppState;

          if (!userIdRef.current || !mounted) return;

          // Cuando la app pasa a background o inactive
          if (
            previousAppState === 'active' &&
            (nextAppState === 'background' || nextAppState === 'inactive')
          ) {
            // Detener el heartbeat
            if (heartbeatIntervalRef.current) {
              clearInterval(heartbeatIntervalRef.current);
              heartbeatIntervalRef.current = null;
            }
            
            try {
              await actualizarEstadoOffline(userIdRef.current);
              console.log('📴 App en background: estado offline');
            } catch (error) {
              console.error('❌ Error actualizando estado offline:', error);
            }
          }

          // Cuando la app vuelve a estar activa
          if (
            (previousAppState === 'background' || previousAppState === 'inactive') &&
            nextAppState === 'active'
          ) {
            try {
              await actualizarEstadoOnline(userIdRef.current);
              console.log('📱 App activa: estado online');
              
              // Reiniciar heartbeat si no está activo
              if (!heartbeatIntervalRef.current && mounted) {
                heartbeatIntervalRef.current = setInterval(async () => {
                  if (userIdRef.current && appStateRef.current === 'active' && mounted) {
                    try {
                      await actualizarEstadoOnline(userIdRef.current);
                      console.log('💓 Heartbeat: estado online actualizado');
                    } catch (error) {
                      console.error('❌ Error en heartbeat:', error);
                    }
                  }
                }, HEARTBEAT_INTERVAL);
              }
            } catch (error) {
              console.error('❌ Error actualizando estado online:', error);
            }
          }
        });

        return () => {
          subscription.remove();
        };
      } catch (error) {
        console.error('❌ Error inicializando presencia:', error);
      }
    };

    const cleanup = initializePresence();

    // Cleanup cuando el componente se desmonta
    return () => {
      mounted = false;

      // Limpiar intervalo de heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Marcar como offline al desmontar
      if (userIdRef.current) {
        actualizarEstadoOffline(userIdRef.current).catch(error => {
          console.error('❌ Error actualizando estado offline en cleanup:', error);
        });
      }

      cleanup.then(removeListener => {
        if (removeListener) {
          removeListener();
        }
      });
    };
  }, []);
};

