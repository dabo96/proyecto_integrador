import React from "react";
import { Pressable, Image, StyleSheet, ViewStyle, ImageStyle } from "react-native";

type ImageButtonProps = {
  onPress: () => void;
  source: any;
  size?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
};

export default function ImageButton({
  onPress,
  source,
  size = 50,
  borderRadius,
  borderWidth = 0,
  borderColor = "transparent",
  style,
  imageStyle,
}: ImageButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { opacity: pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Image
        source={source}
        style={[
          { 
            width: size,
            height: size,
            borderRadius: size/2,
            borderWidth,
            borderColor,
          },
          imageStyle,
        ]}
      />
    </Pressable>
  );
}
