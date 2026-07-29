export interface Category {
  id: string;
  name: string;
  slug: string;
  /** lucide icon name used in the UI */
  icon: string;
}

export interface Spec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  brand: string;
  /** price in the store currency (major units) */
  price: number;
  /** optional discounted price; when set and < price, shown as a deal */
  salePrice?: number;
  /** units remaining in stock */
  quantity: number;
  /** optional rich description */
  description?: string;
  /** image URLs — first is the primary/cover */
  images: string[];
  /** optional technical specs shown on the product view */
  specs?: Spec[];
  featured?: boolean;
  createdAt: number;
}

export interface StoreSettings {
  storeName: string;
  currency: string;
  currencySymbol: string;
  whatsapp: string; // international number, digits only e.g. 2348012345678
  instagram: string; // handle without @
  snapchat: string; // handle without @
  telegram: string; // handle without @
  tagline: string;
}

export interface StoreData {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
}
