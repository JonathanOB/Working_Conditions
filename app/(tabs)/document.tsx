import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, useColorScheme,
  ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useFleet } from '../../hooks/useFleet';
import { FleetBadge } from '../../components/FleetBadge';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import WebView from 'react-native-webview';
import { BookOpen, X, ChevronRight, ExternalLink, FileText } from 'lucide-react-native';

const WB_BOOKMARKS = [
  { label: 'Cover & Agreement', page: 1 },
  { label: 'Section 1 — Definitions', page: 4 },
  { label: '2.2 Consecutive Duties', page: 7 },
  { label: '2.5 Days Off & Free Time', page: 8 },
  { label: '2.5.15 Coefficients', page: 10 },
  { label: '2.9 Extended Duties', page: 17 },
  { label: '2.12 Flight Preparation', page: 19 },
  { label: '2.13 Intercontinental Landings', page: 19 },
  { label: '2.15 Max FDP (Intercontinental)', page: 20 },
  { label: '2.21 Standby Duties', page: 23 },
  { label: '2.22 Rest Periods', page: 24 },
  { label: '2.23 North/South Duties', page: 25 },
  { label: '2.27 Stick Time', page: 26 },
  { label: 'Section 3 — Operating', page: 28 },
  { label: '3.7 Delayed Flights (Intercontinental)', page: 35 },
  { label: '3.10 Max FDP (Delays)', page: 36 },
  { label: '3.13 Minimum Rest Periods', page: 37 },
  { label: '3.14 OWC Compensation', page: 38 },
  { label: '3.16 Standby Duty', page: 38 },
  { label: 'Signatures', page: 41 },
];

const A320_BOOKMARKS = [
  { label: 'Cover', page: 1 },
  { label: 'Section 1 — Definitions', page: 3 },
  { label: '2.2 Consecutive Duties', page: 7 },
  { label: '2.4 Days Off', page: 7 },
  { label: '2.7 Flight Preparation', page: 9 },
  { label: '2.9 Landings', page: 10 },
  { label: '2.10 Length of Duty Day (FDP)', page: 10 },
  { label: '2.11 Extended Duties', page: 11 },
  { label: '2.14 Night Flight Duties', page: 14 },
  { label: '2.16 Standby Duties', page: 15 },
  { label: '2.17 Rest Periods', page: 16 },
  { label: '2.20 Through-the-Night', page: 19 },
  { label: '2.23 5/3 Flex Roster', page: 20 },
  { label: 'Section 3 — Operating', page: 21 },
  { label: '3.3 Days Off (Operating)', page: 24 },
  { label: '3.4 Delayed Flights', page: 25 },
  { label: '3.11 Max Flight Duty Time', page: 27 },
  { label: '3.14 Minimum Rest Periods', page: 28 },
  { label: '3.17 Standby at Home Base', page: 29 },
  { label: '3.18 Through-the-Night', page: 32 },
  { label: 'Appendix A — 5/3 Rules', page: 32 },
];

export default function DocumentScreen() {
  const { page: pageParam, clause: clauseParam } = useLocalSearchParams<{ page?: string; clause?: string }>();

  const isDark = useColorScheme() === 'dark';
  const fleet = useFleet();

  // Cached file path — populated by pre-loader, ready before user presses Open
  const [cachedFilePath, setCachedFilePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const [currentClause, setCurrentClause] = useState<string | null>(null);

  // Deep link pending until file is ready
  const [pendingDeepLink, setPendingDeepLink] = useState<{ page: number; clause: string | null } | null>(null);

  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const bg = isDark ? '#0A1628' : '#F7F8FA';
  const card = isDark ? '#0F1E35' : '#FFFFFF';
  const border = isDark ? '#1E3A5F' : '#E2E4EA';
  const text = isDark ? '#F1F5F9' : '#0A1628';
  const sub = isDark ? '#64748B' : '#94A3B8';

  const bookmarks = fleet === 'wb' ? WB_BOOKMARKS : A320_BOOKMARKS;
  const docLabel = fleet === 'wb'
    ? 'WC 2025 — Widebody (A330)'
    : 'WC May 2018 — A320/321/(Neo)';
  const totalPages = fleet === 'wb' ? 41 : 37;
  const fleetColor = fleet === 'wb' ? '#1E3A5F' : '#0E4B5A';
  const fleetIconColor = fleet === 'wb' ? '#93C5FD' : '#67E8F9';

  const cacheFileName = fleet === 'wb' ? 'wb_wc_2025.pdf' : 'a320_wc_2018.pdf';

  // Derive WebView URI — append #page=N for page navigation (works on Android;
  // on iOS WKWebView also honours this fragment for local PDFs via PDFKit)
  const viewerUri = cachedFilePath
    ? (currentPage ? `${cachedFilePath}#page=${currentPage}` : cachedFilePath)
    : null;

  // Pre-load PDF file into cache as soon as the screen mounts / fleet changes.
  // By the time the user taps "Open Document" the file copy is already done.
  useEffect(() => {
    let cancelled = false;
    setCachedFilePath(null);

    async function preload() {
      try {
        const module = fleet === 'wb'
          ? require('../../assets/docs/330.pdf')
          : require('../../assets/docs/320.pdf');
        const asset = Asset.fromModule(module);
        await asset.downloadAsync();
        if (cancelled || !asset.localUri) return;

        const dest = (FileSystem.cacheDirectory ?? '') + cacheFileName;
        const info = await FileSystem.getInfoAsync(dest);
        if (!info.exists) {
          await FileSystem.copyAsync({ from: asset.localUri, to: dest });
        }
        if (!cancelled && isMounted.current) setCachedFilePath(dest);
      } catch {
        // Pre-load failed — will fall back to on-demand load
      }
    }
    preload();
    return () => { cancelled = true; };
  }, [fleet]);

  // When page param arrives (deep-link from rule detail), open viewer
  useEffect(() => {
    if (!pageParam) return;
    const raw = Array.isArray(pageParam) ? pageParam[0] : pageParam;
    const n = parseInt(raw ?? '', 10);
    if (isNaN(n)) return;
    const raw2 = Array.isArray(clauseParam) ? clauseParam[0] : clauseParam;
    const clause = raw2 ?? null;

    if (cachedFilePath) {
      setCurrentPage(n);
      setCurrentClause(clause);
      setWebViewLoading(true);
      setViewerVisible(true);
    } else {
      // File not ready yet — store as pending
      setPendingDeepLink({ page: n, clause });
    }
  }, [pageParam, clauseParam]);

  // When file becomes ready, process any pending deep link
  useEffect(() => {
    if (cachedFilePath && pendingDeepLink) {
      setCurrentPage(pendingDeepLink.page);
      setCurrentClause(pendingDeepLink.clause);
      setWebViewLoading(true);
      setViewerVisible(true);
      setPendingDeepLink(null);
    }
  }, [cachedFilePath, pendingDeepLink]);

  function openViewer(page?: number) {
    if (cachedFilePath) {
      setCurrentPage(page ?? null);
      setCurrentClause(null);
      setWebViewLoading(true);
      setViewerVisible(true);
      return;
    }
    // On-demand fallback (file wasn't pre-loaded yet)
    setLoading(true);
    const module = fleet === 'wb'
      ? require('../../assets/docs/330.pdf')
      : require('../../assets/docs/320.pdf');
    const asset = Asset.fromModule(module);
    asset.downloadAsync().then(async () => {
      if (!asset.localUri) { setLoading(false); return; }
      const dest = (FileSystem.cacheDirectory ?? '') + cacheFileName;
      await FileSystem.copyAsync({ from: asset.localUri, to: dest });
      if (isMounted.current) {
        setCachedFilePath(dest);
        setCurrentPage(page ?? null);
        setCurrentClause(null);
        setWebViewLoading(true);
        setViewerVisible(true);
      }
    }).catch(e => {
      Alert.alert('Error', `Could not load PDF: ${String(e)}`);
    }).finally(() => { if (isMounted.current) setLoading(false); });
  }

  async function shareDocument() {
    let filePath = cachedFilePath;
    if (!filePath) {
      setLoading(true);
      try {
        const module = fleet === 'wb'
          ? require('../../assets/docs/330.pdf')
          : require('../../assets/docs/320.pdf');
        const asset = Asset.fromModule(module);
        await asset.downloadAsync();
        if (!asset.localUri) return;
        const dest = (FileSystem.cacheDirectory ?? '') + cacheFileName;
        await FileSystem.copyAsync({ from: asset.localUri, to: dest });
        setCachedFilePath(dest);
        filePath = dest;
      } catch (e) {
        Alert.alert('Error', `Could not load PDF: ${String(e)}`);
        return;
      } finally {
        setLoading(false);
      }
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath!, {
        mimeType: 'application/pdf',
        dialogTitle: `Open ${docLabel}`,
      });
    } else {
      Alert.alert('Cannot share', 'Sharing is not available on this device.');
    }
  }

  function openBookmark(page: number) {
    openViewer(page);
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header card */}
        <View style={{ margin: 16, backgroundColor: card, borderRadius: 16, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
          <View style={{ padding: 20, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 48, height: 48, borderRadius: 12,
                backgroundColor: fleetColor, alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={24} color={fleetIconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <FleetBadge fleet={fleet} size="sm" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: text, marginTop: 4 }}>{docLabel}</Text>
                <Text style={{ fontSize: 12, color: sub, marginTop: 1 }}>{totalPages} pages</Text>
              </View>
            </View>

            {/* Primary: in-app viewer */}
            <TouchableOpacity
              onPress={() => openViewer()}
              disabled={loading}
              style={{
                backgroundColor: fleetColor, borderRadius: 12, paddingVertical: 14,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <BookOpen size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Open Document</Text>
                  {!cachedFilePath && (
                    <Text style={{ color: '#FFFFFF60', fontSize: 12 }}>Loading…</Text>
                  )}
                </>
              )}
            </TouchableOpacity>

            {/* Secondary: share/external */}
            <TouchableOpacity
              onPress={shareDocument}
              disabled={loading}
              style={{
                borderRadius: 12, paddingVertical: 11,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                borderWidth: 1, borderColor: border,
              }}
            >
              <ExternalLink size={15} color={sub} />
              <Text style={{ color: sub, fontWeight: '600', fontSize: 13 }}>Open in External Viewer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bookmarks */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#2E6DB4', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            Sections
          </Text>
          <View style={{ backgroundColor: card, borderRadius: 14, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
            {bookmarks.map((bm, i) => (
              <TouchableOpacity
                key={bm.label}
                onPress={() => openBookmark(bm.page)}
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 14,
                  borderBottomWidth: i < bookmarks.length - 1 ? 0.5 : 0,
                  borderBottomColor: border,
                }}
              >
                <View style={{
                  width: 32, height: 22, borderRadius: 5,
                  backgroundColor: '#2E6DB418', alignItems: 'center', justifyContent: 'center', marginRight: 12,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#2E6DB4' }}>p.{bm.page}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: text }}>{bm.label}</Text>
                <ChevronRight size={14} color={sub} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* In-app PDF viewer modal */}
      <Modal
        visible={viewerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setViewerVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
          {/* Toolbar */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 16, paddingVertical: 12,
            backgroundColor: isDark ? '#0A1628' : '#0F1E35',
          }}>
            <TouchableOpacity
              onPress={() => setViewerVisible(false)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <X size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
              {currentPage ? `Page ${currentPage}` : docLabel}
            </Text>
            <TouchableOpacity
              onPress={shareDocument}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ExternalLink size={18} color={fleetIconColor} />
            </TouchableOpacity>
          </View>

          {/* Clause deep-link banner */}
          {currentClause && currentPage && (
            <View style={{
              backgroundColor: '#1E3A5F',
              paddingHorizontal: 16, paddingVertical: 8,
              flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              <FileText size={13} color={fleetIconColor} />
              <Text style={{ flex: 1, fontSize: 13, color: '#FFFFFF', fontWeight: '600' }}>
                §{currentClause}
              </Text>
              <Text style={{ fontSize: 12, color: fleetIconColor }}>
                {Platform.OS === 'ios' ? `Navigate to p.${currentPage}` : `p.${currentPage}`}
              </Text>
            </View>
          )}

          {/* WebView */}
          {viewerUri && (
            <View style={{ flex: 1 }}>
              <WebView
                key={viewerUri}
                source={{ uri: viewerUri }}
                style={{ flex: 1 }}
                allowFileAccess
                allowUniversalAccessFromFileURLs
                originWhitelist={['*', 'file://*']}
                onLoadStart={() => setWebViewLoading(true)}
                onLoadEnd={() => setWebViewLoading(false)}
                onError={() => {
                  setWebViewLoading(false);
                  Alert.alert(
                    'Cannot preview here',
                    'PDF preview is not available on this device. Use "Open in External Viewer" instead.',
                    [
                      { text: 'Open External', onPress: () => { setViewerVisible(false); shareDocument(); } },
                      { text: 'Close', onPress: () => setViewerVisible(false) },
                    ]
                  );
                }}
              />
              {webViewLoading && (
                <View style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: isDark ? '#0A1628' : '#F7F8FA',
                  alignItems: 'center', justifyContent: 'center', gap: 12,
                }}>
                  <ActivityIndicator size="large" color={fleetIconColor} />
                  <Text style={{ color: sub, fontSize: 14 }}>Loading document…</Text>
                  {currentPage && (
                    <Text style={{ color: sub, fontSize: 12 }}>Opening at page {currentPage}</Text>
                  )}
                </View>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
