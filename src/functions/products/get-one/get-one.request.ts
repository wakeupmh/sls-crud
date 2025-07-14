import { z } from "zod";

export const getOneProductRequestSchema = z.object({
	sku: z.string().min(1).max(100),
});

export type GetOneProductRequest = z.infer<typeof getOneProductRequestSchema>;
