import z from "zod";

export const deleteProductRequestSchema = z.object({
	sku: z.string().min(1).max(100),
});

export type DeleteProductRequest = z.infer<typeof deleteProductRequestSchema>;
