import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert utility
 * Uses Alert.alert on mobile and window.confirm on web
 */
export const showAlert = (
    title: string,
    message?: string,
    buttons?: Array<{
        text: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
    }>
) => {
    if (Platform.OS === 'web') {
        // En web, usar window.confirm
        const confirmMessage = message ? `${title}\n\n${message}` : title;

        if (buttons && buttons.length > 1) {
            // Si hay botones de confirmación/cancelación
            const result = window.confirm(confirmMessage);

            if (result) {
                // Usuario presionó OK - ejecutar el botón que no es "cancel"
                const confirmButton = buttons.find(b => b.style !== 'cancel');
                if (confirmButton?.onPress) {
                    confirmButton.onPress();
                }
            } else {
                // Usuario presionó Cancel
                const cancelButton = buttons.find(b => b.style === 'cancel');
                if (cancelButton?.onPress) {
                    cancelButton.onPress();
                }
            }
        } else {
            // Solo un botón de OK
            window.alert(confirmMessage);
            if (buttons?.[0]?.onPress) {
                buttons[0].onPress();
            }
        }
    } else {
        // En móvil, usar Alert.alert nativo
        Alert.alert(title, message, buttons as any);
    }
};
