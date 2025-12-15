import { memo } from 'react';
import { Image, ImageStyle, StyleProp, View, StyleSheet } from 'react-native';

interface OptimizedImageProps {
  uri: string;
  style: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

const OptimizedImage = memo(({ uri, style, resizeMode = 'cover' }: OptimizedImageProps) => {
  return (
    <Image
      source={{ uri, cache: 'force-cache' }}
      style={style}
      resizeMode={resizeMode}
      fadeDuration={200}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
