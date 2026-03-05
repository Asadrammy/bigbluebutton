import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useAppTheme } from '../theme';

interface Sign {
  id: string;
  word: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  videoUrl?: string;
  description: string;
  rating: number;
  icon: string;
}

interface DictionaryScreenProps {
  navigation: any;
}

const DictionaryScreen: React.FC<DictionaryScreenProps> = ({ navigation }) => {
  const theme = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSign, setSelectedSign] = useState<Sign | null>(null);
  const [showModal, setShowModal] = useState(false);

  const categories = [
    { id: 'greetings', name: 'Grüße', icon: '👋' },
    { id: 'questions', name: 'Fragen', icon: '❓' },
    { id: 'daily', name: 'Alltag', icon: '🏠' },
    { id: 'numbers', name: 'Zahlen', icon: '🔢' },
    { id: 'family', name: 'Familie', icon: '👨‍👩‍👧' },
    { id: 'food', name: 'Essen', icon: '🍽️' },
  ];

  // Mock data - replace with actual dictionary data
  const signs: Sign[] = [
    {
      id: '1',
      word: 'Hallo',
      category: 'greetings',
      difficulty: 'easy',
      description: 'Informelle Begrüßung. Hand von der Stirn nach vorne bewegen.',
      rating: 4.8,
      icon: '👋',
    },
    {
      id: '2',
      word: 'Danke',
      category: 'greetings',
      difficulty: 'easy',
      description: 'Dankbarkeit ausdrücken. Hand vom Kinn nach außen bewegen.',
      rating: 4.9,
      icon: '🙏',
    },
    {
      id: '3',
      word: 'Gut',
      category: 'daily',
      difficulty: 'easy',
      description: 'Positives ausdrücken. Daumen nach oben zeigen.',
      rating: 4.6,
      icon: '👍',
    },
    {
      id: '4',
      word: 'Wie geht\'s?',
      category: 'questions',
      difficulty: 'medium',
      description: 'Nach dem Befinden fragen. Fragegeste mit beiden Händen.',
      rating: 4.7,
      icon: '🤔',
    },
    {
      id: '5',
      word: 'Bitte',
      category: 'greetings',
      difficulty: 'easy',
      description: 'Höfliche Bitte oder Anfrage. Hand flach vor der Brust.',
      rating: 4.8,
      icon: '🙏',
    },
  ];

  const filteredSigns = signs.filter(sign => {
    const matchesSearch = sign.word.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || sign.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const openSignDetail = (sign: Sign) => {
    setSelectedSign(sign);
    setShowModal(true);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={styles.star}>
          {i <= Math.floor(rating) ? '⭐' : '☆'}
        </Text>
      );
    }
    return stars;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return theme.colors.success;
      case 'medium':
        return theme.colors.warning;
      case 'hard':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'Einfach';
      case 'medium':
        return 'Mittel';
      case 'hard':
        return 'Schwer';
      default:
        return difficulty;
    }
  };

  const renderSign = ({ item }: { item: Sign }) => (
    <TouchableOpacity
      style={[styles.signCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => openSignDetail(item)}
      activeOpacity={0.7}>
      <Text style={styles.signIcon}>{item.icon}</Text>
      <View style={styles.signInfo}>
        <Text style={[styles.signWord, { color: theme.colors.text }]}>{item.word}</Text>
        <View style={styles.signMeta}>
          <View style={styles.rating}>{renderStars(item.rating)}</View>
          <Text
            style={[
              styles.difficulty,
              { color: getDifficultyColor(item.difficulty) },
            ]}>
            ● {getDifficultyText(item.difficulty)}
          </Text>
        </View>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder="Gebärde suchen..."
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          🏷️ Kategorien
        </Text>
        <FlatList
          horizontal
          data={categories}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    selectedCategory === item.id
                      ? theme.colors.primary
                      : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() =>
                setSelectedCategory(
                  selectedCategory === item.id ? null : item.id
                )
              }>
              <Text style={styles.categoryIcon}>{item.icon}</Text>
              <Text
                style={[
                  styles.categoryName,
                  {
                    color:
                      selectedCategory === item.id
                        ? theme.colors.textInverse
                        : theme.colors.text,
                  },
                ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Signs List */}
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        📖 {selectedCategory ? 'Gefilterte' : 'Beliebte'} Gebärden
      </Text>
      <FlatList
        data={filteredSigns}
        renderItem={renderSign}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.signsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Keine Gebärden gefunden
            </Text>
          </View>
        }
      />

      {/* Sign Detail Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            {selectedSign && (
              <>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    {selectedSign.word}
                  </Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Video Placeholder */}
                <View
                  style={[
                    styles.videoContainer,
                    { backgroundColor: theme.colors.surface },
                  ]}>
                  <Text style={styles.videoIcon}>{selectedSign.icon}</Text>
                  <Text style={[styles.videoPlaceholder, { color: theme.colors.textSecondary }]}>
                    Video wird hier angezeigt
                  </Text>
                  <View style={styles.videoControls}>
                    <TouchableOpacity style={styles.videoButton}>
                      <Text>▶️ Play</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.videoButton}>
                      <Text>🔁 Repeat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.videoButton}>
                      <Text>🐌 Slow</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Description */}
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                    📝 Beschreibung:
                  </Text>
                  <Text style={[styles.detailText, { color: theme.colors.text }]}>
                    {selectedSign.description}
                  </Text>
                </View>

                {/* Meta Info */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Text style={[styles.metaLabel, { color: theme.colors.textSecondary }]}>
                      🏷️ Kategorie:
                    </Text>
                    <Text style={[styles.metaValue, { color: theme.colors.text }]}>
                      {
                        categories.find(c => c.id === selectedSign.category)
                          ?.name
                      }
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={[styles.metaLabel, { color: theme.colors.textSecondary }]}>
                      📊 Schwierigkeit:
                    </Text>
                    <Text
                      style={[
                        styles.metaValue,
                        { color: getDifficultyColor(selectedSign.difficulty) },
                      ]}>
                      ● {getDifficultyText(selectedSign.difficulty)}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.colors.primary },
                    ]}>
                    <Text style={[styles.actionButtonText, { color: theme.colors.textInverse }]}>
                      ⭐ Zu Favoriten
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.colors.secondary },
                    ]}>
                    <Text style={[styles.actionButtonText, { color: theme.colors.textInverse }]}>
                      📤 Teilen
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    searchContainer: {
      padding: theme.spacing.md,
    },
    searchInput: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      fontSize: theme.typography.fontSize.md,
      borderWidth: 1,
    },
    categoriesContainer: {
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    categoriesList: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      gap: theme.spacing.xs,
      borderWidth: 1,
      marginRight: theme.spacing.sm,
    },
    categoryIcon: {
      fontSize: 20,
    },
    categoryName: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.medium,
    },
    signsList: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    signCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.sm,
    },
    signIcon: {
      fontSize: 40,
      marginRight: theme.spacing.md,
    },
    signInfo: {
      flex: 1,
    },
    signWord: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing.xs,
    },
    signMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    rating: {
      flexDirection: 'row',
    },
    star: {
      fontSize: 14,
    },
    difficulty: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    arrow: {
      fontSize: 24,
      color: '#CCC',
    },
    emptyState: {
      alignItems: 'center',
      padding: theme.spacing.xxl,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.lg,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: theme.typography.fontWeight.bold,
    },
    closeButton: {
      fontSize: 28,
      color: '#999',
    },
    videoContainer: {
      height: 200,
      borderRadius: theme.borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    videoIcon: {
      fontSize: 64,
      marginBottom: theme.spacing.sm,
    },
    videoPlaceholder: {
      fontSize: theme.typography.fontSize.md,
      marginBottom: theme.spacing.md,
    },
    videoControls: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    videoButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    detailSection: {
      marginBottom: theme.spacing.lg,
    },
    detailLabel: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: theme.spacing.sm,
    },
    detailText: {
      fontSize: theme.typography.fontSize.md,
      lineHeight: 22,
    },
    metaRow: {
      flexDirection: 'row',
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    metaItem: {
      flex: 1,
    },
    metaLabel: {
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing.xs,
    },
    metaValue: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    actionButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    actionButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });

export default DictionaryScreen;

