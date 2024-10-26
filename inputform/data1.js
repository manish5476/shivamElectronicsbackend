sampledata={
  "productId": "prod_001",
  "name": "Smart Refrigerator",
  "description": {
    "text": "A high-efficiency smart refrigerator with advanced cooling technology.",
    "images": [
      {
        "url": "http://example.com/description-image1.jpg",
        "altText": "Smart Refrigerator in Kitchen"
      },
      {
        "url": "http://example.com/description-image2.jpg",
        "altText": "Interior View of Refrigerator"
      }
    ],
    "video": {
      "url": "http://example.com/product-video.mp4",
      "description": "Product demonstration video."
    }
  },
  "category": {
    "main": "Electrical Appliances",
    "sub": "Refrigerators",
    "subCategories": ["French Door", "Smart Refrigerators"]
  },
  "brand": {
    "name": "CoolTech",
    "logo": "http://example.com/logo.jpg",
    "website": "http://cooltech.com",
    "established": "1995",
    "country": "USA"
  },
  "price": {
    "current": 1199.99,
    "original": 1399.99,
    "currency": "USD",
    "discount": {
      "percentage": 15,
      "expiresOn": "2024-12-31"
    },
    "financingOptions": [
      {
        "term": "12 months",
        "monthlyPayment": 100.00,
        "interestRate": "0% APR"
      }
    ]
  },
  "stock": {
    "quantity": 75,
    "status": "in_stock",
    "restockDate": "2024-05-01",
    "warehouseLocation": "Warehouse B, City, State"
  },
  "images": {
    "default": "http://example.com/default.jpg",
    "variants": [
      {
        "color": "Silver",
        "images": [
          {
            "imageUrl": "http://example.com/silver-1.jpg",
            "altText": "Silver Refrigerator Front View"
          },
          {
            "imageUrl": "http://example.com/silver-2.jpg",
            "altText": "Silver Refrigerator Side View"
          }
        ],
        "stock": 40
      },
      {
        "color": "Black",
        "images": [
          {
            "imageUrl": "http://example.com/black-1.jpg",
            "altText": "Black Refrigerator Front View"
          },
          {
            "imageUrl": "http://example.com/black-2.jpg",
            "altText": "Black Refrigerator Side View"
          }
        ],
        "stock": 35
      }
    ],
    "360View": "http://example.com/360-view.jpg"
  },
  "specifications": {
    "dimensions": {
      "width": "70 cm",
      "height": "180 cm",
      "depth": "75 cm"
    },
    "weight": "80 kg",
    "energyRating": "A+++",
    "features": [
      { "text": "Smart Home Integration" },
      { "text": "Energy Efficient" },
      { "text": "Temperature Control" }
    ],
    "warranty": {
      "period": "3 years",
      "details": "Comprehensive warranty covering parts and labor."
    },
    "materials": ["Stainless Steel", "Plastic", "Glass"],
    "usageInstructions": "Refer to the user manual for installation and use.",
    "safetyWarnings": [
      "Keep away from water sources.",
      "Do not overload shelves."
    ]
  },
  "metadata": {
    "sku": "SKU123456",
    "tags": ["energy-efficient", "smart refrigerator", "home appliance"],
    "releaseDate": "2024-01-15",
    "timestamps": {
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-10-01T12:00:00Z"
    },
    "relatedProducts": [
      {
        "productId": "prod_002",
        "name": "CoolTech Freezer"
      },
      {
        "productId": "prod_003",
        "name": "CoolTech Water Dispenser"
      }
    ]
  },
  "shipping": {
    "weight": "85 kg",
    "dimensions": {
      "width": "75 cm",
      "height": "185 cm",
      "depth": "80 cm"
    },
    "options": [
      {
        "method": "Standard Shipping",
        "cost": 25.00,
        "estimatedDelivery": "5-7 days"
      },
      {
        "method": "Express Shipping",
        "cost": 60.00,
        "estimatedDelivery": "2-3 days"
      }
    ],
    "handlingInstructions": "Fragile, handle with care."
  },
  "reviews": [
    {
      "reviewId": "review_001",
      "userId": "user_001",
      "rating": 4.8,
      "comment": "Fantastic refrigerator! Keeps everything fresh.",
      "date": "2024-10-01",
      "helpfulCount": 15,
      "responses": [
        {
          "adminId": "admin_001",
          "response": "Thank you for your feedback!",
          "date": "2024-10-02"
        }
      ]
    },
    {
      "reviewId": "review_002",
      "userId": "user_002",
      "rating": 4.0,
      "comment": "Great features but a bit noisy.",
      "date": "2024-09-15",
      "helpfulCount": 5
    }
  ]
}
