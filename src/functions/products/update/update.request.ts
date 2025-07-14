import { z } from "zod";

export const updateProductRequestSchema = z.object({
	sku: z.string().min(1).max(100),
	productName: z.string().min(1).max(100),
	category: z.string().min(1).max(100),
	brand: z.string().min(1).max(100),
	price: z.number(),
	stock: z.number(),
	description: z.string().min(1).max(100),
});

export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;
