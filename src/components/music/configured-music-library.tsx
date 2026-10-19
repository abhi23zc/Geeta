import { AudioSpectrumVisualizer } from "@/components/audio-spectrum-visualizer";
import {
  DawnMeshBackdrop,
  Header,
  Screen,
  TextR,
  useDockHeight,
} from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { useLanguage } from "@/i18n/provider";
import { refreshMusicCatalog } from "@/services/music/catalog";
import { useMusicCatalog, useMusicPlayer } from "@/state/music-player-store";
import type { MusicTrack } from "@/types/music";
import { useLocalSearchParams } from "expo-router";
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
import { useMemo, useState } from "react";
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
import {
  localized,
  sectionItems,
  type MusicDestination,
  type MusicSection,
  type MusicTheme,
} from "../../../shared/music-presentation";
import { libraryStyles as S } from "./library-styles";
import { MusicArtwork } from "./music-artwork";
import { Sacred3DTexture } from "./sacred-3d-texture";
import { SmoothSegmentedTabs } from "./smooth-segmented-tabs";
import { TactilePressable } from "./tactile-pressable";
import { useMusicDestination } from "./use-music-destination";
const icons = {
  gita: BookOpen,
  mantra: Flame,
  raga: Music,
  flute: Wind,
  pranayama: Activity,
  soundscape: Sun,
};
const colors: Record<MusicTheme, string> = {
  gita: "#FFF6EC",
  mantra: "#FFF0E5",
  raga: "#FBEFF5",
  flute: "#EAF7EE",
  pranayama: "#EBF7FA",
  soundscape: "#FCF3DF",
};
const time = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
type Row =
  | { key: string; type: "section"; section: MusicSection }
  | { key: string; type: "heading"; title: string; subtitle?: string }
  | {
      key: string;
      type: "track";
      track: MusicTrack;
      queue: MusicTrack[];
      theme?: MusicTheme;
    };
export function ConfiguredMusicLibrary() {
  const catalog = useMusicCatalog(),
    { page, tracks, playlists } = catalog,
    config = page.presentation;
  const { language, text: t } = useLanguage();
  const player = useMusicPlayer(false),
    go = useMusicDestination(),
    dock = useDockHeight();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [tab, setTab] = useState<"explore" | "favorites" | "recent">("explore"),
    [refreshing, setRefreshing] = useState(false);
  const categories = useMemo(
    () => page.categories.filter((c) => c.visible && !c.archived),
    [page.categories],
  );
  const selectedId = category ?? params.category ?? "all",
    selected = categories.some((c) => c.id === selectedId) ? selectedId : "all";
  const activeTab =
    (tab === "favorites" && !config.tabs.showFavorites) ||
    (tab === "recent" && !config.tabs.showRecent)
      ? "explore"
      : tab;
  const trackMap = useMemo(
    () => new Map(tracks.map((track) => [track.id, track])),
    [tracks],
  );
  const playlistMap = useMemo(
    () => new Map(playlists.map((p) => [p.id, p])),
    [playlists],
  );
  const categoryMap = useMemo(
    () => new Map(page.categories.map((c) => [c.id, c])),
    [page.categories],
  );
  const images = useMemo(
    () => new Map(page.media.map((m) => [m.id, m])),
    [page.media],
  );
  const filtered = useMemo(() => {
    const source =
      activeTab === "favorites"
        ? tracks.filter((track) => player.favorites.has(track.id))
        : activeTab === "recent"
          ? player.recentlyPlayed
          : selected === "all"
            ? tracks
            : tracks.filter((track) => track.category === selected);
    const needle = query.trim().toLocaleLowerCase();
    return source.filter(
      (track) =>
        !needle ||
        [
          track.title,
          track.subtitle,
          track.artist,
          track.raga,
          track.deity,
          ...track.tags,
        ].some((text) => text?.toLocaleLowerCase().includes(needle)),
    );
  }, [
    activeTab,
    selected,
    tracks,
    player.favorites,
    player.recentlyPlayed,
    query,
  ]);
  const editorial =
    activeTab === "explore" && !query.trim() && selected === "all";
  const rows = useMemo((): Row[] => {
    const copy = (value: Parameters<typeof localized>[0]) =>
      localized(value, language);
    if (!editorial) {
      const title =
        activeTab === "favorites"
          ? copy(config.results.favorites)
          : activeTab === "recent"
            ? copy(config.results.recent)
            : selected === "all"
              ? copy(config.results.all)
              : copy(categoryMap.get(selected)!.name);
      return [
        { key: "results", type: "heading", title },
        ...filtered.map((track) => ({
          key: `result-${track.id}`,
          type: "track" as const,
          track,
          queue: filtered,
        })),
      ];
    }
    return config.sections
      .filter((s) => s.visible)
      .flatMap((section): Row[] => {
        if (section.type === "featured" || section.type === "banner")
          return [{ key: section.id, type: "section", section }];
        const ids = sectionItems(page, section);
        if (!ids.length) return [];
        if (section.type === "tracks" && section.layout === "list") {
          const queue = ids.flatMap((id) =>
            trackMap.get(id) ? [trackMap.get(id)!] : [],
          );
          return [
            {
              key: `${section.id}-heading`,
              type: "heading",
              title: copy(section.title),
              subtitle: copy(section.subtitle),
            },
            ...queue.map((track) => ({
              key: `${section.id}-${track.id}`,
              type: "track" as const,
              track,
              queue,
              theme: section.theme,
            })),
          ];
        }
        return [{ key: section.id, type: "section", section }];
      });
  }, [
    editorial,
    activeTab,
    filtered,
    selected,
    config,
    page,
    trackMap,
    categoryMap,
    language,
  ]);
  const copy = (value: Parameters<typeof localized>[0]) =>
    localized(value, language);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshMusicCatalog(true);
    } finally {
      setRefreshing(false);
    }
  };
  const navigate = (destination: MusicDestination) => {
    if (destination.type === "category") {
      setCategory(destination.id);
      setTab("explore");
      setQuery("");
    } else void go(destination).catch(() => undefined);
  };
  // Keep the established Sacred Library design; configuration supplies content and order.
  const tint = (theme: MusicTheme) =>
    theme === "gita" ? undefined : { backgroundColor: colors[theme] };
  const heading = (title: string, subtitle?: string) => (
    <View style={S.tracksHeaderRow}>
      <View style={{ flex: 1 }}>
        <TextR serif style={S.sectionHeading}>
          {title}
        </TextR>
        {!!subtitle && <TextR style={S.playlistSubtitle}>{subtitle}</TextR>}
      </View>
    </View>
  );
  const trackCard = (
    track: MusicTrack,
    queue: MusicTrack[],
    compact = false,
    theme?: MusicTheme,
  ) => {
    const current = player.currentTrack?.id === track.id,
      favorite = player.favorites.has(track.id),
      playable = track.availability === "available";
    const cat = categoryMap.get(track.category);
    return (
      <View style={S.trackCardWrap}>
        <TactilePressable
          accessibilityRole="button"
          accessibilityLabel={`${track.title}, ${playable ? t("Play") : t("Coming soon")}`}
          accessibilityState={{ disabled: !playable }}
          disabled={!playable}
          onPress={() => {
            void player
              .activateTrack(track, queue)
              .then(player.openFullPlayer)
              .catch(() => undefined);
          }}
          style={[
            S.trackCard,
            compact && styles.collection,
            theme && tint(theme),
            current && S.trackCardActive,
            !playable && { opacity: 0.75 },
          ]}
        >
          <View style={compact ? styles.compactImage : S.trackThumbWrap}>
            <MusicArtwork
              uri={track.artworkThumbnail ?? track.artworkUrl}
              alt={track.artworkAlt}
              category={track.categoryTheme ?? track.category}
              style={S.trackThumb}
            />
            {current && (
              <View style={S.activeThumbOverlay}>
                {player.isPlaying ? (
                  <AudioSpectrumVisualizer isPlaying barCount={3} height={12} />
                ) : (
                  <Pause size={14} color="white" />
                )}
              </View>
            )}
          </View>
          <View style={S.trackInfoCol}>
            <TextR
              style={[
                S.trackItemTitle,
                current && { color: C.primary, fontWeight: "800" },
              ]}
              numberOfLines={compact ? 2 : 1}
            >
              {track.title}
            </TextR>
            <View style={S.trackMetaRow}>
              {cat && (
                <View style={S.categoryBadgeWrap}>
                  <TextR style={S.categoryBadgeText}>{copy(cat.name)}</TextR>
                </View>
              )}
              <TextR style={S.trackItemArtist} numberOfLines={1}>
                {track.subtitle || track.artist}
              </TextR>
            </View>
          </View>
          <View style={S.trackActionCol}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(
                favorite ? "Remove from favorites" : "Add to favorites",
              )}
              onPress={(e) => {
                e.stopPropagation();
                player.toggleFavorite(track.id);
              }}
              hitSlop={10}
              style={S.trackFavBtn}
            >
              <Heart
                size={18}
                color={favorite ? C.saffron : "#B8A495"}
                fill={favorite ? C.saffron : "transparent"}
              />
            </Pressable>
            <TextR style={S.trackDurationText}>
              {playable ? time(track.durationMs) : t("Coming soon")}
            </TextR>
          </View>
        </TactilePressable>
      </View>
    );
  };
  const renderSection = (section: MusicSection) => {
    if (section.type === "featured" || section.type === "banner") {
      const target = section.target,
        track = target.type === "track" ? trackMap.get(target.id) : undefined,
        playlist =
          target.type === "playlist" ? playlistMap.get(target.id) : undefined;
      const cat = track ? categoryMap.get(track.category) : undefined,
        image = images.get(section.imageId ?? "");
      const disabled =
        target.type === "track"
          ? !track || track.availability !== "available"
          : target.type === "playlist" && target.play
            ? !playlist ||
              !playlist.trackIds.some(
                (id) => trackMap.get(id)?.availability === "available",
              )
            : false;
      const favorite = !!track && player.favorites.has(track.id),
        current =
          !!track && player.currentTrack?.id === track.id && player.isPlaying;
      return (
        <View style={[S.heroCard, tint(section.theme)]}>
          <Sacred3DTexture
            tintColor={
              section.theme === "gita" ? "#FEE4C3" : colors[section.theme]
            }
          />
          <View style={S.heroTopRow}>
            <View style={[S.heroBadgeGroup, { flex: 1 }]}>
              <View style={S.heroIconCircle}>
                <Flame size={15} color={C.saffron} fill={C.saffron} />
              </View>
              <TextR style={[S.heroBadgeText, { flexShrink: 1 }]}>
                {copy(section.title)}
              </TextR>
            </View>
            {track && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  favorite ? "Remove from favorites" : "Add to favorites",
                )}
                onPress={() => player.toggleFavorite(track.id)}
                hitSlop={10}
                style={[S.heroFavBtn, favorite && S.heroFavBtnActive]}
              >
                <Heart
                  size={17}
                  color={favorite ? C.saffron : C.muted}
                  fill={favorite ? C.saffron : "transparent"}
                />
              </Pressable>
            )}
          </View>
          {section.type === "banner" && image && (
            <MusicArtwork
              uri={image.banner}
              alt={copy(image.alt)}
              category={section.theme}
              style={styles.bannerArt}
            />
          )}
          <View style={S.heroMainRow}>
            <View style={S.heroTrackMetaCol}>
              {section.type === "featured" && (
                <TextR serif style={S.heroTitle}>
                  {track?.title ?? playlist?.title}
                </TextR>
              )}
              <TextR style={S.heroSubtitle}>
                {copy(section.subtitle) ||
                  track?.subtitle ||
                  playlist?.subtitle}
              </TextR>
              {cat && (
                <View style={S.heroTagsRow}>
                  <View style={S.heroTagPill}>
                    <BookOpen size={11} color={C.primary} />
                    <TextR style={S.heroTagText}>{copy(cat.name)}</TextR>
                  </View>
                </View>
              )}
            </View>
            {section.type === "featured" && (
              <View style={S.heroMedallionWrap}>
                <View style={S.heroMedallionHalo} pointerEvents="none" />
                <View style={S.heroMedallionBorder}>
                  <MusicArtwork
                    uri={
                      image?.square ??
                      track?.artworkUrl ??
                      (playlist?.coverImage
                        ? String(playlist.coverImage)
                        : undefined)
                    }
                    alt={image ? copy(image.alt) : track?.artworkAlt}
                    category={section.theme}
                    style={S.heroMedallionArt}
                    iconSize={26}
                  />
                </View>
              </View>
            )}
          </View>
          <View style={S.heroFooter}>
            <TactilePressable
              accessibilityRole="button"
              disabled={!!disabled}
              accessibilityState={{ disabled: !!disabled }}
              style={[S.heroPlayBtn, disabled && { opacity: 0.5 }]}
              onPress={() => navigate(section.target)}
            >
              {current ? (
                <AudioSpectrumVisualizer isPlaying barCount={3} height={12} />
              ) : (
                <Play
                  size={16}
                  color="white"
                  fill="white"
                  style={{ marginLeft: 2 }}
                />
              )}
              <TextR style={S.heroPlayText}>
                {disabled
                  ? t("Coming soon")
                  : current
                    ? t("Now Playing")
                    : copy(section.button)}
              </TextR>
            </TactilePressable>
            {!!track?.durationMs && (
              <View style={S.heroDurationPill}>
                <Clock size={12} color={C.muted} />
                <TextR style={S.heroDuration}>{time(track.durationMs)}</TextR>
              </View>
            )}
          </View>
        </View>
      );
    }
    const ids = sectionItems(page, section),
      queue = ids.flatMap((id) =>
        trackMap.get(id) ? [trackMap.get(id)!] : [],
      );
    const items = ids.map((id) => {
      if (section.type === "tracks") {
        const track = trackMap.get(id);
        return track ? (
          <View key={id}>{trackCard(track, queue, true, section.theme)}</View>
        ) : null;
      }
      if (section.type === "categories") {
        const cat = categoryMap.get(id);
        if (!cat) return null;
        const image = images.get(cat.imageId ?? "");
        return (
          <TactilePressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: selected === id }}
            style={[
              section.layout === "chips" ? S.categoryPill : S.playlistCard,
              tint(section.theme),
              selected === id && S.categoryPillActive,
            ]}
            onPress={() => setCategory(id)}
          >
            {section.layout === "cards" && (
              <View style={S.playlistImageWrap}>
                <MusicArtwork
                  uri={image?.thumbnail}
                  alt={image ? copy(image.alt) : undefined}
                  category={cat.theme}
                  style={S.playlistImg}
                />
              </View>
            )}
            <View
              style={
                section.layout === "cards"
                  ? [S.playlistTextCol, styles.line]
                  : styles.line
              }
            >
              {selected === id && <View style={styles.activeDot} />}
              <TextR
                style={[
                  S.categoryPillText,
                  selected === id && S.categoryPillTextActive,
                ]}
              >
                {copy(cat.name)}
              </TextR>
            </View>
          </TactilePressable>
        );
      }
      const playlist = playlistMap.get(id);
      if (!playlist) return null;
      const availableCount = playlist.trackIds.filter(
        (trackId) => trackMap.get(trackId)?.availability === "available",
      ).length;
      const availabilityLabel = `${availableCount} ${t("available")}\n${playlist.trackIds.length - availableCount} ${t("Coming soon")}`;
      const artworkTheme =
        playlist.trackIds
          .map((key) => trackMap.get(key)?.categoryTheme)
          .find(Boolean) ?? section.theme;
      return (
        <TactilePressable
          key={id}
          accessibilityRole="button"
          style={[
            section.layout === "list" ? S.trackCard : S.playlistCard,
            tint(section.theme),
          ]}
          onPress={() => navigate({ type: "playlist", id })}
        >
          <View
            style={
              section.layout === "list" ? S.trackThumbWrap : S.playlistImageWrap
            }
          >
            <MusicArtwork
              uri={
                playlist.coverThumbnail ??
                (playlist.coverImage ? String(playlist.coverImage) : undefined)
              }
              category={artworkTheme}
              style={S.playlistImg}
              iconSize={32}
            />
            {section.layout === "cards" && (
              <>
                <View style={S.playlistBadgePill}>
                  <TextR style={S.playlistBadgeText}>{availabilityLabel}</TextR>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t("Play")} ${playlist.title}`}
                  accessibilityState={{ disabled: !availableCount }}
                  disabled={!availableCount}
                  onPress={(event) => {
                    event.stopPropagation();
                    navigate({ type: "playlist", id, play: true });
                  }}
                  style={[
                    S.playlistPlayOverlay,
                    !availableCount && { opacity: 0.4 },
                  ]}
                >
                  <Play size={14} color="white" fill="white" />
                </Pressable>
              </>
            )}
          </View>
          <View
            style={
              section.layout === "list" ? S.trackInfoCol : S.playlistTextCol
            }
          >
            <TextR serif style={S.playlistTitle} numberOfLines={2}>
              {playlist.title}
            </TextR>
            <TextR style={S.playlistSubtitle} numberOfLines={2}>
              {playlist.subtitle}
            </TextR>
          </View>
        </TactilePressable>
      );
    });
    const chips = section.type === "categories" && section.layout === "chips";
    return (
      <View
        style={
          section.type === "categories"
            ? S.categoriesSection
            : S.playlistsSection
        }
      >
        {heading(copy(section.title), copy(section.subtitle))}
        {section.layout === "list" ? (
          items
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={chips ? S.categoryScroll : S.playlistScroll}
          >
            {chips && (
              <TactilePressable
                accessibilityRole="tab"
                accessibilityState={{ selected: selected === "all" }}
                onPress={() => setCategory("all")}
                style={[
                  S.categoryPill,
                  selected === "all" && S.categoryPillActive,
                ]}
              >
                {selected === "all" && <View style={styles.activeDot} />}
                <TextR
                  style={[
                    S.categoryPillText,
                    selected === "all" && S.categoryPillTextActive,
                  ]}
                >
                  {t("All Sacred")}
                </TextR>
              </TactilePressable>
            )}
            {items}
          </ScrollView>
        )}
      </View>
    );
  };
  const HeaderIcon = icons[config.header.icon];
  return (
    <Screen scroll={false} contentStyle={S.screenContent}>
      <DawnMeshBackdrop />
      {config.header.visible && (
        <Header
          logo={
            config.header.icon === "gita" ? undefined : (
              <HeaderIcon size={28} color={C.saffron} />
            )
          }
          title={copy(config.header.title)}
          eyebrow={copy(config.header.subtitle)}
          showActions={false}
          rightAction={
            <TactilePressable
              style={S.headerRefreshBtn}
              accessibilityRole="button"
              accessibilityLabel={t("Refresh music catalog")}
              onPress={() => {
                void refresh();
              }}
              hitSlop={8}
            >
              <RotateCw size={17} color={C.primary} strokeWidth={2.4} />
            </TactilePressable>
          }
        />
      )}
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          S.listContent,
          {
            paddingBottom: Math.max(
              dock + insets.bottom + (player.currentTrack ? 88 : 20) + 24,
              180,
            ),
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void refresh();
            }}
            tintColor={C.saffron}
            colors={[C.saffron, C.gold]}
          />
        }
        ListHeaderComponent={
          <View style={S.headerArea}>
            {!!player.persistenceError && (
              <View style={S.alertBanner} accessibilityRole="alert">
                <TextR style={S.alertText}>
                  {language === "hi"
                    ? "सुनने की प्रगति या पसंद सहेजी नहीं जा सकी।"
                    : "Listening progress or favorites could not be saved."}
                </TextR>
              </View>
            )}
            {!!(catalog.error || player.error) && (
              <View style={S.alertBanner} accessibilityRole="alert">
                <Flame size={14} color={C.primary} />
                <TextR style={S.alertText}>
                  {catalog.error
                    ? `${t("Music catalog unavailable")} · ${catalog.error}`
                    : t(player.error ?? "")}
                </TextR>
              </View>
            )}
            {config.search.visible && (
              <View style={S.searchBarWrap}>
                <View style={S.searchIconCircle}>
                  <Search size={18} color="#6E5545" strokeWidth={2.2} />
                </View>
                <TextInput
                  accessibilityLabel={copy(config.search.placeholder)}
                  placeholder={copy(config.search.placeholder)}
                  placeholderTextColor="#9A8374"
                  value={query}
                  onChangeText={setQuery}
                  style={S.searchInput}
                  clearButtonMode="while-editing"
                />
                {!!query && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("Clear search")}
                    onPress={() => setQuery("")}
                    hitSlop={10}
                    style={S.clearBtn}
                  >
                    <X size={15} color={C.muted} />
                  </Pressable>
                )}
              </View>
            )}
            <SmoothSegmentedTabs
              tabs={[
                {
                  id: "explore" as const,
                  label: copy(config.tabs.explore),
                  icon: Compass,
                },
                ...(config.tabs.showFavorites
                  ? [
                      {
                        id: "favorites" as const,
                        label: copy(config.tabs.favorites),
                        icon: Heart,
                        badgeCount: player.favorites.size,
                      },
                    ]
                  : []),
                ...(config.tabs.showRecent
                  ? [
                      {
                        id: "recent" as const,
                        label: copy(config.tabs.recent),
                        icon: Clock,
                      },
                    ]
                  : []),
              ]}
              activeTab={activeTab}
              onSelectTab={setTab}
            />
            {selected !== "all" && (
              <TactilePressable
                accessibilityRole="button"
                onPress={() => setCategory("all")}
                style={S.categoryPill}
              >
                <TextR>← {copy(config.results.all)}</TextR>
              </TactilePressable>
            )}
            {!editorial && !filtered.length && (
              <View style={S.emptyState}>
                <View style={S.emptyIconCircle}>
                  <Music size={30} color={C.saffron} />
                </View>
                <TextR serif style={S.emptyTitle}>
                  {copy(config.results.empty)}
                </TextR>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) =>
          item.type === "heading"
            ? heading(item.title, item.subtitle)
            : item.type === "track"
              ? trackCard(item.track, item.queue, false, item.theme)
              : renderSection(item.section)
        }
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  line: { flexDirection: "row", alignItems: "center", gap: 7 },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 2,
  },
  collection: { width: 180, flexDirection: "column", alignItems: "stretch" },
  compactImage: {
    width: "100%",
    height: 120,
    borderRadius: 15,
    overflow: "hidden",
  },
  bannerArt: { width: "100%", height: 150, borderRadius: 16, marginBottom: 12 },
});
