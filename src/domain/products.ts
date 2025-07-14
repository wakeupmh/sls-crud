export interface Product {
  pk: string;
  sk: string;
  pkBrandPrice: string;
  skBrandPrice: string;
  pkCategoryBrandPrice: string;
  skCategoryBrandPrice: string;
  pkProduct: string;
  skProduct: string;
  stock: number;
  price: number;
  productName: string;
  category: string;
  brand: string;
  description?: string;
  sku: string;
}

export interface PresentationProduct
  extends Omit<
    Product,
    | "pk"
    | "sk"
    | "pkBrandPrice"
    | "skBrandPrice"
    | "pkCategoryBrandPrice"
    | "skCategoryBrandPrice"
    | "pkProduct"
    | "skProduct"
  > {}
