const mongoose = require("mongoose");
const dotenv = require("dotenv");
const data = require("./data.111");
const Product = require("./../Models/Product"); // Assuming you have a Product schema defined
dotenv.config({ path: "./config.env" });

// Connect to MongoDB
mongoose
  .connect(
    `mongodb+srv://msms5476mmmm:ms201426@shivamelectronics.ahdcm.mongodb.net/?retryWrites=true&w=majority&appName=ShivamElectronics`
  )
  .then(() => {
    console.log("MongoDB connection successful!");
    uploadProducts();
  })
  .catch((error) => console.error("MongoDB connection error:", error));

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", function () {
  console.log("Connected to MongoDB");
});

async function uploadProducts() {
  try {
    for (const productData of data) {
      const existingProduct = await Product.findOne({
        modelCode: productData.modelCode,
      });

      if (existingProduct) {
        console.log(`Product already exists: ${existingProduct.displayName}`);
        continue; // Skip this product if it already exists
      }

      const product = new Product({
        modelCode: productData.modelCode,
        modelName: productData.modelName,
        displayName: productData.displayName,
        thumbUrl: productData.thumbUrl,
        thumbUrlAlt: productData.thumbUrlAlt,
        largeUrl: productData.largeUrl,
        galleryImage: productData.galleryImage,
        galleryImageAlt: productData.galleryImageAlt,
        ratingsAverage: parseFloat(productData.ratings) || 0,
        ratingsCount: parseInt(productData.reviewCount) || 0,
        reviewUrl: productData.reviewUrl,
        selected: productData.selected === "Y",
        fmyChipList: productData.fmyChipList,
        ctaType: productData.ctaType,
        stockStatusText: productData.stockStatusText,
        description: productData.description,
        price: parseFloat(productData.price),
        priceDisplay: productData.priceDisplay,
        promotionPrice: parseFloat(productData.promotionPrice),
        promotionPriceDisplay: productData.promotionPriceDisplay,
        listPrice: parseFloat(productData.listPrice),
        listPriceDisplay: productData.listPriceDisplay,
        saveText: productData.saveText,
        monthlyPriceInfo: productData.monthlyPriceInfo,
        keySummary: productData.keySummary,
        pviTypeName: productData.pviTypeName,
        pviSubtypeName: productData.pviSubtypeName,
        ctaLocalText: productData.ctaLocalText,
        ctaEngText: productData.ctaEngText,
        configuratorUseYn: productData.configuratorUseYn === "Y",
        specCompareYN: productData.specCompareYN === "Y",
        isComingSoon: productData.isComingSoon || false,
        packageYN: productData.packageYN === "Y",
      });

      await product.save();
      console.log(`Saved product: ${product.displayName}`);
    }
    console.log("All products have been uploaded successfully");
  } catch (error) {
    console.error("Error uploading products:", error);
  } finally {
    mongoose.connection.close();
  }
}
