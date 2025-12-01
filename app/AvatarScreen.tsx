import React, { useContext } from "react";
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AuthContext } from "@/contexts/AuthContext";
import { ThemeContext } from "@/contexts/ThemeContext";
import { API_BASE_URL } from "@/config/apiConfig";

export default function AvatarScreen() {
  const router = useRouter();
  const { user: authUser, updateUser } = useContext(AuthContext);
  const { darkMode } = useContext(ThemeContext);

  const avatarOptions = [
    {
      id: "avatar1",
      source: require("../assets/images/avatar/avatar1.png"),
    },
    {
      id: "avatar2",
      source: require("../assets/images/avatar/avatar2.png"),
    },
    {
      id: "avatar3",
      source: require("../assets/images/avatar/avatar3.png"),
    },
    {
      id: "avatar4",
      source: require("../assets/images/avatar/avatar4.png"),
    },
    {
      id: "avatar5",
      source: require("../assets/images/avatar/avatar5.png"),
    },
    {
      id: "avatar6",
      source: require("../assets/images/avatar/avatar6.png"),
    },
    {
      id: "avatar7",
      source: require("../assets/images/avatar/avatar7.png"),
    },
    {
      id: "avatar8",
      source: require("../assets/images/avatar/avatar8.png"),
    },
  ];

  const handleAvatarSelect = async (avatarId: string) => {
    try {
      await updateUser({ profilePicture: avatarId });
      Alert.alert("Success", "Avatar updated successfully!");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to update avatar");
    }
  };

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.darkContainer]}>
      <Text style={[styles.title, darkMode && styles.darkText]}>
        Please Choose Your Avatar
      </Text>
      <ScrollView contentContainerStyle={styles.grid}>
        {avatarOptions.map((avatar) => {
          const isSelected = authUser?.profilePicture === avatar.id;
          return (
            <TouchableOpacity
              key={avatar.id}
              onPress={() => handleAvatarSelect(avatar.id)}
              style={[styles.avatarBox, isSelected && styles.selectedBorder]}
            >
              <Image
                source={avatar.source}
                // source={{ uri: "https://picsum.photos/200" }}
                style={styles.avatarImage}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  darkContainer: {
    backgroundColor: "#121212",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 40,
    color: "#000",
  },
  darkText: {
    color: "#fff",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  avatarBox: {
    width: "47%",
    aspectRatio: 1,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f3f3",
  },
  avatarImage: {
    width: "80%",
    height: "80%",
    resizeMode: "contain",
    borderRadius: 100,
  },
  selectedBorder: {
    borderWidth: 2,
    borderColor: "#4A90E2",
    backgroundColor: "#eaf4ff",
  },
});
