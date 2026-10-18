import { ConfiguredMusicLibrary } from "@/components/music/configured-music-library";
import { libraryStyles as styles } from "@/components/music/library-styles";
import { useRouter } from "expo-router";
import {
  Activity,
  BookOpen,
  Clock,
  Compass,
  Flame,
  Heart,
  Music,
  Pause,
  Play,
  RotateCw,
  Search,
  Sun,
  Wind,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { AudioSpectrumVisualizer } from "@/components/audio-spectrum-visualizer";
import { MusicArtwork } from "@/components/music/music-artwork";
import { TactilePressable } from "@/components/music/tactile-pressable";
import { SmoothSegmentedTabs } from "@/components/music/smooth-segmented-tabs";
import { Sacred3DTexture } from "@/components/music/sacred-3d-texture";
import {
  DawnMeshBackdrop,
  Header,
  Screen,
  TextR,
  useDockHeight,
} from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { SACRED_CATEGORIES, unavailableMusicTrack } from "@/data/music-catalog";
import { useLanguage } from "@/i18n/provider";
import { refreshMusicCatalog } from "@/services/music/catalog";
import { useMusicCatalog, useMusicPlayer } from "@/state/music-player-store";
import type { MusicCategory, MusicTrack } from "@/types/music";


function formatTrackDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function BundledLibraryLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dockHeight = useDockHeight();

  const {
    tracks: SACRED_TRACKS,
    playlists: SACRED_PLAYLISTS,
    error: catalogError,
  } = useMusicCatalog();
  const { text: translateText, language } = useLanguage();
  const {
    currentTrack,
    error: playerError,
    isPlaying,
    playTrack,
    togglePlayPause,
    openFullPlayer,
    favorites,
    recentlyPlayed,
    toggleFavorite,
    isFavorite,
  } = useMusicPlayer(false);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<
    MusicCategory | "all"
  >("all");
  const [librarySection, setLibrarySection] = useState<
    "explore" | "favorites" | "recent"
  >("explore");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMusicCatalog(true);
    } finally {
      setRefreshing(false);
    }
  };

  // Featured track (Gita 10-20 or first available track)
  const featuredTrack = useMemo(
    () =>
      SACRED_TRACKS.find((t) => t.availability === "available") ||
      SACRED_TRACKS[0],
    [SACRED_TRACKS],
  );

  // Filtered tracks based on search, category, and section
  const displayedTracks = useMemo(() => {
    let list: MusicTrack[] = [];

    if (librarySection === "favorites") {
      list = [...favorites].map(
        (id) =>
          SACRED_TRACKS.find((t) => t.id === id) ?? unavailableMusicTrack(id),
      );
    } else if (librarySection === "recent") {
      list = recentlyPlayed;
    } else {
      list =
        selectedCategory === "all"
          ? SACRED_TRACKS
          : SACRED_TRACKS.filter((t) => t.category === selectedCategory);
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query) ||
        (t.subtitle && t.subtitle.toLowerCase().includes(query)) ||
        (t.raga && t.raga.toLowerCase().includes(query)) ||
        (t.deity && t.deity.toLowerCase().includes(query)) ||
        t.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [
    SACRED_TRACKS,
    favorites,
    librarySection,
    recentlyPlayed,
    searchQuery,
    selectedCategory,
  ]);

  const handleTrackPress = (track: MusicTrack) => {
    if (track.availability !== "available") return;
    if (currentTrack?.id === track.id) {
      if (!isPlaying) {
        togglePlayPause();
      }
      openFullPlayer();
    } else {
      void playTrack(track, displayedTracks);
    }
  };

  const isFeaturedCurrent = currentTrack?.id === featuredTrack?.id;
  const isFeaturedFav = featuredTrack ? isFavorite(featuredTrack.id) : false;

  // Total bottom clearance accounting for floating mini-player and bottom navigation dock
  const bottomClearance = Math.max(
    dockHeight + insets.bottom + (currentTrack ? 88 : 20) + 24,
    180,
  );

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      {/* Background Dawn Glow */}
      <DawnMeshBackdrop />

      {/* Header with Diya and Tactile Refresh icon button */}
      <Header
        eyebrow={translateText("SACRED AUDIO & CHANTS")}
        title={translateText("Sacred Library")}
        showActions={false}
        rightAction={
          <TactilePressable
            accessibilityRole="button"
            accessibilityLabel={translateText("Refresh music catalog")}
            onPress={onRefresh}
            hitSlop={8}
            style={styles.headerRefreshBtn}
          >
            <RotateCw size={17} color={C.primary} strokeWidth={2.4} />
          </TactilePressable>
        }
      />

      {/* Main Track List with Embedded Header Components */}
      <FlatList
        data={displayedTracks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomClearance },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.saffron}
            colors={[C.saffron, C.gold]}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerArea}>
            {/* Catalog or Player Error Banner */}
            {!!catalogError && (
              <View style={styles.alertBanner} accessibilityRole="alert">
                <Flame size={14} color={C.primary} />
                <TextR style={styles.alertText}>
                  {translateText("Music catalog unavailable")} · {catalogError}
                </TextR>
              </View>
            )}
            {!!playerError && (
              <View style={styles.alertBanner} accessibilityRole="alert">
                <Flame size={14} color={C.primary} />
                <TextR style={styles.alertText}>
                  {translateText(playerError)}
                </TextR>
              </View>
            )}

            {/* Illuminated Glass Search Bar */}
            <View style={styles.searchBarWrap}>
              <View style={styles.searchIconCircle}>
                <Search size={18} color={C.saffron} strokeWidth={2.4} />
              </View>
              <TextInput
                accessibilityLabel={translateText(
                  "Search ragas, mantras, shlokas, deities...",
                )}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={translateText(
                  "Search ragas, mantras, shlokas, deities...",
                )}
                placeholderTextColor={C.mutedSoft}
                style={styles.searchInput}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={translateText("Clear search")}
                  onPress={() => setSearchQuery("")}
                  hitSlop={10}
                  style={styles.clearBtn}
                >
                  <X size={15} color={C.muted} strokeWidth={2.2} />
                </Pressable>
              )}
            </View>

            {/* 3D Tactile Section Segmented Switcher (Explore / Favorites / Recent) */}
            <SmoothSegmentedTabs
              tabs={[
                { id: "explore" as const, label: translateText("Explore"), icon: Compass },
                { id: "favorites" as const, label: translateText("Favorites"), icon: Heart, badgeCount: favorites.size },
                { id: "recent" as const, label: translateText("Recent"), icon: Clock },
              ]}
              activeTab={librarySection}
              onSelectTab={setLibrarySection}
            />

            {/* In Explore mode with no query: Hero card, categories, and playlists */}
            {librarySection === "explore" && !searchQuery.trim() && (
              <>
                {/* 🪷 Devotional Featured Hero Card matching Home & Today theme */}
                {featuredTrack && (
                  <View style={styles.heroCard}>
                    {/* Sacred 3D Parchment & Sunbeam Texture */}
                    <Sacred3DTexture tintColor="#FEE4C3" />

                    {/* Top Header Row with Sacred Badge & Favorite Button */}
                    <View style={styles.heroTopRow}>
                      <View style={styles.heroBadgeGroup}>
                        <View style={styles.heroIconCircle}>
                          <Flame size={15} color={C.saffron} fill={C.saffron} />
                        </View>
                        <TextR style={styles.heroBadgeText}>
                          {translateText("DAILY DIVINE MEDITATION")}
                        </TextR>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={translateText(
                          isFeaturedFav
                            ? "Remove from favorites"
                            : "Add to favorites",
                        )}
                        onPress={() => toggleFavorite(featuredTrack.id)}
                        hitSlop={10}
                        style={({ pressed }) => [
                          styles.heroFavBtn,
                          isFeaturedFav && styles.heroFavBtnActive,
                          pressed && {
                            opacity: 0.8,
                            transform: [{ scale: 0.94 }],
                          },
                        ]}
                      >
                        <Heart
                          size={17}
                          color={isFeaturedFav ? C.saffron : C.muted}
                          fill={isFeaturedFav ? C.saffron : "transparent"}
                          strokeWidth={2.2}
                        />
                      </Pressable>
                    </View>

                    {/* Body Content Row: Track Metadata + Circular Sacred Medallion Art */}
                    <View style={styles.heroMainRow}>
                      <View style={styles.heroTrackMetaCol}>
                        <TextR serif style={styles.heroTitle}>
                          {featuredTrack.title}
                        </TextR>
                        <TextR style={styles.heroSubtitle}>
                          {featuredTrack.subtitle ||
                            featuredTrack.artist ||
                            translateText(
                              "Spoken Hindi narration · Divine Wisdom",
                            )}
                        </TextR>

                        <View style={styles.heroTagsRow}>
                          <View style={styles.heroTagPill}>
                            <BookOpen
                              size={11}
                              color={C.primary}
                              strokeWidth={2.2}
                            />
                            <TextR style={styles.heroTagText}>
                              {translateText("Bhagavad Gita")}
                            </TextR>
                          </View>
                          {featuredTrack.raga && (
                            <View style={styles.heroTagPillGold}>
                              <Music
                                size={11}
                                color={C.goldDark}
                                strokeWidth={2.2}
                              />
                              <TextR style={styles.heroTagTextGold}>
                                {featuredTrack.raga}
                              </TextR>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Illuminated Sacred Medallion Thumbnail */}
                      <View style={styles.heroMedallionWrap}>
                        <View
                          style={styles.heroMedallionHalo}
                          pointerEvents="none"
                        />
                        <View style={styles.heroMedallionBorder}>
                          <MusicArtwork
                            uri={featuredTrack.artworkUrl}
                            category={featuredTrack.category}
                            style={styles.heroMedallionArt}
                            iconSize={26}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Controls Footer */}
                    <View style={styles.heroFooter}>
                      <TactilePressable
                        disabled={featuredTrack.availability !== "available"}
                        accessibilityState={{
                          disabled: featuredTrack.availability !== "available",
                        }}
                        onPress={() => handleTrackPress(featuredTrack)}
                        style={styles.heroPlayBtn}
                        accessibilityRole="button"
                        accessibilityLabel={translateText(
                          "Play featured track",
                        )}
                      >
                        {isFeaturedCurrent && isPlaying ? (
                          <>
                            <AudioSpectrumVisualizer
                              isPlaying
                              barCount={3}
                              height={12}
                            />
                            <TextR style={styles.heroPlayText}>
                              {translateText("Now Playing")}
                            </TextR>
                          </>
                        ) : (
                          <>
                            <Play
                              size={16}
                              color="#FFFFFF"
                              fill="#FFFFFF"
                              style={{ marginLeft: 2 }}
                            />
                            <TextR style={styles.heroPlayText}>
                              {translateText("Listen Now")}
                            </TextR>
                          </>
                        )}
                      </TactilePressable>

                      <View style={styles.heroDurationPill}>
                        <Clock size={12} color={C.muted} />
                        <TextR style={styles.heroDuration}>
                          {featuredTrack.availability === "available"
                            ? formatTrackDuration(featuredTrack.durationMs)
                            : translateText("Coming soon")}
                        </TextR>
                      </View>
                    </View>
                  </View>
                )}

                {/* Sacred Categories Pills */}
                <View style={styles.categoriesSection}>
                  <TextR serif style={styles.sectionHeading}>
                    {translateText("Sacred Categories")}
                  </TextR>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                  >
                    <TactilePressable
                      accessibilityRole="tab"
                      accessibilityState={{
                        selected: selectedCategory === "all",
                      }}
                      onPress={() => setSelectedCategory("all")}
                      style={[
                        styles.categoryPill,
                        selectedCategory === "all" && styles.categoryPillActive,
                      ]}
                    >
                      {selectedCategory === "all" && <View style={styles.categoryActiveDot} />}
                      <TextR
                        style={[
                          styles.categoryPillText,
                          selectedCategory === "all" &&
                            styles.categoryPillTextActive,
                        ]}
                      >
                        {translateText("All Sacred")}
                      </TextR>
                    </TactilePressable>

                    {SACRED_CATEGORIES.map((cat) => {
                      const isActive = selectedCategory === cat.id;
                      return (
                        <TactilePressable
                          key={cat.id}
                          accessibilityRole="tab"
                          accessibilityState={{ selected: isActive }}
                          onPress={() => setSelectedCategory(cat.id)}
                          style={[
                            styles.categoryPill,
                            isActive && styles.categoryPillActive,
                          ]}
                        >
                          {isActive && <View style={styles.categoryActiveDot} />}
                          <TextR
                            style={[
                              styles.categoryPillText,
                              isActive && styles.categoryPillTextActive,
                            ]}
                          >
                            {language === "hi" ? cat.hindiTitle : cat.title}
                          </TextR>
                        </TactilePressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Curated Playlists Carousel with Rich Spiritual Artwork */}
                {selectedCategory === "all" && (
                  <View style={styles.playlistsSection}>
                    <View style={styles.playlistsHeadingRow}>
                      <TextR serif style={styles.sectionHeading}>
                        {translateText("Curated Morning Rituals")}
                      </TextR>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.playlistScroll}
                    >
                      {SACRED_PLAYLISTS.map((pl) => (
                        <TactilePressable
                          key={pl.id}
                          onPress={() =>
                            router.push(`/playlist/${pl.id}` as any)
                          }
                          style={styles.playlistCard}
                          accessibilityRole="button"
                          accessibilityLabel={`${pl.title}, ${pl.trackIds.length} tracks`}
                        >
                          {/* Rich Spiritual Artwork Card Cover */}
                          <View style={styles.playlistImageWrap}>
                            <MusicArtwork
                              uri={
                                pl.coverImage
                                  ? String(pl.coverImage)
                                  : undefined
                              }
                              category={
                                pl.id.includes("flute")
                                  ? "flute"
                                  : pl.id.includes("pranayama")
                                    ? "pranayama"
                                    : pl.id.includes("mantra")
                                      ? "mantra"
                                      : pl.id.includes("gita")
                                        ? "gita"
                                        : "soundscape"
                              }
                              style={styles.playlistImg}
                              iconSize={32}
                            />
                            {/* Track count pill */}
                            <View style={styles.playlistBadgePill}>
                              <TextR style={styles.playlistBadgeText}>
                                {pl.trackIds.length} {translateText("Tracks")}
                              </TextR>
                            </View>

                            {/* Floating Play Overlay Badge */}
                            <View style={styles.playlistPlayOverlay}>
                              <Play
                                size={13}
                                color="#FFFFFF"
                                fill="#FFFFFF"
                                style={{ marginLeft: 1 }}
                              />
                            </View>
                          </View>

                          <View style={styles.playlistTextCol}>
                            <TextR
                              serif
                              style={styles.playlistTitle}
                              numberOfLines={1}
                            >
                              {pl.title}
                            </TextR>
                            <TextR
                              style={styles.playlistSubtitle}
                              numberOfLines={2}
                            >
                              {pl.subtitle || pl.description}
                            </TextR>
                          </View>
                        </TactilePressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}

            {/* List Header Section Title */}
            <View style={styles.tracksHeaderRow}>
              <TextR serif style={styles.sectionHeading}>
                {librarySection === "favorites"
                  ? translateText("Favorite Chants")
                  : librarySection === "recent"
                    ? translateText("Recently Listened")
                    : selectedCategory === "all"
                      ? translateText("All Sacred Tracks")
                      : `${
                          language === "hi"
                            ? SACRED_CATEGORIES.find(
                                (c) => c.id === selectedCategory,
                              )?.hindiTitle
                            : SACRED_CATEGORIES.find(
                                (c) => c.id === selectedCategory,
                              )?.title
                        } · ${translateText("Tracks")}`}
              </TextR>
              <View style={styles.trackCountBadge}>
                <TextR style={styles.trackCountText}>
                  {displayedTracks.length}{" "}
                  {displayedTracks.length === 1
                    ? translateText("track")
                    : translateText("tracks")}
                </TextR>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isCurrent = currentTrack?.id === item.id;
          const isFav = isFavorite(item.id);
          const isPlayable = item.availability === "available";

          return (
            <View style={styles.trackCardWrap}>
              <TactilePressable
                disabled={!isPlayable}
                accessibilityState={{ disabled: !isPlayable }}
                onPress={() => handleTrackPress(item)}
                style={[
                  styles.trackCard,
                  isCurrent && styles.trackCardActive,
                  !isPlayable && { opacity: 0.75 },
                ]}
              >
                {/* Thumbnail with Artwork and Live State */}
                <View style={styles.trackThumbWrap}>
                  <MusicArtwork
                    uri={item.artworkUrl}
                    category={item.category}
                    style={styles.trackThumb}
                    iconSize={22}
                  />

                  {isCurrent && (
                    <View style={styles.activeThumbOverlay}>
                      {isPlaying ? (
                        <AudioSpectrumVisualizer
                          isPlaying
                          barCount={3}
                          height={12}
                        />
                      ) : (
                        <Pause size={14} color="#FFFFFF" fill="#FFFFFF" />
                      )}
                    </View>
                  )}
                </View>

                {/* Track Details */}
                <View style={styles.trackInfoCol}>
                  <TextR
                    style={[
                      styles.trackItemTitle,
                      isCurrent && { color: C.primary, fontWeight: "800" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </TextR>

                  <View style={styles.trackMetaRow}>
                    {item.raga ? (
                      <View style={styles.ragaBadgeWrap}>
                        <TextR style={styles.ragaBadgeText}>{item.raga}</TextR>
                      </View>
                    ) : item.category ? (
                      <View style={styles.categoryBadgeWrap}>
                        <TextR style={styles.categoryBadgeText}>
                          {item.category.toUpperCase()}
                        </TextR>
                      </View>
                    ) : null}

                    <TextR style={styles.trackItemArtist} numberOfLines={1}>
                      {item.subtitle ||
                        item.artist ||
                        (isPlayable
                          ? translateText("Sacred Audio")
                          : translateText("Sacred Preview"))}
                    </TextR>
                  </View>
                </View>

                {/* Duration & Heart Favorite Button */}
                <View style={styles.trackActionCol}>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={translateText(
                      isFav ? "Remove from favorites" : "Add to favorites",
                    )}
                    accessibilityState={{ selected: isFav }}
                    hitSlop={10}
                    style={styles.trackFavBtn}
                  >
                    <Heart
                      size={18}
                      color={isFav ? C.saffron : "#B8A495"}
                      fill={isFav ? C.saffron : "transparent"}
                    />
                  </Pressable>

                  <TextR style={styles.trackDurationText}>
                    {isPlayable
                      ? formatTrackDuration(item.durationMs)
                      : translateText("Coming soon")}
                  </TextR>
                </View>
              </TactilePressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Music size={30} color={C.saffron} />
            </View>
            <TextR serif style={styles.emptyTitle}>
              {librarySection === "favorites"
                ? translateText("No favorites yet")
                : librarySection === "recent"
                  ? translateText("No listening history yet")
                  : translateText("No divine chants found")}
            </TextR>
            <TextR style={styles.emptySubtitle}>
              {librarySection === "favorites"
                ? translateText(
                    "Heart any chant or shloka to save it for quick daily reflection.",
                  )
                : translateText(
                    "Explore our sacred morning collection and play divine chants.",
                  )}
            </TextR>
          </View>
        }
      />
    </Screen>
  );
}

// Preserve the established layout as a recovery view if native presentation fails.
class MusicPageBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <BundledLibraryLayout /> : this.props.children;
  }
}
export default function MusicLibraryRoute() {
  const { releaseId } = useMusicCatalog();
  return (
    <MusicPageBoundary key={releaseId}>
      <ConfiguredMusicLibrary />
    </MusicPageBoundary>
  );
}
