# API Testing Guide

This guide explains how to use the Postman collection to test all endpoints of the Serverless Product Catalog API.

## Setup Instructions

### 1. Import the Collection

1. Open Postman
2. Click "Import" button
3. Select the `postman-collection.json` file from the `docs/` folder
4. The collection "Serverless Product Catalog API" will be imported

### 2. Configure Environment Variables

Before running the tests, you need to set up the following variables:

#### Required Variables:
- **`base_url`**: API Gateway endpoint URL
  - Format: `https://your-api-id.execute-api.region.amazonaws.com/stage`
  - Example: `https://abc123def4.execute-api.us-east-1.amazonaws.com/dev`

#### Optional Variables:
- **`test_sku`**: A unique SKU for testing (auto-generated if not set)
  - Default: `TEST-001`
  - Will be auto-generated as `TEST-XXXXXXXXX` if not provided

### 3. Setting Up Variables in Postman

**Option A: Collection Variables (Recommended)**
1. Right-click on the collection name
2. Select "Edit"
3. Go to "Variables" tab
4. Update the `base_url` value with your actual API Gateway URL

**Option B: Environment Variables**
1. Create a new environment in Postman
2. Add variables:
   - `base_url`: Your API Gateway URL
   - `test_sku`: Your preferred test SKU (optional)
3. Select the environment before running tests

## Collection Structure

### 1. Products (Main Operations)
Complete CRUD operations and advanced querying:

- **Create Product**: Creates a new product
- **Get Product by SKU**: Retrieves a single product
- **List All Products**: Gets all products (paginated)
- **Filter by Category**: Filters products by category
- **Filter by Brand**: Filters products by brand
- **Filter by Price Range**: Filters by price range
- **Complex Filter with Sorting**: Multi-criteria filtering with sorting
- **Search by Product Name**: Exact name search
- **Update Product**: Partial product updates
- **Delete Product**: Removes a product

### 2. Test Data Setup
Sample requests to populate your catalog:

- **Create Sample Electronics**: iPhone, Dell laptop
- **Create Sample Clothing**: Nike sneakers
- **Create Sample Book**: AWS architecture book

### 3. Error Scenarios
Tests for proper error handling:

- **Get Non-existent Product**: Tests 404 responses
- **Create Duplicate SKU**: Tests duplicate prevention
- **Invalid Filter Query**: Tests validation errors
- **Update Non-existent Product**: Tests update errors

## Testing Workflow

### Step 1: Deploy Your API
```bash
npm run deploy
```
Note the API Gateway URL from the deployment output.

### Step 2: Update Collection Variables
Set your `base_url` in the collection variables.

### Step 3: Run Test Data Setup (Optional)
Execute the "Test Data Setup" folder to create sample products:
1. Right-click "Test Data Setup" folder
2. Select "Run folder"
3. Click "Run Serverless Product..."

### Step 4: Test Main Operations
Run the "Products" folder to test all CRUD operations:
1. Right-click "Products" folder
2. Select "Run folder"
3. Review test results

### Step 5: Test Error Scenarios
Run the "Error Scenarios" folder to validate error handling.

## Individual Request Testing

### Create Product
```http
POST /products/create
Content-Type: application/json

{
  "sku": "LAPTOP-001",
  "productName": "MacBook Pro 16",
  "category": "Electronics",
  "brand": "Apple",
  "price": 2499.99,
  "stock": 25,
  "description": "16-inch MacBook Pro with M2 Pro chip"
}
```

### Advanced Filtering
```http
GET /products/get?category=Electronics&brand=Apple&minPrice=1000&maxPrice=3000&orderBy=price&orderDirection=ASC&page=1&pageSize=10
```

### Update Product (Partial)
```http
PUT /products/update
Content-Type: application/json

{
  "sku": "LAPTOP-001",
  "price": 2299.99,
  "stock": 20
}
```

## Test Assertions

Each request includes automated tests that verify:

### Success Scenarios:
- ✅ Correct HTTP status codes (200, 201, 204)
- ✅ Response structure validation
- ✅ Data integrity checks
- ✅ Filter and sort functionality

### Error Scenarios:
- ✅ Proper error status codes (400, 404, 409)
- ✅ Error message validation
- ✅ Input validation testing

## Query Parameters Reference

### Filtering Options:
- `category`: Filter by product category
- `brand`: Filter by brand name
- `productName`: Search by exact product name
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter

### Sorting Options:
- `orderBy`: Field to sort by (`name`, `price`, `stock`, `category`, `brand`)
- `orderDirection`: Sort direction (`ASC`, `DESC`)

### Pagination Options:
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 20, max: 100)

## Advanced Testing Scenarios

### Pagination Testing:
```javascript
// Test script for pagination
pm.test("Pagination works correctly", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.products.length).to.be.at.most(10); // pageSize=10
    if (jsonData.lastEvaluatedKey) {
        pm.expect(jsonData.lastEvaluatedKey).to.be.an('object');
    }
});
```

### Performance Testing:
```javascript
// Test script for response time
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(1000); // < 1 second
});
```

### Data Consistency Testing:
```javascript
// Test script for data consistency
pm.test("Created product matches input", function () {
    const response = pm.response.json();
    const request = JSON.parse(pm.request.body.raw);

    pm.expect(response.sku).to.eql(request.sku);
    pm.expect(response.productName).to.eql(request.productName);
    pm.expect(response.price).to.eql(request.price);
});
```