import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, View } from "react-native";
import { LucideIcon } from "lucide-react-native";

type IconButtonProps = {
    title: string;
    onPress: () => void;
    icon?: React.ReactNode; // El icono que pasas desde afuera
    backgroundColor?: string;
    textColor?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
    fontWeight?:
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900";
};

export default function IconButton({
    title,
    onPress,
    icon,
    textColor = "#FFFFFF",
    style,
    textStyle,
    fontWeight = "normal",
}: IconButtonProps) {
    
    return (
        <Pressable onPress={onPress} style={{ borderRadius: 8, overflow: 'hidden', ...style }}>
            {({ pressed }) => (
                <LinearGradient
                    colors={pressed ? ['#1F3680', '#037A9E'] : ['#2F4AA6', '#0491C6']}
                    style={{ paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
                >
                    {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
                    <Text
                        style={[
                            {
                                color: textColor,
                                fontWeight: fontWeight,
                                fontFamily: "Montserrat_700Bold",
                                fontSize: 14,
                            },
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                </LinearGradient>
            )}
        </Pressable>
    );
}
