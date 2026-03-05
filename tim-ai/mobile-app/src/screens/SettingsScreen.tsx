import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsScreenProps } from '@navigation/types';
import {
  FONT_SIZES,
  SPACING,
  LANGUAGES,
  SIGN_LANGUAGES,
  GROUPED_LANGUAGE_OPTIONS,
  GROUPED_SIGN_LANGUAGE_OPTIONS,
} from '@utils/constants';
import { getTranslation } from '@utils/translations';
import type { Language, SignLanguage, LanguageOption, SignLanguageOption } from '@types';
import { useAuth } from '@contexts/AuthContext';
import { useSettings } from '@contexts/SettingsContext';
import { useTheme } from '@theme/index';

const LANGUAGE_REGION_LABELS: Record<LanguageOption['region'], string> = {
  Germanic: 'Germanic languages',
  Anglophone: 'Anglophone languages',
  Romance: 'Romance languages',
  Nordic: 'Nordic languages',
  MiddleEastern: 'Middle Eastern languages',
  Other: 'Other languages',
};

const SIGN_REGION_LABELS: Record<SignLanguageOption['region'], string> = {
  Germanic: 'Germanic sign languages',
  Anglophone: 'Anglophone sign languages',
  Romance: 'Romance sign languages',
  Nordic: 'Nordic sign languages',
  Other: 'Other sign languages',
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { logout, user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { theme, themeMode } = useTheme();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSignLanguageModal, setShowSignLanguageModal] = useState(false);
  const [showVideoQualityModal, setShowVideoQualityModal] = useState(false);
  const [showAudioQualityModal, setShowAudioQualityModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const t = getTranslation(settings.preferredLanguage);

  const handleLanguageChange = async (language: Language) => {
    const newSettings = { ...settings, preferredLanguage: language };
    await updateSettings(newSettings);
  };

  const handleSignLanguageChange = async (signLanguage: SignLanguage) => {
    const newSettings = { ...settings, signLanguage };
    await updateSettings(newSettings);
  };

  const handleVideoQualityChange = async (quality: 'low' | 'medium' | 'high') => {
    const newSettings = { ...settings, videoQuality: quality };
    await updateSettings(newSettings);
  };

  const handleAudioQualityChange = async (quality: 'low' | 'medium' | 'high') => {
    const newSettings = { ...settings, audioQuality: quality };
    await updateSettings(newSettings);
  };

  const handleThemeModeChange = async (themeMode: 'light' | 'dark' | 'system') => {
    const newSettings = { ...settings, themeMode };
    await updateSettings(newSettings);
  };

  const handleSave = () => {
    Alert.alert('Settings Saved', 'Your preferences have been saved successfully');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'An error occurred while signing out');
            }
          },
        },
      ]
    );
  };

  const dynamicStyles = {
    safeArea: { backgroundColor: theme.colors.background },
    container: { backgroundColor: theme.colors.background },
    sectionTitle: { color: theme.colors.textSecondary },
    aboutCard: { backgroundColor: theme.colors.surface },
    aboutIconContainer: { backgroundColor: theme.colors.primary + '15' },
    aboutAppName: { color: theme.colors.text },
    aboutDescription: { color: theme.colors.textSecondary },
    aboutDivider: { backgroundColor: theme.colors.border },
    aboutVersionLabel: { color: theme.colors.textSecondary },
    aboutVersionText: { color: theme.colors.primary },
    accountCard: { backgroundColor: theme.colors.surface },
    accountAvatar: { backgroundColor: theme.colors.header },
    accountUsername: { color: theme.colors.text },
    accountEmail: { color: theme.colors.textSecondary },
    accountDivider: { backgroundColor: theme.colors.border },
    accountActionText: { color: theme.colors.text },
    accountActionArrow: { color: theme.colors.textSecondary },
    settingItem: { backgroundColor: theme.colors.surface },
    settingRowLabel: { color: theme.colors.text },
    settingRowValue: { color: theme.colors.textSecondary },
    settingRowArrow: { color: theme.colors.textSecondary },
    modalOverlay: { backgroundColor: theme.colors.overlay },
    modalContent: { backgroundColor: theme.colors.surface },
    modalTitle: { color: theme.colors.text },
    modalItem: { backgroundColor: theme.colors.surface },
    modalItemSelected: { backgroundColor: theme.colors.primary + '15' },
    modalItemText: { color: theme.colors.text },
    modalItemTextSelected: { color: theme.colors.primary },
    modalScrollView: { backgroundColor: theme.colors.surface },
    modalSection: { backgroundColor: theme.colors.surface },
    modalSectionLabel: { color: theme.colors.textSecondary },
    modalCloseButton: { backgroundColor: theme.colors.header },
    modalCloseButtonText: { color: theme.colors.textInverse },
    modalOption: { borderBottomColor: theme.colors.border },
    radioButton: { 
      borderColor: themeMode === 'dark' 
        ? theme.colors.textSecondary 
        : theme.colors.border 
    },
    radioButtonSelected: { borderColor: theme.colors.header },
    radioButtonInner: { backgroundColor: theme.colors.header },
    logoutButton: { backgroundColor: theme.colors.error },
    profileCardGradient1: { backgroundColor: theme.colors.header },
    profileCardGradient2: { backgroundColor: theme.colors.primary },
    profileCardGradient3: { backgroundColor: theme.colors.secondary },
    profileAvatarBg: { 
      backgroundColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)',
      borderWidth: 3,
      borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    editButtonBg: { backgroundColor: themeMode === 'dark' ? theme.colors.surface : 'rgba(255, 255, 255, 0.9)' },
    editButtonBorder: { borderColor: theme.colors.header },
  };

  return (
    <SafeAreaView style={[styles.safeArea, dynamicStyles.safeArea]}>
    <ScrollView style={[styles.container, dynamicStyles.container]}>
      <View style={styles.content}>
        {/* User Profile Card */}
        {user && (
          <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Profile')}>
            {/* Gradient Background */}
            <View style={styles.gradientBackground}>
              <View style={[styles.gradientLayer1, dynamicStyles.profileCardGradient1]} />
              <View style={[styles.gradientLayer2, dynamicStyles.profileCardGradient2]} />
              <View style={[styles.gradientLayer3, dynamicStyles.profileCardGradient3]} />
            </View>
            
            {/* Profile Content */}
            <View style={styles.profileCardContent}>
              <View style={styles.profileAvatarContainer}>
                <View style={[styles.profileAvatar, dynamicStyles.profileAvatarBg]}>
                  <Text style={styles.profileAvatarText}>
                    {user.firstName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.editButton, dynamicStyles.editButtonBg, { borderColor: dynamicStyles.editButtonBorder.borderColor }]}
                  onPress={() => navigation.navigate('Profile')}>
                  <Ionicons name="pencil-outline" size={16} color={theme.colors.header} />
                </TouchableOpacity>
              </View>
              <Text style={styles.profileName}>
                {user.firstName} {user.lastName}
              </Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />

        {/* Settings Section */}
            <TouchableOpacity
              style={[styles.settingItem, dynamicStyles.settingItem]}
              onPress={() => setShowLanguageModal(true)}>
              <View style={styles.settingRowContent}>
                <Text style={[styles.settingRowLabel, dynamicStyles.settingRowLabel]}>{t.settings.preferredLanguage}</Text>
                <View style={styles.settingRowRight}>
                  <Text style={[styles.settingRowValue, dynamicStyles.settingRowValue]}>
                    {LANGUAGES[settings.preferredLanguage]}
                  </Text>
                  <Text style={[styles.settingRowArrow, dynamicStyles.settingRowArrow]}>›</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, dynamicStyles.settingItem]}
              onPress={() => setShowSignLanguageModal(true)}>
              <View style={styles.settingRowContent}>
                <Text style={[styles.settingRowLabel, dynamicStyles.settingRowLabel]}>{t.settings.signLanguage}</Text>
                <View style={styles.settingRowRight}>
                  <Text style={[styles.settingRowValue, dynamicStyles.settingRowValue]}>
                    {SIGN_LANGUAGES[settings.signLanguage]}
                  </Text>
                  <Text style={[styles.settingRowArrow, dynamicStyles.settingRowArrow]}>›</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, dynamicStyles.settingItem]}
              onPress={() => setShowVideoQualityModal(true)}>
              <View style={styles.settingRowContent}>
                <Text style={[styles.settingRowLabel, dynamicStyles.settingRowLabel]}>VIDEO QUALITY</Text>
                <View style={styles.settingRowRight}>
                  <Text style={[styles.settingRowValue, dynamicStyles.settingRowValue]}>
                    {settings.videoQuality.charAt(0).toUpperCase() + settings.videoQuality.slice(1)}
                  </Text>
                  <Text style={[styles.settingRowArrow, dynamicStyles.settingRowArrow]}>›</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, dynamicStyles.settingItem]}
              onPress={() => setShowAudioQualityModal(true)}>
              <View style={styles.settingRowContent}>
                <Text style={[styles.settingRowLabel, dynamicStyles.settingRowLabel]}>AUDIO QUALITY</Text>
                <View style={styles.settingRowRight}>
                  <Text style={[styles.settingRowValue, dynamicStyles.settingRowValue]}>
                    {settings.audioQuality.charAt(0).toUpperCase() + settings.audioQuality.slice(1)}
                  </Text>
                  <Text style={[styles.settingRowArrow, dynamicStyles.settingRowArrow]}>›</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, dynamicStyles.settingItem]}
              onPress={() => setShowThemeModal(true)}>
              <View style={styles.settingRowContent}>
                <Text style={[styles.settingRowLabel, dynamicStyles.settingRowLabel]}>Theme</Text>
                <View style={styles.settingRowRight}>
                  <Text style={[styles.settingRowValue, dynamicStyles.settingRowValue]}>
                    {settings.themeMode.charAt(0).toUpperCase() + settings.themeMode.slice(1)}
                  </Text>
                  <Text style={[styles.settingRowArrow, dynamicStyles.settingRowArrow]}>›</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, dynamicStyles.settingItem]}
              onPress={() => navigation.navigate('About')}>
              <View style={styles.settingRowContent}>
                <Text style={[styles.settingRowLabel, dynamicStyles.settingRowLabel]}>About</Text>
                <View style={styles.settingRowRight}>
                  <Text style={[styles.settingRowArrow, dynamicStyles.settingRowArrow]}>›</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, dynamicStyles.settingItem]}
              onPress={() => navigation.navigate('Help')}>
              <View style={styles.settingRowContent}>
                <Text style={[styles.settingRowLabel, dynamicStyles.settingRowLabel]}>Help & Support</Text>
                <View style={styles.settingRowRight}>
                  <Text style={[styles.settingRowArrow, dynamicStyles.settingRowArrow]}>›</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, dynamicStyles.settingItem]}
              onPress={() => navigation.navigate('Terms')}>
              <View style={styles.settingRowContent}>
                <Text style={[styles.settingRowLabel, dynamicStyles.settingRowLabel]}>Terms & Conditions</Text>
                <View style={styles.settingRowRight}>
                  <Text style={[styles.settingRowArrow, dynamicStyles.settingRowArrow]}>›</Text>
                </View>
              </View>
            </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={[styles.logoutButton, dynamicStyles.logoutButton]} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}>
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Select Language</Text>
            <ScrollView style={styles.modalScrollView}>
            {Object.entries(GROUPED_LANGUAGE_OPTIONS).map(([region, options]) => (
              <View key={region} style={[styles.modalSection, dynamicStyles.modalSection]}>
                <Text style={[styles.modalSectionLabel, dynamicStyles.modalSectionLabel]}>
                  {LANGUAGE_REGION_LABELS[region as LanguageOption['region']]}
                </Text>
                {options.map(({ code, label }) => (
                  <TouchableOpacity
                    key={code}
                    style={[styles.modalOption, dynamicStyles.modalItem, dynamicStyles.modalOption]}
                    onPress={async () => {
                      await handleLanguageChange(code);
                      setShowLanguageModal(false);
                    }}>
                    <View style={styles.modalOptionLeft}>
                      <View
                        style={[
                          styles.radioButton,
                          dynamicStyles.radioButton,
                          settings.preferredLanguage === code && [styles.radioButtonSelected, dynamicStyles.radioButtonSelected],
                        ]}>
                        {settings.preferredLanguage === code && (
                          <View style={[styles.radioButtonInner, dynamicStyles.radioButtonInner]} />
                        )}
                      </View>
                      <Text style={[styles.modalOptionText, dynamicStyles.modalItemText]}>{label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, dynamicStyles.modalCloseButton]}
              onPress={() => setShowLanguageModal(false)}>
              <Text style={[styles.modalCloseButtonText, dynamicStyles.modalCloseButtonText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sign Language Selection Modal */}
      <Modal
        visible={showSignLanguageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSignLanguageModal(false)}>
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Select Sign Language</Text>
            <ScrollView style={styles.modalScrollView}>
            {Object.entries(GROUPED_SIGN_LANGUAGE_OPTIONS).map(([region, options]) => (
              <View key={region} style={[styles.modalSection, dynamicStyles.modalSection]}>
                <Text style={[styles.modalSectionLabel, dynamicStyles.modalSectionLabel]}>
                  {SIGN_REGION_LABELS[region as SignLanguageOption['region']]}
                </Text>
                {options.map(({ code, label }) => (
                  <TouchableOpacity
                    key={code}
                    style={[styles.modalOption, dynamicStyles.modalItem, dynamicStyles.modalOption]}
                    onPress={async () => {
                      await handleSignLanguageChange(code);
                      setShowSignLanguageModal(false);
                    }}>
                    <View style={styles.modalOptionLeft}>
                      <View
                        style={[
                          styles.radioButton,
                          dynamicStyles.radioButton,
                          settings.signLanguage === code && [styles.radioButtonSelected, dynamicStyles.radioButtonSelected],
                        ]}>
                        {settings.signLanguage === code && (
                          <View style={[styles.radioButtonInner, dynamicStyles.radioButtonInner]} />
                        )}
                      </View>
                      <Text style={[styles.modalOptionText, dynamicStyles.modalItemText]}>{label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, dynamicStyles.modalCloseButton]}
              onPress={() => setShowSignLanguageModal(false)}>
              <Text style={[styles.modalCloseButtonText, dynamicStyles.modalCloseButtonText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Video Quality Selection Modal */}
      <Modal
        visible={showVideoQualityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVideoQualityModal(false)}>
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Select Video Quality</Text>
            <ScrollView style={styles.modalScrollView}>
            {['low', 'medium', 'high'].map(quality => (
              <TouchableOpacity
                key={quality}
                  style={[styles.modalOption, dynamicStyles.modalItem, dynamicStyles.modalOption]}
                  onPress={async () => {
                    await handleVideoQualityChange(quality as 'low' | 'medium' | 'high');
                    setShowVideoQualityModal(false);
                  }}>
                  <View style={styles.modalOptionLeft}>
                    <View
                      style={[
                        styles.radioButton,
                        dynamicStyles.radioButton,
                        settings.videoQuality === quality && [styles.radioButtonSelected, dynamicStyles.radioButtonSelected],
                      ]}>
                      {settings.videoQuality === quality && (
                        <View style={[styles.radioButtonInner, dynamicStyles.radioButtonInner]} />
                      )}
                    </View>
                    <Text style={[styles.modalOptionText, dynamicStyles.modalItemText]}>
                      {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </Text>
                  </View>
              </TouchableOpacity>
            ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, dynamicStyles.modalCloseButton]}
              onPress={() => setShowVideoQualityModal(false)}>
              <Text style={[styles.modalCloseButtonText, dynamicStyles.modalCloseButtonText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Audio Quality Selection Modal */}
      <Modal
        visible={showAudioQualityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAudioQualityModal(false)}>
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Select Audio Quality</Text>
            <ScrollView style={styles.modalScrollView}>
            {['low', 'medium', 'high'].map(quality => (
              <TouchableOpacity
                key={quality}
                  style={[styles.modalOption, dynamicStyles.modalItem, dynamicStyles.modalOption]}
                  onPress={async () => {
                    await handleAudioQualityChange(quality as 'low' | 'medium' | 'high');
                    setShowAudioQualityModal(false);
                  }}>
                  <View style={styles.modalOptionLeft}>
                    <View
                      style={[
                        styles.radioButton,
                        dynamicStyles.radioButton,
                        settings.audioQuality === quality && [styles.radioButtonSelected, dynamicStyles.radioButtonSelected],
                      ]}>
                      {settings.audioQuality === quality && (
                        <View style={[styles.radioButtonInner, dynamicStyles.radioButtonInner]} />
                      )}
                    </View>
                    <Text style={[styles.modalOptionText, dynamicStyles.modalItemText]}>
                      {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </Text>
                  </View>
              </TouchableOpacity>
            ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, dynamicStyles.modalCloseButton]}
              onPress={() => setShowAudioQualityModal(false)}>
              <Text style={[styles.modalCloseButtonText, dynamicStyles.modalCloseButtonText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Theme Mode Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowThemeModal(false)}>
        <View style={[styles.modalOverlay, dynamicStyles.modalOverlay]}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Select Theme Mode</Text>
            <ScrollView style={styles.modalScrollView}>
              {(['light', 'dark', 'system'] as const).map(themeMode => {
                const isSelected = settings.themeMode === themeMode;
                return (
                  <TouchableOpacity
                    key={themeMode}
                    style={[
                      styles.modalOption,
                      dynamicStyles.modalItem,
                      dynamicStyles.modalOption,
                    ]}
                    onPress={async () => {
                      await handleThemeModeChange(themeMode);
                      setShowThemeModal(false);
                    }}
                    activeOpacity={0.7}>
                    <View style={styles.modalOptionLeft}>
                      <View
                        style={[
                          styles.radioButton,
                          dynamicStyles.radioButton,
                          isSelected && [styles.radioButtonSelected, dynamicStyles.radioButtonSelected],
                        ]}>
                        {isSelected && (
                          <View style={[styles.radioButtonInner, dynamicStyles.radioButtonInner]} />
                        )}
                      </View>
                      <Text style={[
                        styles.modalOptionText,
                        dynamicStyles.modalItemText,
                        isSelected && dynamicStyles.modalItemTextSelected,
                      ]}>
                        {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, dynamicStyles.modalCloseButton]}
              onPress={() => setShowThemeModal(false)}>
              <Text style={[styles.modalCloseButtonText, dynamicStyles.modalCloseButtonText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.small,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  aboutCard: {
    padding: SPACING.xl,
    // backgroundColor set dynamically
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  aboutIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    // backgroundColor set dynamically
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  aboutIcon: {
    fontSize: 40,
  },
  aboutAppName: {
    fontSize: FONT_SIZES.xxlarge,
    fontWeight: 'bold',
    // color set dynamically
    marginBottom: SPACING.sm,
  },
  aboutDescription: {
    fontSize: FONT_SIZES.medium,
    // color set dynamically
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  aboutDivider: {
    width: '100%',
    height: 1,
    // backgroundColor set dynamically
    marginBottom: SPACING.lg,
  },
  aboutVersionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  aboutVersionLabel: {
    fontSize: FONT_SIZES.small,
    // color set dynamically
    fontWeight: '500',
  },
  aboutVersionText: {
    fontSize: FONT_SIZES.medium,
    // color set dynamically
    fontWeight: '700',
  },
  accountCard: {
    // backgroundColor set dynamically
    borderRadius: 16,
    padding: SPACING.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  accountAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    // backgroundColor set dynamically
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  accountAvatarText: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  accountInfo: {
    flex: 1,
  },
  accountUsername: {
    fontSize: FONT_SIZES.large,
    fontWeight: '700',
    // color set dynamically
    marginBottom: SPACING.xs,
  },
  accountEmail: {
    fontSize: FONT_SIZES.small,
    // color set dynamically
  },
  accountDivider: {
    height: 1,
    // backgroundColor set dynamically
    marginVertical: SPACING.md,
  },
  accountActionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  accountActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  accountActionIcon: {
    fontSize: 20,
  },
  accountActionText: {
    fontSize: FONT_SIZES.medium,
    // color set dynamically
    fontWeight: '500',
  },
  accountActionArrow: {
    fontSize: 24,
    // color set dynamically
  },
  profileCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    minHeight: 180,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor set dynamically
  },
  gradientLayer2: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    // backgroundColor set dynamically
    opacity: 0.8,
  },
  gradientLayer3: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    // backgroundColor set dynamically
    opacity: 0.7,
  },
  profileCardContent: {
    padding: SPACING.xl,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
    minHeight: 180,
  },
  profileAvatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    // backgroundColor set dynamically
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  profileAvatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: FONT_SIZES.large,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: FONT_SIZES.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    // backgroundColor set dynamically
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    // borderColor set dynamically
  },
  editButtonText: {
    fontSize: 16,
  },
  spacer: {
    height: 0,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: SPACING.md,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    marginTop: SPACING.lg,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
  },
  settingsCard: {
    // backgroundColor set dynamically
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  settingItem: {
    padding: SPACING.lg,
    // backgroundColor set dynamically
    borderRadius: 16,
    marginBottom: SPACING.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  settingsDivider: {
    height: 1,
    // backgroundColor set dynamically
    marginHorizontal: SPACING.lg,
  },
  settingRowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingRowLabel: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    // color set dynamically
  },
  settingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  settingRowValue: {
    fontSize: FONT_SIZES.medium,
    // color set dynamically
    fontWeight: '500',
  },
  settingRowArrow: {
    fontSize: 24,
    // color set dynamically
  },
  modalOverlay: {
    flex: 1,
    // backgroundColor set dynamically
    justifyContent: 'flex-end',
  },
  modalContent: {
    // backgroundColor set dynamically
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: 'bold',
    // color set dynamically
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  modalScrollView: {
    maxHeight: 400,
    marginBottom: SPACING.sm,
  },
  modalOption: {
    borderBottomWidth: 1,
    paddingVertical: SPACING.md,
    borderBottomColor: '#E5E7EB',
  },
  modalSection: {
    marginBottom: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.md,
  },
  modalSectionLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    color: '#7F8C8D',
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    // borderColor set dynamically
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  radioButtonSelected: {
    // borderColor set dynamically
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    // backgroundColor set dynamically
  },
  modalOptionText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '500',
    // color set dynamically
    flex: 1,
  },
  modalCloseButton: {
    // backgroundColor set dynamically
    width: '100%',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    minHeight: 44,
  },
  modalCloseButtonText: {
    // color set dynamically
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
});

export default SettingsScreen;


