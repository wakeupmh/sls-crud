export interface Product {
	pk: string;
	sk: string;
	productName: string;
	price: number;
	stock: number;
	category: string;
	brand: string;
	priceBucket?: string;
	stockBucket?: string;
	description?: string;
}
