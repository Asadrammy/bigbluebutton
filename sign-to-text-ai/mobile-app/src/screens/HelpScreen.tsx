/**
 * Help & Support Screen
 * User help and support information
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@theme';
import type { HelpScreenProps } from '@navigation/types';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const HelpScreen: React.FC<HelpScreenProps> = ({ navigation }) => {
  const theme = useAppTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    {
      id: '1',
      question: 'Which languages are supported?',
      answer: 'The app supports German Sign Language (DGS) and translations in German, English, Spanish, French, and Arabic.',
    },
    {
      id: '2',
      question: 'Does the app work offline?',
      answer: 'An internet connection is required for full functionality. Some basic features can be used offline.',
    },
    {
      id: '3',
      question: 'Why is my sign not recognized?',
      answer: 'Make sure: 1) Good lighting is present, 2) Your hands are fully visible, 3) You are at the recommended distance from the camera.',
    },
    {
      id: '4',
      question: 'How can I improve accuracy?',
      answer: 'Perform signs slowly and clearly, position yourself centrally in front of the camera, and avoid busy backgrounds.',
    },
    {
      id: '5',
      question: 'Is my privacy protected?',
      answer: 'Yes! Videos and audio data are not permanently stored and are only used for direct translation.',
    },
  ];

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openEmail = () => {
    Linking.openURL('mailto:support@intervia.app');
  };

  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="help-circle" size={50} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>
            We're here to help you
          </Text>
        </View>

        {/* Quick Tips Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons name="videocam" size={20} color={theme.colors.header} style={styles.tipIcon} />
            <Text style={styles.tipText}>Ensure good lighting and clear hand visibility</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="mic" size={20} color={theme.colors.header} style={styles.tipIcon} />
            <Text style={styles.tipText}>Speak clearly and at a moderate pace</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="settings" size={20} color={theme.colors.header} style={styles.tipIcon} />
            <Text style={styles.tipText}>Adjust language preferences in Settings</Text>
          </View>
        </View>

        {/* FAQs Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <View key={faq.id}>
              <TouchableOpacity
                style={styles.faqItem}
                onPress={() => toggleExpand(faq.id)}
                activeOpacity={0.7}>
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={expandedId === faq.id ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
              {expandedId === faq.id && (
                <View style={styles.faqAnswerContainer}>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
              )}
              {index < faqs.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Contact Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Us</Text>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={openEmail}
            activeOpacity={0.7}>
            <Ionicons name="mail-outline" size={24} color={theme.colors.header} />
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactDetail}>support@intervia.app</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 INTERvia
          </Text>
          <Text style={styles.footerSubtext}>
            All rights reserved
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xxl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.header,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
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
  cardTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  tipIcon: {
    marginRight: theme.spacing.md,
  },
  tipText: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  faqItem: {
    paddingVertical: theme.spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginRight: theme.spacing.md,
  },
  faqAnswerContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  faqAnswer: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  contactInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  contactTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  contactDetail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  footerSubtext: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textTertiary,
  },
});

export default HelpScreen;
