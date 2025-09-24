// CollapsibleUserHeader.tsx
import React from "react";
import { Animated, StyleSheet, View } from "react-native";
import UserHeader from "./UserHeader"; // ajusta la ruta a tu proyecto
import { LinearGradient } from "expo-linear-gradient";
import { Rows } from "lucide-react-native";

type Props = {
  user: any;
  headerHeight: Animated.AnimatedInterpolation<number>;
  avatarSize: Animated.AnimatedInterpolation<number>;
  expandedOpacity: Animated.AnimatedInterpolation<number>;
  collapsedOpacity: Animated.AnimatedInterpolation<number>;
};

const CollapsibleUserHeader: React.FC<Props> = ({
  user,
  headerHeight,
  avatarSize,
  expandedOpacity,
  collapsedOpacity,
}) => {
  return (
    <Animated.View style={[styles.container, { height: headerHeight }]}>
      <LinearGradient colors={["#2F4AA6", "#0491C6"]} style={StyleSheet.absoluteFill} />

      {/* Expanded version: center column (fades out) */}
      <Animated.View style={[styles.expandedWrapper, { opacity: expandedOpacity, flex: 1 }]}>
        <UserHeader
          user={user}
          compact={false}
          avatarStyle={{ width: avatarSize, height: avatarSize, borderRadius: 999 }}
          detailsStyle={{ opacity: expandedOpacity }}
        />
      </Animated.View>


      {/* Collapsed version: row with small avatar + name (fades in) */}
      <Animated.View style={[styles.collapsedWrapper, { opacity: collapsedOpacity }]}>
        <UserHeader
          user={user}
          compact={true}
          avatarStyle={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: 999,
            marginBottom: 0,
          }}
          containerStyle={{ alignItems: "flex-start", paddingHorizontal: 16 }}
          nameStyle={{ fontSize: 18 }}
        />
      </Animated.View>
    </Animated.View>
  );
};

export default CollapsibleUserHeader;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "auto",
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    overflow: "hidden",
  },
  expandedWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: "100%",
  },
  collapsedWrapper: {
    justifyContent: "center",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    // layout row handled by UserHeader via compact prop
  },
});
