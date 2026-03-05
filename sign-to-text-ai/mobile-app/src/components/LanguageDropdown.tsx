import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { FONT_SIZES, SPACING, LANGUAGES } from '@utils/constants';
import { Language } from '@types/index';
import { useTheme } from '@theme/index';

interface LanguageDropdownProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  label?: string;
  compact?: boolean;
}

const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  selectedLanguage,
  onLanguageChange,
  label = 'Output Language',
  compact = false,
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const languages = Object.entries(LANGUAGES) as [Language, string][];

  const handleSelect = (language: Language) => {
    onLanguageChange(language);
    setIsOpen(false);
  };

  const dynamicStyles = {
    label: { color: theme.colors.text },
    dropdown: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
    selectedText: { color: theme.colors.text },
    dropdownIcon: { color: theme.colors.textSecondary },
    selectedTextCompact: { color: theme.colors.text },
    modalContent: { backgroundColor: theme.colors.background },
    modalHeader: { borderBottomColor: theme.colors.border },
    modalTitle: { color: theme.colors.text },
    closeButton: { color: theme.colors.textSecondary },
    languageItem: { borderBottomColor: theme.colors.border },
    languageItemSelected: { backgroundColor: theme.colors.surface },
    languageItemText: { color: theme.colors.text },
    languageItemTextSelected: { color: theme.colors.primary },
    checkmark: { color: theme.colors.primary },
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {!compact && label && <Text style={[styles.label, dynamicStyles.label]}>{label}</Text>}
      <TouchableOpacity
        style={[styles.dropdown, dynamicStyles.dropdown, compact && styles.dropdownCompact]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}>
        <Text style={[styles.selectedText, dynamicStyles.selectedText, compact && [styles.selectedTextCompact, dynamicStyles.selectedTextCompact]]}>
          {LANGUAGES[selectedLanguage]}
        </Text>
        <Text style={[styles.dropdownIcon, dynamicStyles.dropdownIcon, compact && styles.dropdownIconCompact]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
              <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>Select Language</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={[styles.closeButton, dynamicStyles.closeButton]}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={languages}
              keyExtractor={item => item[0]}
              renderItem={({ item }) => {
                const [code, name] = item;
                const isSelected = code === selectedLanguage;
                return (
                  <TouchableOpacity
                    style={[
                      styles.languageItem,
                      dynamicStyles.languageItem,
                      isSelected && [styles.languageItemSelected, dynamicStyles.languageItemSelected],
                    ]}
                    onPress={() => handleSelect(code)}>
                    <Text
                      style={[
                        styles.languageItemText,
                        dynamicStyles.languageItemText,
                        isSelected && [styles.languageItemTextSelected, dynamicStyles.languageItemTextSelected],
                      ]}>
                      {name}
                    </Text>
                    {isSelected && (
                      <Text style={[styles.checkmark, dynamicStyles.checkmark]}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  containerCompact: {
    marginBottom: 0,
    flex: 1,
  },
  label: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    // color set dynamically
    marginBottom: SPACING.sm,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // backgroundColor and borderColor set dynamically
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedText: {
    fontSize: FONT_SIZES.medium,
    // color set dynamically
    fontWeight: '500',
  },
  dropdownIcon: {
    fontSize: 12,
    // color set dynamically
  },
  dropdownCompact: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 0,
  },
  selectedTextCompact: {
    // color set dynamically
    fontSize: FONT_SIZES.medium,
  },
  dropdownIconCompact: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    // backgroundColor set dynamically
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    // borderBottomColor set dynamically
  },
  modalTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: '600',
    // color set dynamically
  },
  closeButton: {
    fontSize: 24,
    // color set dynamically
    fontWeight: '300',
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    // borderBottomColor set dynamically
  },
  languageItemSelected: {
    // backgroundColor set dynamically
  },
  languageItemText: {
    fontSize: FONT_SIZES.medium,
    // color set dynamically
  },
  languageItemTextSelected: {
    // color set dynamically
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    // color set dynamically
    fontWeight: 'bold',
  },
});

export default LanguageDropdown;

