import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { useAppTheme } from '../theme';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  navigation: any;
  onComplete?: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation, onComplete }) => {
  const theme = useAppTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const pages = [
    {
      title: 'Welcome to INTERvia',
      subtitle: 'One World. Many Languages. One Voice.',
      description: 'Translate sign language to spoken language and vice versa.',
      icon: '👋',
      color: theme.colors.primary,
    },
    {
      title: 'Sign Language to Speech',
      subtitle: 'Show and Understand',
      description: 'Show signs to the camera. The app recognizes them and speaks them out.',
      icon: '👐',
      color: theme.colors.secondary,
    },
    {
      title: 'Speech to Sign Language',
      subtitle: 'Speak and See',
      description: 'Speak into the microphone. The avatar displays the signs.',
      icon: '🗣️',
      color: theme.colors.accent,
    },
    {
      title: 'Ready to Start!',
      subtitle: 'Communication Without Boundaries',
      description: 'We need access to camera and microphone for translation.',
      icon: '🚀',
      color: theme.colors.success,
    },
  ];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigation.replace('MainTabs');
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Content */}
      <View style={styles.content}>
        {/* Page Content */}
        <View style={styles.pageContent}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: pages[currentPage].color + '20' },
            ]}>
            <Text style={styles.icon}>{pages[currentPage].icon}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{pages[currentPage].title}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>{pages[currentPage].subtitle}</Text>

          {/* Description */}
          <Text style={styles.description}>{pages[currentPage].description}</Text>
        </View>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentPage
                      ? theme.colors.primary
                      : theme.colors.border,
                  width: index === currentPage ? 32 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          {currentPage < pages.length - 1 ? (
            <>
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>
                  Skip
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleNext}>
                <Text style={[styles.nextText, { color: theme.colors.textInverse }]}>
                  Next →
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleComplete}>
              <Text style={[styles.startText, { color: theme.colors.textInverse }]}>
                Let's Go! 🚀
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
      justifyContent: 'space-between',
    },
    pageContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    icon: {
      fontSize: 60,
    },
    title: {
      fontSize: theme.typography.fontSize.xxxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    description: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: theme.spacing.lg,
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    dot: {
      height: 8,
      borderRadius: 4,
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    skipButton: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: theme.dimensions.button.lg,
    },
    skipText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    nextButton: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: theme.dimensions.button.lg,
      ...theme.shadows.sm,
    },
    nextText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    startButton: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: theme.dimensions.button.lg,
      ...theme.shadows.md,
    },
    startText: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });

export default OnboardingScreen;

