import { AntDesign, Feather, FontAwesome, Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

type IconLibrary = "Ionicons" | "MaterialIcons" | "FontAwesome" | "AntDesign" | "Feather" | "MaterialCommunityIcons";

type ModButtonProps = {
  title: string;
  onPress: () => void;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  iconName?: string;
  iconLib?: IconLibrary;
  iconPosition?: 'left' | 'right';
  pressedStyle?: ViewStyle;
  pressedTextColor?: string;
  disabled?: boolean;
};

export default function ModButton({
  title,
  onPress,
  backgroundColor = '#007BFF',
  textColor = '#FFFFFF',
  style,
  textStyle,
  fontWeight = 'normal',
  iconName,
  iconLib = "Ionicons",
  iconPosition = 'left',
  pressedStyle,
  pressedTextColor,
  disabled = false,
}: ModButtonProps) {

  const renderIcon = (color: string) => {
    if (!iconName) return null;
    const size = 20;

    switch (iconLib) {
      case "MaterialIcons":
        return <MaterialIcons name={iconName as any} size={size} color={color} style={styles.icon} />
      case "FontAwesome":
        return <FontAwesome name={iconName as any} size={size} color={color} style={styles.icon} />;
      case "MaterialCommunityIcons":
        return <MaterialCommunityIcons name={iconName as any} size={size} color={color} style={styles.icon} />;
      case "AntDesign":
        return <AntDesign name={iconName as any} size={size} color={color} style={styles.icon} />;
      case "Feather":
        return <Feather name={iconName as any} size={size} color={color} style={styles.icon} />;
      default:
        return <Ionicons name={iconName as any} size={size} color={color} style={styles.icon} />;
    }
  };

  // Estado para manejar el estado pressed en web
  const [pressed, setPressed] = React.useState(false);

  // En web, usar TouchableOpacity para mejor compatibilidad
  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[
          styles.button,
          styles.webButton,
          { backgroundColor },
          style,
          disabled && styles.disabledButton,
          pressed && !disabled && pressedStyle,
        ]}
      >
        <View style={styles.content}>
          {iconName && iconPosition === "left" && renderIcon(pressed && !disabled && pressedTextColor ? pressedTextColor : textColor)}
          <Text
            style={[
              {
                color: pressed && !disabled && pressedTextColor ? pressedTextColor : textColor,
                fontWeight: fontWeight,
                fontFamily: 'Montserrat_400Regular',
                fontSize: 16,
                opacity: disabled ? 0.7 : 1,
              },
              styles.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconName && iconPosition === "right" && renderIcon(pressed && !disabled && pressedTextColor ? pressedTextColor : textColor)}
        </View>
      </TouchableOpacity>
    );
  }

  // En móvil, usar Pressable
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        style,
        disabled && styles.disabledButton,
        pressed && !disabled && pressedStyle,
      ]}
    >
      {({ pressed }) => (
        <View style={styles.content}>
          {iconName && iconPosition === "left" && renderIcon(pressed && !disabled && pressedTextColor ? pressedTextColor : textColor)}
          <Text
            style={[
              {
                color: pressed && !disabled && pressedTextColor ? pressedTextColor : textColor,
                fontWeight: fontWeight,
                fontFamily: 'Montserrat_400Regular',
                fontSize: 16,
                opacity: disabled ? 0.7 : 1,
              },
              styles.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconName && iconPosition === "right" && renderIcon(pressed && !disabled && pressedTextColor ? pressedTextColor : textColor)}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  webButton: {
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    // @ts-ignore - Propiedades web específicas
    transition: 'opacity 0.2s ease-in-out',
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
  },
  icon: {
    marginHorizontal: 6,
  },
  disabledButton: {
    opacity: 0.8,
    cursor: 'not-allowed',
  },
});