import React from 'react';
import { View, ImageBackground, Text, StyleSheet, ImageSourcePropType } from 'react-native';
import { COLORS } from '@utils/constants';

interface QuickAvatarProps {
  imageSource: ImageSourcePropType;
  caption?: string;
  subtitle?: string;
  borderRadius?: number;
}

const QuickAvatar: React.FC<QuickAvatarProps> = ({
  imageSource,
  caption = 'Hallo, wie geht es dir?',
  subtitle = 'Schneller realistischer Avatar',
  borderRadius = 24,
}) => {
  return (
    <View style={[styles.container, { borderRadius }]}>
      <ImageBackground
        source={imageSource}
        style={styles.image}
        imageStyle={{ borderRadius }}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <View style={styles.caption}>
          <Text style={styles.captionText}>{caption}</Text>
          {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  image: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  caption: {
    padding: 16,
  },
  captionText: {
    color: COLORS.textInverse,
    fontSize: 20,
    fontWeight: '600',
  },
  subtitleText: {
    color: COLORS.textInverse,
    fontSize: 14,
    marginTop: 4,
  },
});

export default QuickAvatar;

