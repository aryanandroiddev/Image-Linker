import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";

interface ImageItem {
  id: string;
  fileSize: number;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const { data: images = [] } = useQuery<ImageItem[]>({
    queryKey: ["/api/images"],
  });

  const totalSize = images.reduce((acc, img) => acc + (img.fileSize || 0), 0);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace("/login");
          } catch (e) {
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 + 12 : insets.top + 12 },
        ]}
      >
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          <Text style={styles.username}>@{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.createdAt && (
            <Text style={styles.joined}>Joined {formatDate(user.createdAt)}</Text>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{images.length}</Text>
            <Text style={styles.statLabel}>Images</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{images.length}</Text>
            <Text style={styles.statLabel}>Links</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{formatBytes(totalSize)}</Text>
            <Text style={styles.statLabel}>Storage</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.menuCard}>
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: "#F9FAFB" }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert("About PixelDrop", "PixelDrop lets you upload images and share them with anyone via a private link. Only people with the link can view your images.\n\nVersion 1.0.0");
              }}
            >
              <View style={[styles.menuIconBox, { backgroundColor: "rgba(14,165,233,0.08)" }]}>
                <Ionicons name="information-circle-outline" size={20} color="#0EA5E9" />
              </View>
              <Text style={styles.menuText}>About</Text>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: "#F9FAFB" }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert("Privacy", "Your images are only accessible via their unique share links. No one else can see your gallery or shared images without the direct link.");
              }}
            >
              <View style={[styles.menuIconBox, { backgroundColor: "rgba(16,185,129,0.08)" }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
              </View>
              <Text style={styles.menuText}>Privacy</Text>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#1A1D26",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  username: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#1A1D26",
  },
  email: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    marginTop: 4,
  },
  joined: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statNumber: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#0EA5E9",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#6B7280",
    marginTop: 4,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#1A1D26",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 66,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#EF4444",
  },
});
