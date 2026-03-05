import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppTheme } from '../theme';

interface Translation {
  id: string;
  type: 'sign-to-speech' | 'speech-to-sign';
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: Date;
  isFavorite: boolean;
}

interface HistoryScreenProps {
  navigation: any;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const theme = useAppTheme();
  const [filter, setFilter] = useState<'all' | 'sign-to-speech' | 'speech-to-sign'>('all');
  
  // Mock data - replace with actual data from database/storage
  const [translations, setTranslations] = useState<Translation[]>([
    {
      id: '1',
      type: 'sign-to-speech',
      sourceText: 'Hallo',
      targetText: 'Hello',
      sourceLang: 'DGS',
      targetLang: '🇬🇧',
      timestamp: new Date(),
      isFavorite: true,
    },
    {
      id: '2',
      type: 'speech-to-sign',
      sourceText: 'Danke',
      targetText: '[DGS Sign]',
      sourceLang: '🇩🇪',
      targetLang: 'DGS',
      timestamp: new Date(Date.now() - 3600000),
      isFavorite: false,
    },
    {
      id: '3',
      type: 'sign-to-speech',
      sourceText: 'Wie geht\'s',
      targetText: 'How are you',
      sourceLang: 'DGS',
      targetLang: '🇬🇧',
      timestamp: new Date(Date.now() - 86400000),
      isFavorite: false,
    },
  ]);

  const filteredTranslations = translations.filter(
    t => filter === 'all' || t.type === filter
  );

  const toggleFavorite = (id: string) => {
    setTranslations(prev =>
      prev.map(t => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  const deleteTranslation = (id: string) => {
    Alert.alert(
      'Delete Translation',
      'Are you sure you want to delete this translation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setTranslations(prev => prev.filter(t => t.id !== id));
          },
        },
      ]
    );
  };

  const deleteAll = () => {
    Alert.alert(
      'Delete All',
      'Are you sure you want to delete all translations?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => setTranslations([]),
        },
      ]
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `Vor ${minutes} Min.`;
    if (hours < 24) return `Vor ${hours} Std.`;
    return `Vor ${days} Tag(en)`;
  };

  const renderItem = ({ item }: { item: Translation }) => (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: theme.colors.surface }]}
      activeOpacity={0.7}>
      <View style={styles.itemHeader}>
        <View style={styles.typeIcon}>
          <Text style={styles.typeIconText}>
            {item.type === 'sign-to-speech' ? '👐 → 🗣️' : '🗣️ → 👐'}
          </Text>
        </View>
        <View style={styles.itemHeaderRight}>
          <Text style={[styles.time, { color: theme.colors.textTertiary }]}>
            {formatTime(item.timestamp)}
          </Text>
          <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
            <Text style={styles.favoriteIcon}>
              {item.isFavorite ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.translationContent}>
        <Text style={[styles.sourceText, { color: theme.colors.text }]}>
          {item.sourceText}
        </Text>
        <Text style={[styles.arrow, { color: theme.colors.textSecondary }]}>→</Text>
        <Text style={[styles.targetText, { color: theme.colors.text }]}>
          {item.targetText}
        </Text>
      </View>

      <View style={styles.languageRow}>
        <Text style={[styles.language, { color: theme.colors.textSecondary }]}>
          {item.sourceLang} → {item.targetLang}
        </Text>
        <TouchableOpacity onPress={() => deleteTranslation(item.id)}>
          <Text style={[styles.deleteIcon, { color: theme.colors.error }]}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'all' && {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={() => setFilter('all')}>
          <Text
            style={[
              styles.filterText,
              {
                color: filter === 'all' ? theme.colors.textInverse : theme.colors.text,
              },
            ]}>
            Alle
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'sign-to-speech' && {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={() => setFilter('sign-to-speech')}>
          <Text
            style={[
              styles.filterText,
              {
                color:
                  filter === 'sign-to-speech'
                    ? theme.colors.textInverse
                    : theme.colors.text,
              },
            ]}>
            👐 → 🗣️
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'speech-to-sign' && {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={() => setFilter('speech-to-sign')}>
          <Text
            style={[
              styles.filterText,
              {
                color:
                  filter === 'speech-to-sign'
                    ? theme.colors.textInverse
                    : theme.colors.text,
              },
            ]}>
            🗣️ → 👐
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {filteredTranslations.length > 0 ? (
        <FlatList
          data={filteredTranslations}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Keine Übersetzungen vorhanden
          </Text>
          <Text style={[styles.emptyHint, { color: theme.colors.textTertiary }]}>
            Ihre Übersetzungen werden hier angezeigt
          </Text>
        </View>
      )}

      {/* Delete All Button */}
      {translations.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.deleteAllButton, { borderColor: theme.colors.error }]}
            onPress={deleteAll}>
            <Text style={[styles.deleteAllText, { color: theme.colors.error }]}>
              Alle löschen
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    filterContainer: {
      flexDirection: 'row',
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.background,
    },
    filterTab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    list: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    item: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.sm,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    typeIcon: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    typeIconText: {
      fontSize: theme.typography.fontSize.lg,
    },
    itemHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    time: {
      fontSize: theme.typography.fontSize.sm,
    },
    favoriteIcon: {
      fontSize: 20,
    },
    translationContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    sourceText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      flex: 1,
    },
    arrow: {
      fontSize: theme.typography.fontSize.lg,
    },
    targetText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      flex: 1,
      textAlign: 'right',
    },
    languageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    language: {
      fontSize: theme.typography.fontSize.sm,
    },
    deleteIcon: {
      fontSize: 20,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xxl,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.lg,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing.sm,
    },
    emptyHint: {
      fontSize: theme.typography.fontSize.md,
      textAlign: 'center',
    },
    footer: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    deleteAllButton: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      alignItems: 'center',
    },
    deleteAllText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });

export default HistoryScreen;

