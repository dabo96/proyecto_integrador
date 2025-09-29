import React from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { Ionicons, MaterialIcons, FontAwesome, AntDesign, Feather, FontAwesome6 } from "@expo/vector-icons"

type IconLibrary = "Ionicons" | "MaterialIcons" | "FontAwesome" | "FontAwesome6" | "AntDesign" | "Feather";

type IconButtonProps = {
  onPress: () => void;
  iconName: string;
  iconLib?: IconLibrary;
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
};

export default function IconButton({
  onPress,
  iconName,
  iconLib = "Ionicons",
  size = 24,
  color = "#fff",
  backgroundColor = "#6200ee",
  style,
}: IconButtonProps) {
  const renderIcon = () => {  
      switch (iconLib) {
        case "MaterialIcons":
          return <MaterialIcons name={iconName as any} size={size} color={color} />
        case "FontAwesome":
          return <FontAwesome name={iconName as any} size={size} color={color} />;
        case "FontAwesome6":
          return <FontAwesome6 name={iconName as any} size={size} color={color} />;
        case "AntDesign":
          return <AntDesign name={iconName as any} size={size} color={color} />;
        case "Feather":
          return <Feather name={iconName as any} size={size} color={color} />;
        default:
          return <Ionicons name={iconName as any} size={size} color={color} />;
      }
  };
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: pressed ? 0.6 : 1 },
        style,
      ]}
    >
      {renderIcon()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 5,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
});
