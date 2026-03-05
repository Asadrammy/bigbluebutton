/**
 * Theme Toggle Component
 * Allows users to switch between light/dark/system themes
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

const ThemeToggle: React.FC = () => {
  const { theme, themePreference, setThemePreference } = useTheme();
  
  const options: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
    { value: 'light', label: 'Hell', icon: '☀️' },
    { value: 'dark', label: 'Dunkel', icon: '🌙' },
    { value: 'system', label: 'System', icon: '⚙️' },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.text }]}>
        Design
      </Text>
      <View style={styles.optionsContainer}>
        {options.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              {
                backgroundColor:
                  themePreference === option.value
                    ? theme.colors.primary
                    : theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setThemePreference(option.value)}>
            <Text style={styles.icon}>{option.icon}</Text>
            <Text
              style={[
                styles.optionText,
                {
                  color:
                    themePreference === option.value
                      ? theme.colors.textInverse
                      : theme.colors.text,
                },
              ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ThemeToggle;

