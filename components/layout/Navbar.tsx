import { AntDesign, FontAwesome, FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import IconButton from "../button/IconButton";

const Navbar = () => {
  const router = useRouter();
  return (
      <View style={styles.bottomNav}>
        <IconButton
              title=""
              onPress={() => { router.push('/') }}
              icon={<AntDesign name="home" size={20} color="#666" />}
              backgroundColor="#2563eb"
              variant="transparent"
              style={ styles.navItem }
        />
        <IconButton
              title=""
              onPress={() => { router.push('/community') }}
              icon={<MaterialIcons name="people" size={24} color="#666" />}
              backgroundColor="#2563eb"
              variant="transparent"
              style={ styles.navItem }
        />
        <IconButton
              title=""
              onPress={() => { router.push('/newPost') }}
              icon={<FontAwesome6 name="circle-plus" size={19} color="#666" />}
              backgroundColor="#2563eb"
              variant="transparent"
              style={ styles.navItem }
        />
        <IconButton
              title=""
              onPress={() => { router.push('/') }}
              icon={<MaterialIcons name="search" size={22} color="#666" />}
              backgroundColor="#2563eb"
              variant="transparent"
              style={ styles.navItem }
        />
        <IconButton
              title=""
              onPress={() => { router.push('/contacts') }}
              icon={<FontAwesome name="user-plus" size={18} color="#666" />}
              backgroundColor="#2563eb"
              variant="transparent"
              style={ styles.navItem }
        />
      </View>
  );
};
export default Navbar;

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  navIcon: {
    fontSize: 20,
  },
});