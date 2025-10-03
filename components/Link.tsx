import React from "react";
import { Text, Pressable, StyleSheet, TextStyle } from "react-native";

type LinkProps = {
  title: string;
  onPress: () => void;
  color?: string;
  textStyle?: TextStyle;
};

export default function Link({
  title,
  onPress,
  color = "#6200ee",
  textStyle,
}: LinkProps) {
  return (
    <Pressable onPress={onPress}>
      <Text style={[styles.link, { color }, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    fontSize: 16,
    textDecorationLine: "underline",
  },
});
