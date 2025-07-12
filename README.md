# Serverless Grocery Store Product Catalog
This repository encapsulates the infrastructure and deployment strategy for a highly scalable, serverless product catalog system designed for grocery store, additionaly it can handle hypermarket scale operations

## Architectural Overview
The system is architecturally composed of a DynamoDB table serving as the primary data store for product entities, complemented by Global Secondary Indexes (GSIs) to facilitate diverse access patterns

Deployment automation is orchestrated via GitHub Actions, implementing a branch-based CI/CD pipeline for distinct development and production environments

AWS Lambda functions, defined within the Serverless Framework, provide the API endpoints for CRUD (Create, Read, Update, Delete) operations on product data. These Lambda functions are augmented with Middy for middleware management and AWS Lambda Powertools for enhanced observability

## DynamoDB Schema Design
The DynamoDB schema is meticulously engineered to address the unique challenges of a hypermarket environment, specifically high cardinality of product SKUs and disparate query patterns

### Single Table Design Pattern for Product Catalog
#### Primary Key (PK): SKU (String - HASH)

The SKU (Stock Keeping Unit) serves as the singular identifier for each distinct product variant. This choice optimizes for uniform data distribution across DynamoDB partitions, mitigating the risk of "hot partitions" for direct item access. GetItem operations, critical for point-in-time lookups (for example, POS system integration)

#### Sort Key (SK): DETAILS (String - RANGE)

A static SK value (DETAILS) is employed here.
Given the SKU's inherent uniqueness, the SK is not required for disambiguation, so it is not used for queries, this design simplifies item modeling while preserving extensibility for potential future multi-record per SKU scenarios (for example versioning, localized data)

`Billing Mode: PAY_PER_REQUEST (On-Demand)`


### Global Secondary Indexes (GSIs)
GSIs are indispensable for enabling efficient query patterns that do not align with the primary key of the base table. Each GSI maintains its own partition key and sort key, providing alternative access paths to the data

### CategoryIndex

Facilitates retrieval of all products belonging to a specific category

`PK: category (String - HASH)`

`SK: pk (String - RANGE, mapping to SKU from the base table)`

Category serves as a natural partition key for category-based queries. Using pk (SKU) as the sort key enables lexicographical sorting within a category and ensures uniqueness for composite keys

Projection: INCLUDE (Specific attributes: sk, brand, price, stock, name, description)

### brandIndex

Enables retrieval of all products belonging to a specific brand.

`PK: brand (String - HASH)`

`SK: pk (String - RANGE, mapping to SKU from the base table)`

brand provides an effective partition key for brand-centric access patterns. pk (SKU) as the sort key allows for ordered retrieval and uniqueness

Projection: INCLUDE (Specific attributes: sk, category, price, stock, name, description)

### priceIndex

Supports range queries on product prices

`PK: priceBucket (String - HASH)`

`SK: price (Number - RANGE)`

To circumvent "hot partition" issues inherent in querying numerical ranges across a single partition, a sharding strategy is implemented.
The priceBucket attribute (e.g., `hash(SKU) % N`, where `N` is the number of buckets, in this case we are using `10`) distributes write and read operations across multiple logical partitions, price then acts as the sort key for efficient range filtering. Application-side logic is required to query all N buckets concurrently and aggregate results.

Projection: INCLUDE (Specific attributes: pk, sk, category, brand, stock, name, description).

### stockIndex

Purpose: Facilitates identification of products with low stock levels

`PK: stockBucket (String - HASH)`

`SK: stock (Number - RANGE)`

Similar to `priceIndex`, a sharding strategy using `stockBucket` (e.g., hash(SKU) % N) is employed to distribute load and prevent hot partitions when querying for stock thresholds, `stock` functions as the sort key for range-based stock level queries

Projection: INCLUDE (Specific attributes: pk, sk, category, brand, price, name, description)

## Deployment Workflow (GitHub Actions)
The CI/CD pipeline is established using GitHub Actions to automate the deployment of the serverless application

### Branching Strategy
`feat/*` branches: Pushes to any branch prefixed with `feat/` (e.g., `feat/new-feature-x`) trigger a deployment to the `dev` stage. This facilitates rapid iteration and testing in a non-production environment

`main` branch: Pushes to the `main` branch trigger a deployment to the `prod` stage. This ensures that only stable, reviewed code reaches the production environment

### Workflow Steps
The deploy.yml workflow orchestrates the following sequence:
- Checkout code: Retrieves the repository content
- Setup Node.js: Configures the Node.js runtime (v20) and caches npm dependencies for accelerated build times
- Install dependencies: Executes `npm ci` to install project dependencies, ensuring a clean and reproducible installation
- Configure AWS Credentials: Utilizes `aws-actions/configure-aws-credentials` to authenticate with AWS using repository secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`)
- Determine Stage: A shell script step dynamically ascertains the deployment stage (`dev` or `prod`) based on the `github.ref_name` (branch name). This value is exported as an environment variable (`STAGE`). The job fails if no matching stage is identified
- Deploy with Serverless to `${{ env.STAGE }}`: Invokes the Serverless Framework's deploy command, passing the determined stage (`--stage ${{ env.STAGE }}`)
- The `SERVERLESS_ACCESS_KEY` is provided via repository secrets for Serverless Dashboard integration

### Required Secrets
The following secrets must be configured in your GitHub repository settings:

- `AWS_ACCESS_KEY_ID`: AWS Access Key ID with sufficient permissions for DynamoDB and Lambda deployments

- `AWS_SECRET_ACCESS_KEY`: Corresponding AWS Secret Access Key

- `AWS_REGION`: The AWS region for deployment (e.g., sa-east-1)

- `SERVERLESS_ACCESS_KEY`: Your Serverless Framework access key for dashboard integration

### Local Development and Code Quality
To set up the project locally:

- Clone the repository
- Ensure Node.js v20 is installed
- Install project dependencies: `npm ci`
- Configure AWS CLI with appropriate credentials
- Deploy to a development stage: `npx serverless deploy --stage dev`

### Code Quality and Pre-commit Hooks
This project enforces code quality standards through automated tooling integrated into the development workflow:

- *Biome*: Utilized for comprehensive code formatting (npm run format) and linting (npm run lint), ensuring consistent code style and identifying potential issues
- *Lefthook*: Configured as a Git pre-commit hook manager. It automatically executes biome's formatting and linting checks prior to commit, preventing non-compliant code from entering the version control system. This ensures a clean and consistent codebase

### Testing
- Execute unit tests: `npm test`
- Run integration tests: `npm run test:integration` (requires .env file configuration)
