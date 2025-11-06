export interface WPEmbeddedMedia {
  source_url?: string;
}

export interface WPEmbeddedAuthor {
  name?: string;
}

export interface WPPost {
  id: number;
  date: string;
  modified: string;
  slug: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  featured_media?: number;
  _embedded?: {
    "wp:featuredmedia"?: WPEmbeddedMedia[];
    author?: WPEmbeddedAuthor[];
  };
}

export interface NewsItem {
  id: number;
  title: string;
  excerptHtml: string;
  contentHtml: string;
  publishedAt: string;
  updatedAt: string;
  featuredImageUrl?: string;
  authorName?: string;
}

export interface AppSettings {
  backgroundRefreshEnabled: boolean;
  postsPerPage: number;
}
