import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '@theme/index';
import { SignToSpeechScreenProps } from '@navigation/types';
import config from '@config/environment';

const SignToSpeechScreen: React.FC<SignToSpeechScreenProps> = () => {
  const { theme } = useTheme();
  const [showWebView, setShowWebView] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const meetingUrl = useMemo(() => config.bbbMeetingUrl?.trim() || '', []);
  const supportUrl = useMemo(() => config.bbbSupportUrl?.trim() || 'https://bigbluebutton.org', []);

  const handleLaunchMeeting = useCallback(() => {
    if (!meetingUrl) {
      Alert.alert(
        'Missing meeting link',
        'Set BBB_MEETING_URL in your mobile .env file or app config before launching BigBlueButton.'
      );
      return;
    }
    setShowWebView(true);
    setWebViewKey((prev) => prev + 1); // force reload per launch
  }, [meetingUrl]);

  const handleOpenExternally = useCallback(async () => {
    const targetUrl = meetingUrl || supportUrl;
    try {
      const canOpen = await Linking.canOpenURL(targetUrl);
      if (canOpen) {
        await Linking.openURL(targetUrl);
      } else {
        Alert.alert('Unable to open link', 'Please copy the meeting URL and open it manually.');
      }
    } catch {
      Alert.alert('Unable to open link', 'Please copy the meeting URL and open it manually.');
    }
  }, [meetingUrl, supportUrl]);

  const handleCloseWebView = useCallback(() => {
    setShowWebView(false);
    setIsLoading(false);
  }, []);

  const handleWebViewError = useCallback(() => {
    Alert.alert(
      'Connection error',
      'We could not load the BigBlueButton meeting. Check your network connection or open it in your browser.',
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'Open in browser', onPress: handleOpenExternally },
      ]
    );
  }, [handleOpenExternally]);

  if (showWebView && meetingUrl) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>        <View style={[styles.webViewHeader, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>          <TouchableOpacity style={styles.headerButton} onPress={handleCloseWebView}>
            <Ionicons name="close" size={22} color={theme.colors.text} />
            <Text style={[styles.headerButtonText, { color: theme.colors.text }]}>Close</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconOnlyButton}
              onPress={() => setWebViewKey((prev) => prev + 1)}
              accessibilityLabel="Reload meeting">
              <Ionicons name="refresh" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconOnlyButton, styles.headerButtonSpacing]}
              onPress={handleOpenExternally}
              accessibilityLabel="Open meeting in browser">
              <Ionicons name={Platform.OS === 'ios' ? 'share-outline' : 'open-outline'} size={20} color={theme.colors.text} />            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.webViewContainer}>
          {isLoading && (
            <View style={[styles.webViewLoading, { backgroundColor: theme.colors.surface + 'CC' }]}>              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.webViewLoadingText, { color: theme.colors.textSecondary }]}>Connecting to BigBlueButton…</Text>
            </View>
          )}
          <WebView
            key={webViewKey}
            source={{ uri: meetingUrl }}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={handleWebViewError}
            startInLoadingState
            allowsFullscreenVideo
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>      <ScrollView
        contentContainerStyle={[styles.contentContainer, { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.lg }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={[styles.heroBadge, { backgroundColor: theme.colors.header + '22' }]}>            <Ionicons name="videocam" size={20} color={theme.colors.header} />
            <Text style={[styles.heroBadgeText, { color: theme.colors.header }]}>Powered by BigBlueButton</Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Join your next meeting</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>We now rely entirely on BigBlueButton for video calls. Launch the meeting below—no camera permissions or uploads required.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>How it works</Text>
          <View style={styles.stepRow}>
            <View style={[styles.stepBullet, { backgroundColor: theme.colors.header }]}>
              <Text style={styles.stepBulletText}>1</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>Tap “Launch BigBlueButton” to open the meeting inside the app.</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={[styles.stepBullet, { backgroundColor: theme.colors.header }]}>
              <Text style={styles.stepBulletText}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>If anything goes wrong, use the browser icon to open the same link externally.</Text>
          </View>
          <View style={styles.stepRow}>
            <View style={[styles.stepBullet, { backgroundColor: theme.colors.header }]}>
              <Text style={styles.stepBulletText}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>Need assistance? Visit the support portal or contact your moderator.</Text>
          </View>
        </View>

        {!meetingUrl && (
          <View style={[styles.card, styles.warningCard, { borderColor: theme.colors.error }]}>            <Ionicons name="warning" size={20} color={theme.colors.error} />
            <View style={styles.warningContent}>
              <Text style={[styles.warningTitle, { color: theme.colors.error }]}>BBB_MEETING_URL is not configured.</Text>
              <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>Update mobile-app/.env with BBB_MEETING_URL so we can open the correct meeting link.</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.colors.header, shadowColor: theme.colors.header }]}
          onPress={handleLaunchMeeting}
          activeOpacity={0.9}>
          <Ionicons name="play-circle" size={22} color="#fff" style={styles.primaryButtonIcon} />
          <Text style={styles.primaryButtonText}>Launch BigBlueButton</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
          onPress={handleOpenExternally}
          activeOpacity={0.85}>
          <Ionicons name="open-outline" size={18} color={theme.colors.text} />
          <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Open in Browser</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.supportLink}
          onPress={() => Linking.openURL(supportUrl)}
          activeOpacity={0.8}>
          <Text style={[styles.supportLinkText, { color: theme.colors.textSecondary }]}>Visit support portal</Text>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  heroSection: {
    marginBottom: 24,
    gap: 12,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBadgeText: {
    fontWeight: '600',
    fontSize: 13,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBulletText: {
    color: '#fff',
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    marginBottom: 16,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  supportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  supportLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconOnlyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonSpacing: {
    marginLeft: 4,
  },
  webViewContainer: {
    flex: 1,
  },
  webViewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    paddingHorizontal: 24,
  },
  webViewLoadingText: {
    marginTop: 12,
    textAlign: 'center',
  },
});

export default SignToSpeechScreen;

