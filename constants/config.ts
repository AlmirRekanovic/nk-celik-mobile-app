export const WP_BASE_URL = "https://nkcelik.ba/wp-json/wp/v2";
export const POSTS_ENDPOINT = "/posts";
export const DEFAULT_PAGE_SIZE = 20;
export const BACKGROUND_FETCH_INTERVAL_MINUTES = 10;
export const CACHE_KEY_POSTS = "NK_CELIK_NEWS_POSTS";
export const CACHE_KEY_LAST_SYNC = "NK_CELIK_LAST_SYNC";
export const CACHE_KEY_SETTINGS = "NK_CELIK_SETTINGS";
export const MAX_CACHED_POSTS = 100;

export const WC_BASE_URL = "https://nkcelik.ba/wp-json/wc/v3";
export const WC_CONSUMER_KEY = process.env.EXPO_PUBLIC_WC_CONSUMER_KEY || "";
export const WC_CONSUMER_SECRET = process.env.EXPO_PUBLIC_WC_CONSUMER_SECRET || "";
export const CACHE_KEY_PRODUCTS = "NK_CELIK_PRODUCTS";
