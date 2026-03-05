import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { HomeScreenProps } from '@navigation/types';
import { FONT_SIZES, SPACING } from '@utils/constants';
import { getTranslation } from '@utils/translations';
import { Language } from '../types';
import { useTheme } from '@theme/index';

const { width, height } = Dimensions.get('window');

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [currentLanguage] = useState<Language>('en');
  const { theme } = useTheme();
  const t = getTranslation(currentLanguage);

  const dynamicStyles = {
    safeArea: { backgroundColor: theme.colors.background },
    subtitle: { color: theme.colors.text },
    tagline: { color: theme.colors.textSecondary },
    logoCircle: { backgroundColor: theme.colors.header },
    primaryButton: { backgroundColor: theme.colors.header },
    secondaryButton: { backgroundColor: theme.colors.secondary },
  };

  return (
    <SafeAreaView style={[styles.safeArea, dynamicStyles.safeArea]}>
      <View style={styles.container}>
      {/* Logo/Icon Area */}
      <View style={styles.logoContainer}>
        <View style={[styles.logoCircle, dynamicStyles.logoCircle]}>
          <Text style={styles.logoText}>👋</Text>
        </View>
        <Text style={[styles.subtitle, dynamicStyles.subtitle]}>INTERvia</Text>
        <Text style={[styles.tagline, dynamicStyles.tagline]}>One World. Many Languages.{'\n'}One Voice.</Text>
      </View>

      {/* Main Action Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton, dynamicStyles.primaryButton]}
          onPress={() => navigation.navigate('SpeechToSign')}>
          <View style={styles.buttonIcon}>
            <Text style={styles.buttonIconText}>🗣️</Text>
          </View>
          <Text style={styles.buttonText}>{t.home.signLanguageMode}</Text>
          <Text style={styles.buttonSubtext}>Sign Language</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, dynamicStyles.secondaryButton]}
          onPress={() => navigation.navigate('SignToSpeech')}>
          <View style={styles.buttonIcon}>
            <Text style={styles.buttonIconText}>👐</Text>
          </View>
          <Text style={styles.buttonText}>{t.home.speechTranslationMode}</Text>
          <Text style={styles.buttonSubtext}>Speech Translation</Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: height * 0.15,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  logoText: {
    fontSize: 60,
  },
  subtitle: {
    fontSize: FONT_SIZES.xxlarge,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: FONT_SIZES.medium,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    gap: SPACING.md,
  },
  actionButton: {
    borderRadius: 20,
    padding: SPACING.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    minHeight: 140,
    justifyContent: 'center',
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    // backgroundColor set dynamically
  },
  buttonIcon: {
    marginBottom: SPACING.sm,
  },
  buttonIconText: {
    fontSize: 48,
  },
  buttonText: {
    fontSize: FONT_SIZES.large,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
  },
  buttonSubtext: {
    fontSize: FONT_SIZES.medium,
    color: '#FFFFFF',
    opacity: 0.9,
  },
});

export default HomeScreen;

