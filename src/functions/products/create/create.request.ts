import { z } from "zod";

export const createProductRequestSchema = z.object({
	sku: z.string().min(1).max(100),
	productName: z.string().min(1).max(100),
	category: z.string().min(1).max(100),
	brand: z.string().min(1).max(100),
	price: z.number().min(0),
	stock: z.number().min(0),
	description: z.string().min(1).max(100),
});

export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;
