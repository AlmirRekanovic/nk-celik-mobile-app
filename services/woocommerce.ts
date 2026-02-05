import { WC_BASE_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET } from '@/constants/config';
import { WCProduct, Product } from '@/types/products';

function buildAuthUrl(endpoint: string): string {
  if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    console.error('WooCommerce credentials not configured');
    throw new Error('WooCommerce credentials not configured. Please check your environment variables.');
  }

  const url = new URL(`${WC_BASE_URL}${endpoint}`);
  url.searchParams.append('consumer_key', WC_CONSUMER_KEY);
  url.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);
  return url.toString();
}

function transformWCProduct(product: WCProduct): Product {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    shortDescription: product.short_description,
    price: product.price,
    salePrice: product.sale_price || undefined,
    onSale: product.on_sale,
    imageUrl: product.images?.[0]?.src,
    permalink: product.permalink,
    stockStatus: product.stock_status,
    stockQuantity: product.stock_quantity,
    purchasable: product.purchasable,
    categories: product.categories?.map(cat => cat.name) || [],
  };
}

export async function fetchProducts(page: number = 1, perPage: number = 20): Promise<Product[]> {
  const url = buildAuthUrl(`/products?per_page=${perPage}&page=${page}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }

    const products: WCProduct[] = await response.json();
    return products
      .filter(product => product.catalog_visibility === 'visible')
      .map(transformWCProduct);
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

export async function fetchProductById(id: number): Promise<Product> {
  const url = buildAuthUrl(`/products/${id}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.status}`);
    }

    const product: WCProduct = await response.json();
    return transformWCProduct(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

export async function fetchOrders(customerId?: number): Promise<any[]> {
  let url = buildAuthUrl('/orders');

  if (customerId) {
    url += `&customer=${customerId}`;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}
