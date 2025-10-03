// useCollapsibleHeader.ts
import { useRef } from "react";
import { Animated } from "react-native";

type Config = {
  maxHeight?: number;
  minHeight?: number;
  avatarMax?: number;
  avatarMin?: number;
};

const useCollapsibleHeader = (config: Config = {}) => {
  const { maxHeight = 320, minHeight = 100, avatarMax = 160, avatarMin = 56 } = config;
  const scrollY = useRef(new Animated.Value(0)).current;
  const delta = maxHeight - minHeight;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, delta],
    outputRange: [maxHeight, minHeight],
    extrapolate: "clamp",
  });

  const avatarSize = scrollY.interpolate({
    inputRange: [0, delta],
    outputRange: [avatarMax, avatarMin],
    extrapolate: "clamp",
  });

  const expandedOpacity = scrollY.interpolate({
    inputRange: [0, delta * 0.5],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const collapsedOpacity = scrollY.interpolate({
    inputRange: [delta * 0.35, delta],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false } // height/layout anims need false
  );

  return {
    scrollY,
    onScroll,
    headerHeight,
    avatarSize,
    expandedOpacity,
    collapsedOpacity,
    maxHeight,
    minHeight,
  };
}

export default useCollapsibleHeader;