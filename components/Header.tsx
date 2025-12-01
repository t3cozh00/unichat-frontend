import React, { useContext } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/contexts/AuthContext";

const AVATAR_IMAGES: Record<string, any> = {
  avatar1: require("../assets/images/avatar/avatar1.png"),
  avatar2: require("../assets/images/avatar/avatar2.png"),
  avatar3: require("../assets/images/avatar/avatar3.png"),
  avatar4: require("../assets/images/avatar/avatar4.png"),
  avatar5: require("../assets/images/avatar/avatar5.png"),
  avatar6: require("../assets/images/avatar/avatar6.png"),
  avatar7: require("../assets/images/avatar/avatar7.png"),
  avatar8: require("../assets/images/avatar/avatar8.png"),
  defaultAvatar: require("../assets/images/avatar/1.jpeg"),
};

interface HeaderProps {
  username: string;
  avatar: any;
  darkMode?: boolean;
  hasUnreadNotifications?: boolean;
}

export default function Header({ username, avatar, darkMode }: HeaderProps) {
  const router = useRouter();
  const { user: authUser } = useContext(AuthContext);

  const getAvatarSource = () => {
    // 1) if avatar is a string and matches an avatar ID
    if (typeof avatar === "string" && AVATAR_IMAGES[avatar]) {
      return AVATAR_IMAGES[avatar];
    }

    // 2) otherwise use the current logged-in user's profilePicture (avatar1/2/...)
    const key = authUser?.profilePicture;

    if (key && typeof key === "string" && AVATAR_IMAGES[key]) {
      return AVATAR_IMAGES[key];
    }

    // 3) if avatar is already an image source
    if (avatar && typeof avatar !== "string") {
      return avatar;
    }

    return AVATAR_IMAGES["defaultAvatar"];
  };

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={styles.userInfo}>
        <Image source={getAvatarSource()} style={styles.avatar} />
        <Text style={[styles.username, darkMode && styles.darkText]}>
          Welcome, {username}
        </Text>
      </View>
      {/* <TouchableOpacity
        style={[styles.iconButton, darkMode && styles.darkIconButton]}
        onPress={handleNotificationPress}
      >
        {hasUnreadNotifications && <View style={styles.notificationBadge} />}
        <MaterialIcons name="notifications" size={24} color="#4A90E2" />
      </TouchableOpacity> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  darkContainer: {
    backgroundColor: "#121212",
    borderBottomColor: "#333",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  iconButton: {
    padding: 10,
    marginLeft: 10,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    position: "relative",
  },
  darkIconButton: {
    backgroundColor: "#333",
  },

  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
    zIndex: 1,
  },
  darkText: {
    color: "#fff",
  },
});
