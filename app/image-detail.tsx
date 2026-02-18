import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { getApiUrl, apiRequest, queryClient } from "@/lib/query-client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ImageItem {
  id: string;
  title: string;
  filename: string;
  shareToken: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export default function ImageDetailScreen() {
  const { id, token } = useLocalSearchParams<{ id: string; token: string }>();

  const { data: images = [] } = useQuery<ImageItem[]>({
    queryKey: ["/api/images"],
  });

  const image = images.find((img) => img.id === id || img.shareToken === token);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (image) {
        await apiRequest("DELETE", `/api/images/${image.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      router.back();
    },
  });

  if (!image) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="image-outline" size={48} color="#D1D5DB" />
        <Text style={styles.notFoundText}>Image not found</Text>
      </View>
    );
  }

  const baseUrl = getApiUrl();
  const imageUrl = `${baseUrl}uploads/${image.filename}`;
  const shareLink = `${baseUrl}api/share/${image.shareToken}`;

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
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function copyLink() {
    await Clipboard.setStringAsync(shareLink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied!", "Share link copied to clipboard");
  }

  function handleDelete() {
    Alert.alert("Delete Image", "This action cannot be undone. Delete this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.title}>{image.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.metaText}>{formatDate(image.createdAt)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="document-outline" size={16} color="#6B7280" />
            <Text style={styles.metaText}>{formatBytes(image.fileSize)}</Text>
          </View>
        </View>

        <View style={styles.linkSection}>
          <Text style={styles.linkLabel}>Share Link</Text>
          <View style={styles.linkBox}>
            <Text style={styles.linkText} numberOfLines={2}>{shareLink}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, styles.copyAction, pressed && { opacity: 0.85 }]}
            onPress={copyLink}
          >
            <Ionicons name="copy-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonTextLight}>Copy Link</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, styles.deleteAction, pressed && { opacity: 0.85 }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.actionButtonTextDanger}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  scrollContent: { paddingBottom: 40 },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FB",
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#6B7280",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: "#1A1D26",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#1A1D26",
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
  },
  linkSection: { marginBottom: 20 },
  linkLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7280",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  linkBox: {
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  linkText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#0369A1",
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  copyAction: {
    backgroundColor: "#0EA5E9",
  },
  deleteAction: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  actionButtonTextLight: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  actionButtonTextDanger: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#EF4444",
  },
});
