import React from "react";
import { View, Text, Image, Animated, StyleSheet } from "react-native";

type Props = {
  user: {
    name: string;
    image: string;
  };
  scrollY: Animated.Value;
};

const CollapsibleHeader: React.FC<Props> = ({ user, scrollY }) => {
  const HEADER_MAX_HEIGHT = 200;
  const HEADER_MIN_HEIGHT = 80;
  const AVATAR_MAX_SIZE = 100;
  const AVATAR_MIN_SIZE = 50;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: "clamp",
  });

  const avatarSize = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [AVATAR_MAX_SIZE, AVATAR_MIN_SIZE],
    extrapolate: "clamp",
  });

  const nameFontSize = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [22, 16],
    extrapolate: "clamp",
  });

  return (
    <Animated.View style={[styles.header, { height: headerHeight }]}>
      <Animated.Image
        source={{ uri: user.image }}
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: Animated.divide(avatarSize, 2),
          },
        ]}
      />
      <Animated.Text style={[styles.name, { fontSize: nameFontSize }]}>
        {user.name}
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#2F4AA6",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  avatar: {
    borderWidth: 3,
    borderColor: "white",
    marginBottom: 8,
  },
  name: {
    color: "white",
    fontWeight: "bold",
  },
});

export default CollapsibleHeader;
