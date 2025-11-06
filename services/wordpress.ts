import { WP_BASE_URL, POSTS_ENDPOINT, DEFAULT_PAGE_SIZE } from '@/constants/config';
import { WPPost, NewsItem } from '@/types/news';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export function transformWPPost(post: WPPost): NewsItem {
  const featuredImageUrl = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  const authorName = post._embedded?.author?.[0]?.name;

  return {
    id: post.id,
    title: stripHtml(post.title.rendered),
    excerptHtml: post.excerpt.rendered,
    contentHtml: post.content.rendered,
    publishedAt: post.date,
    updatedAt: post.modified,
    featuredImageUrl,
    authorName,
  };
}

export async function fetchPosts(page: number = 1, perPage: number = DEFAULT_PAGE_SIZE): Promise<NewsItem[]> {
  const url = `${WP_BASE_URL}${POSTS_ENDPOINT}?per_page=${perPage}&page=${page}&_embed=1`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status}`);
    }

    const posts: WPPost[] = await response.json();
    return posts.map(transformWPPost);
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
}

export async function fetchPostById(id: number): Promise<NewsItem> {
  const url = `${WP_BASE_URL}${POSTS_ENDPOINT}/${id}?_embed=1`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch post: ${response.status}`);
    }

    const post: WPPost = await response.json();
    return transformWPPost(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    throw error;
  }
}
