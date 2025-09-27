import { Pressable, Text, TextStyle, ViewStyle } from 'react-native';

type ModButtonProps = {
  title: string;
  onPress: () => void;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
};

export default function ModButton({
  title,
  onPress,
  backgroundColor = '#007BFF',
  textColor = '#FFFFFF',
  style,
  textStyle,
  fontWeight = 'normal',
}: ModButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? '#0056b3' : backgroundColor,
          padding: 10,
          borderRadius: 5,
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text style={[{ color: textColor, fontWeight: fontWeight, fontFamily: 'Montserrat_400Regular', fontSize: 16, }, textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
}