const PERMISSIONS = [
    // Invoices
    { tag: "invoice:read_one", method: "GET", path: "/api/v1/invoices/:id", description: "Get Single Invoice" },
    { tag: "invoice:generate_pdf", method: "GET", path: "/api/v1/invoices/:id/pdf", description: "Generate Invoice PDF" },
    { tag: "invoice:read_all", method: "GET", path: "/api/v1/invoices", description: "Get All Invoices" },
    { tag: "invoice:create", method: "POST", path: "/api/v1/invoices", description: "Create Invoice(s)" },
    { tag: "invoice:get_sales", method: "POST", path: "/api/v1/invoices/productSales", description: "Get Product Sales Data" },
    { tag: "invoice:update", method: "PATCH", path: "/api/v1/invoices/:id?", description: "Update Invoice(s)" },
    { tag: "invoice:delete", method: "DELETE", path: "/api/v1/invoices/:id?", description: "Delete Invoice(s)" },

    // Dashboard
    { tag: "dashboard:read_summary", method: "GET", path: "/api/v1/dashboard/summary", description: "Get Dashboard Summary" },
    { tag: "dashboard:read_sales_stats", method: "GET", path: "/api/v1/dashboard/sales/*", description: "Get All Sales Statistics" },
    { tag: "dashboard:read_product_stats", method: "GET", path: "/api/v1/dashboard/products/*", description: "Get All Product Statistics" },
    { tag: "dashboard:read_customer_stats", method: "GET", path: "/api/v1/dashboard/customers/*", description: "Get All Customer Statistics" },
    { tag: "dashboard:read_payment_stats", method: "GET", path: "/api/v1/dashboard/payments/*", description: "Get All Payment Statistics" },
    { tag: "dashboard:read_review_stats", method: "GET", path: "/api/v1/dashboard/reviews/*", description: "Get All Review Statistics" },
    { tag: "dashboard:read_logs", method: "GET", path: "/api/v1/dashboard/logs", description: "Get System Logs (SuperAdmin Only)" },

    // Customers
    { tag: "customer:read_one", method: "GET", path: "/api/v1/customers/:id", description: "Get Single Customer" },
    { tag: "customer:read_snapshot", method: "GET", path: "/api/v1/customers/:id/snapshot", description: "Get Customer Snapshot Report" },
    { tag: "customer:read_all", method: "GET", path: "/api/v1/customers", description: "Get All Customers" },
    { tag: "customer:create", method: "POST", path: "/api/v1/customers", description: "Create Customer(s)" },
    { tag: "customer:update", method: "PATCH", path: "/api/v1/customers/:id?", description: "Update Customer(s)" },
    { tag: "customer:delete", method: "DELETE", path: "/api/v1/customers/:id?", description: "Delete Customer(s)" },

    // Master Lists
    { tag: "masterlist:read_module", method: "GET", path: "/api/v1/masterlist/:module", description: "Get Module Master List" },
    { tag: "masterlist:search", method: "GET", path: "/api/v1/masterlist/search", description: "Search Master List" },

    // Payments
    { tag: "payment:create", method: "POST", path: "/api/v1/payments", description: "Create Payment(s)" },
    { tag: "payment:read_one", method: "GET", path: "/api/v1/payments/:id", description: "Get Single Payment" },
    { tag: "payment:read_all", method: "GET", path: "/api/v1/payments", description: "Get All Payments" },
    { tag: "payment:update", method: "PATCH", path: "/api/v1/payments/:id?", description: "Update Payment(s)" },
    { tag: "payment:delete", method: "DELETE", path: "/api/v1/payments/:id?", description: "Delete Payment(s)" },

    // Products
    { tag: "product:read_all", method: "GET", path: "/api/v1/products", description: "Get All Products" },
    { tag: "product:read_one", method: "GET", path: "/api/v1/products/:id", description: "Get Single Product" },
    { tag: "product:create", method: "POST", path: "/api/v1/products", description: "Create Product(s)" },
    { tag: "product:update", method: "PATCH", path: "/api/v1/products/:id?", description: "Update Product(s)" },
    { tag: "product:delete", method: "DELETE", path: "/api/v1/products/:id?", description: "Delete Product(s)" },

    // Reviews (nested under products)
    { tag: "review:read_all", method: "GET", path: "/api/v1/products/:productId/reviews", description: "Get All Reviews for a Product" },
    { tag: "review:create", method: "POST", path: "/api/v1/products/:productId/reviews", description: "Create a Review" },
    { tag: "review:read_one", method: "GET", path: "/api/v1/products/:productId/reviews/:id", description: "Get Single Review" },
    { tag: "review:update", method: "PATCH", path: "/api/v1/products/:productId/reviews/:id", description: "Update a Review" },
    { tag: "review:delete", method: "DELETE", path: "/api/v1/products/:productId/reviews/:id", description: "Delete a Review" },

    // Sellers
    { tag: "seller:read_all", method: "GET", path: "/api/v1/sellers", description: "Get All Sellers" },
    { tag: "seller:create", method: "POST", path: "/api/v1/sellers", description: "Create Seller" },
    { tag: "seller:read_one", method: "GET", path: "/api/v1/sellers/:id", description: "Get Single Seller" },
    { tag: "seller:update", method: "PATCH", path: "/api/v1/sellers/:id", description: "Update Seller" },
    { tag: "seller:delete", method: "DELETE", path: "/api/v1/sellers/:id", description: "Delete Seller" },

    // Statistics
    { tag: "stats:read_dashboard", method: "GET", path: "/api/v1/statistics/dashboard", description: "Get Dashboard Stats" },
    { tag: "stats:read_top_products", method: "GET", path: "/api/v1/statistics/top-products", description: "Get Top Selling Products" },
    { tag: "stats:read_customer_payments", method: "GET", path: "/api/v1/statistics/customer-payments", description: "Get Customer Payment Stats" },
    { tag: "stats:read_sales_trend", method: "GET", path: "/api/v1/statistics/sales-trend", description: "Get Monthly Sales Trend" },
    { tag: "stats:read_upcoming_emis", method: "GET", path: "/api/v1/statistics/upcoming-emis", description: "Get Upcoming EMI Payments" },
    { tag: "stats:read_inventory", method: "GET", path: "/api/v1/statistics/inventory", description: "Get Inventory Status" },

    // Users
    { tag: "user:read_all", method: "GET", path: "/api/v1/users/allusers", description: "Get All Users" },
    { tag: "user:read_one", method: "GET", path: "/api/v1/users/:id", description: "Get Single User" },
    { tag: "user:update_any", method: "PATCH", path: "/api/v1/users/updateUser/:id", description: "Update Any User" },
    { tag: "user:delete_any", method: "DELETE", path: "/api/v1/users/deleteUser/:id", description: "Delete Any User" },

    // Transactions
    { tag: "transaction:get", method: "GET", path: "/api/v1/transactions", description: "Get All Transactions type= (Sales, Payments, etc.)" },

    // Analytics
    { tag: 'analytics:read_sales_performance', method: 'GET', path: '/api/v1/analytics/sales-performance', description: 'Get Sales Performance Metrics' },
    { tag: 'analytics:read_customer_insights', method: 'GET', path: '/api/v1/analytics/customer-insights', description: 'Get Customer Insights' },
    { tag: 'analytics:read_product_performance', method: 'GET', path: '/api/v1/analytics/product-performance', description: 'Get Product Performance Analysis' },
    { tag: 'analytics:read_payment_efficiency', method: 'GET', path: '/api/v1/analytics/payment-efficiency', description: 'Get Payment Collection Efficiency' },
    { tag: 'analytics:read_inventory_turnover', method: 'GET', path: '/api/v1/analytics/inventory-turnover', description: 'Get Inventory Turnover Rate' },
    { tag: 'analytics:read_sales_forecast', method: 'GET', path: '/api/v1/analytics/sales-forecast', description: 'Get Sales Forecast' },
    { tag: 'analytics:read_customer_segments', method: 'GET', path: '/api/v1/analytics/customer-segments', description: 'Get Customer Segments' },
];

module.exports = PERMISSIONS;

// Transaction Log	GET /api/v1/transactions <br> Example: /api/v1/transactions?type=sales&startDate=2025-08-01
// Customer Snapshot	GET /api/v1/customers/:id/snapshot <br> Example: /api/v1/customers/689db38103db428d86e9f0af/snapshot
// PDF Invoice Generation	GET /api/v1/invoices/:id/pdf <br> Example: /api/v1/invoices/68a5e694cb3427b068d86903/pdf
// Sales Forecasting	GET /api/v1/analytics/sales-forecast <br> Provides a forecast based on all historical data.
// Customer Segmentation	GET /api/v1/analytics/customer-segments <br> Segments all customers into high-value, recent, and at-risk groups.
// Proactive Notifications	This is an automated backend feature. It runs daily to check for low stock and overdue invoices and sends email alerts. There is no API endpoint to call.















// const PERMISSIONS = [
//     // Invoices
//     { tag: "invoice:read_one", method: "GET", path: "/api/v1/invoices/:id", description: "Get Single Invoice", },
//     { tag: "invoice:generate_pdf", method: "GET", path: "/api/v1/invoices/:id/pdf", description: "Generate Invoice PDF", },
//     { tag: "invoice:read_all", method: "GET", path: "/api/v1/invoices", description: "Get All Invoices", },
//     { tag: "invoice:create", method: "POST", path: "/api/v1/invoices", description: "Create Invoice(s)", },
//     { tag: "invoice:get_sales", method: "POST", path: "/api/v1/invoices/productSales", description: "Get Product Sales Data", },
//     { tag: "invoice:update", method: "PATCH", path: "/api/v1/invoices/:id?", description: "Update Invoice(s)", },
//     { tag: "invoice:delete", method: "DELETE", path: "/api/v1/invoices/:id?", description: "Delete Invoice(s)", },

//     // Dashboard
//     { tag: "dashboard:read_summary", method: "GET", path: "/api/v1/dashboard/summary", description: "Get Dashboard Summary", },
//     { tag: "dashboard:read_sales_stats", method: "GET", path: "/api/v1/dashboard/sales/*", description: "Get All Sales Statistics", },
//     { tag: "dashboard:read_product_stats", method: "GET", path: "/api/v1/dashboard/products/*", description: "Get All Product Statistics", },
//     { tag: "dashboard:read_customer_stats", method: "GET", path: "/api/v1/dashboard/customers/*", description: "Get All Customer Statistics", },
//     { tag: "dashboard:read_payment_stats", method: "GET", path: "/api/v1/dashboard/payments/*", description: "Get All Payment Statistics", },
//     { tag: "dashboard:read_review_stats", method: "GET", path: "/api/v1/dashboard/reviews/*", description: "Get All Review Statistics", },
//     { tag: "dashboard:read_logs", method: "GET", path: "/api/v1/dashboard/logs", description: "Get System Logs (SuperAdmin Only)", },

//     // Customers
//     { tag: "customer:read_one", method: "GET", path: "/api/v1/customers/:id", description: "Get Single Customer", },
//     { tag: "customer:read_all", method: "GET", path: "/api/v1/customers", description: "Get All Customers", },
//     { tag: "customer:create", method: "POST", path: "/api/v1/customers", description: "Create Customer(s)", },
//     { tag: "customer:update", method: "PATCH", path: "/api/v1/customers/:id?", description: "Update Customer(s)", },
//     { tag: "customer:delete", method: "DELETE", path: "/api/v1/customers/:id?", description: "Delete Customer(s)", },

//     // Master Lists
//     { tag: "masterlist:read_module", method: "GET", path: "/api/v1/masterlist/:module", description: "Get Module Master List", },
//     { tag: "masterlist:search", method: "GET", path: "/api/v1/masterlist/search", description: "Search Master List", },
//     { tag: "customer:read_snapshot", method: "GET", path: "/api/v1/customers/:id/snapshot", description: "Get Customer Snapshot Report", }, // <-- ADD THIS LINE

//     // Payments
//     { tag: "payment:create", method: "POST", path: "/api/v1/payments", description: "Create Payment(s)", },
//     { tag: "payment:read_one", method: "GET", path: "/api/v1/payments/:id", description: "Get Single Payment", },
//     { tag: "payment:read_all", method: "GET", path: "/api/v1/payments", description: "Get All Payments", },
//     { tag: "payment:update", method: "PATCH", path: "/api/v1/payments/:id?", description: "Update Payment(s)", },
//     { tag: "payment:delete", method: "DELETE", path: "/api/v1/payments/:id?", description: "Delete Payment(s)", },

//     // Products
//     { tag: "product:read_all", method: "GET", path: "/api/v1/products", description: "Get All Products", },
//     { tag: "product:read_one", method: "GET", path: "/api/v1/products/:id", description: "Get Single Product", },
//     { tag: "product:create", method: "POST", path: "/api/v1/products", description: "Create Product(s)", },
//     { tag: "product:update", method: "PATCH", path: "/api/v1/products/:id?", description: "Update Product(s)", },
//     { tag: "product:delete", method: "DELETE", path: "/api/v1/products/:id?", description: "Delete Product(s)", },

//     // Reviews (nested under products)
//     { tag: "review:read_all", method: "GET", path: "/api/v1/products/:productId/reviews", description: "Get All Reviews for a Product", },
//     { tag: "review:create", method: "POST", path: "/api/v1/products/:productId/reviews", description: "Create a Review", },
//     { tag: "review:read_one", method: "GET", path: "/api/v1/products/:productId/reviews/:id", description: "Get Single Review", },
//     { tag: "review:update", method: "PATCH", path: "/api/v1/products/:productId/reviews/:id", description: "Update a Review", },
//     { tag: "review:delete", method: "DELETE", path: "/api/v1/products/:productId/reviews/:id", description: "Delete a Review", },

//     // Sellers
//     { tag: "seller:read_all", method: "GET", path: "/api/v1/sellers", description: "Get All Sellers", },
//     { tag: "seller:create", method: "POST", path: "/api/v1/sellers", description: "Create Seller", },
//     { tag: "seller:read_one", method: "GET", path: "/api/v1/sellers/:id", description: "Get Single Seller", },
//     { tag: "seller:update", method: "PATCH", path: "/api/v1/sellers/:id", description: "Update Seller", },
//     { tag: "seller:delete", method: "DELETE", path: "/api/v1/sellers/:id", description: "Delete Seller", },

//     // Statistics
//     { tag: "stats:read_dashboard", method: "GET", path: "/api/v1/statistics/dashboard", description: "Get Dashboard Stats", },
//     { tag: "stats:read_top_products", method: "GET", path: "/api/v1/statistics/top-products", description: "Get Top Selling Products", },
//     { tag: "stats:read_customer_payments", method: "GET", path: "/api/v1/statistics/customer-payments", description: "Get Customer Payment Stats", },
//     { tag: "stats:read_sales_trend", method: "GET", path: "/api/v1/statistics/sales-trend", description: "Get Monthly Sales Trend", },
//     { tag: "stats:read_upcoming_emis", method: "GET", path: "/api/v1/statistics/upcoming-emis", description: "Get Upcoming EMI Payments", },
//     { tag: "stats:read_inventory", method: "GET", path: "/api/v1/statistics/inventory", description: "Get Inventory Status", },

//     // Users
//     { tag: "user:read_all", method: "GET", path: "/api/v1/users/allusers", description: "Get All Users", },
//     { tag: "user:read_one", method: "GET", path: "/api/v1/users/:id", description: "Get Single User", },
//     { tag: "user:update_any", method: "PATCH", path: "/api/v1/users/updateUser/:id", description: "Update Any User", },
//     { tag: "user:delete_any", method: "DELETE", path: "/api/v1/users/deleteUser/:id", description: "Delete Any User", },

//     // transactions details
//     { tag: "transaction:get", method: "GET", path: "/api/v1/transactions/", description: "get Any transaction.sales,payment", },
// ];

// module.exports = PERMISSIONS;
