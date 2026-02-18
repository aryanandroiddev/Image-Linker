import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { getApiUrl, apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 3;
const NUM_COLUMNS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

interface ImageItem {
  id: string;
  title: string;
  filename: string;
  shareToken: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

function ImageTile({ item, onLongPress }: { item: ImageItem; onLongPress: () => void }) {
  const baseUrl = getApiUrl();
  const imageUrl = `${baseUrl}uploads/${item.filename}`;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
          pathname: "/image-detail",
          params: { id: item.id, token: item.shareToken },
        });
      }}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress();
      }}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.tileImage}
        contentFit="cover"
        transition={200}
      />
    </Pressable>
  );
}

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: images = [], isLoading } = useQuery<ImageItem[]>({
    queryKey: ["/api/images"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/images/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/images"] });
    setRefreshing(false);
  }, []);

  function handleLongPress(item: ImageItem) {
    const protocol = Platform.OS === "web" ? window.location.protocol : "https:";
    const host = Platform.OS === "web" ? window.location.host : process.env.EXPO_PUBLIC_DOMAIN?.replace(":5000", "") || "";
    const shareUrl = `${protocol}//${host}/api/share/${item.shareToken}`;

    Alert.alert(item.title, "What would you like to do?", [
      {
        text: "Copy Share Link",
        onPress: async () => {
          await Clipboard.setStringAsync(shareUrl);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Copied!", "Share link copied to clipboard");
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert("Delete Image", "Are you sure you want to delete this image?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => deleteMutation.mutate(item.id),
            },
          ]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function renderEmpty() {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={64} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>No images yet</Text>
        <Text style={styles.emptyText}>Upload your first image to get started</Text>
        <Pressable
          style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.85 }]}
          onPress={() => router.push("/(tabs)/upload")}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Upload Image</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 + 12 : insets.top + 12 },
        ]}
      >
        <Text style={styles.headerTitle}>Gallery</Text>
        <Text style={styles.headerCount}>
          {images.length} {images.length === 1 ? "image" : "images"}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0EA5E9" />
        </View>
      ) : (
        <FlatList
          data={images}
          numColumns={NUM_COLUMNS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ImageTile item={item} onLongPress={() => handleLongPress(item)} />
          )}
          contentContainerStyle={[
            styles.gridContent,
            images.length === 0 && styles.emptyGrid,
          ]}
          columnWrapperStyle={images.length > 0 ? styles.columnWrapper : undefined}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />
          }
          showsVerticalScrollIndicator={false}
          scrollEnabled={images.length > 0}
        />
      )}
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
  headerCount: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridContent: {
    padding: GRID_GAP,
  },
  emptyGrid: {
    flex: 1,
  },
  columnWrapper: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 4,
    overflow: "hidden",
  },
  tileImage: {
    width: "100%",
    height: "100%",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0EA5E9",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
