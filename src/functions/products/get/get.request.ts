import { z } from "zod";

export const getProductsRequestSchema = z.object({
	brand: z.string().optional(),
	category: z.string().optional(),
	productName: z.string().optional(),
	minPrice: z
		.string()
		.optional()
		.transform((value: string | undefined) =>
			value ? Number(value) : undefined,
		),
	maxPrice: z
		.string()
		.optional()
		.transform((value: string | undefined) =>
			value ? Number(value) : undefined,
		),
	minStock: z
		.string()
		.optional()
		.transform((value: string | undefined) =>
			value ? Number(value) : undefined,
		),
	maxStock: z
		.string()
		.optional()
		.transform((value: string | undefined) =>
			value ? Number(value) : undefined,
		),
	orderBy: z.enum(["name", "price", "stock", "category", "brand"]).optional(),
	orderDirection: z.enum(["ASC", "DESC"]).optional(),
	page: z
		.string()
		.optional()
		.transform((value: string | undefined) => (value ? Number(value) : 1)),
	pageSize: z
		.string()
		.optional()
		.transform((value: string | undefined) => (value ? Number(value) : 10)),
});

export type GetProductsRequest = z.infer<typeof getProductsRequestSchema>;
