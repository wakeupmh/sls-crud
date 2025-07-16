import { z } from "zod";

export const updateProductRequestSchema = z.object({
  sku: z.string().min(1).max(100).optional(),
  productName: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
  brand: z.string().min(1).max(100).optional(),
  price: z.number().optional(),
  stock: z.number().optional(),
  description: z.string().min(1).max(100).optional(),
});

export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
