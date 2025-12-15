import { Image } from 'react-native';

export const preloadImages = async (urls: string[]): Promise<void> => {
  const promises = urls.map(url => {
    return new Promise<void>((resolve, reject) => {
      Image.prefetch(url)
        .then(() => resolve())
        .catch(() => resolve());
    });
  });

  await Promise.all(promises);
};

export const preloadNewsImages = async (posts: Array<{ featuredImageUrl?: string }>): Promise<void> => {
  const imageUrls = posts
    .filter(post => post.featuredImageUrl)
    .map(post => post.featuredImageUrl as string)
    .slice(0, 20);

  await preloadImages(imageUrls);
};
