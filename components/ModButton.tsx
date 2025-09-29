import React from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome, AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons"

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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        style,
        pressed && pressedStyle,
      ]}
    >
      {({ pressed }) => (
        <View style={styles.content}>
          {iconName && iconPosition === "left" && renderIcon(pressed && pressedTextColor ? pressedTextColor : textColor)}
          <Text
            style={[
              {
                color: pressed && pressedTextColor ? pressedTextColor : textColor,
                fontWeight: fontWeight,
                fontFamily: 'Montserrat_400Regular',
                fontSize: 16,
              },
              styles.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconName && iconPosition === "right" && renderIcon(pressed && pressedTextColor ? pressedTextColor : textColor)}
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
});