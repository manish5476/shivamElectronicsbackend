const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");
dotenv.config({ path: "./config.env" });
const data = require("./data.json");
const Product = require("./../Models/Product");
const path = require("path");

// const dataPath = path.join(__dirname, "data.json"); // Adjust if it's in a different folder
// const ProductData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
mongoose
  .connect(
    `mongodb+srv://msms5476mmmm:ms201426@shivamelectronics.ahdcm.mongodb.net/?retryWrites=true&w=majority&appName=ShivamElectronics`
  )
  .then((con) => {});
//
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", function () {
  console.log("Connected to MongoDB");
  uploadProducts();
});
async function uploadProducts() {
  try {
    // await Product. deleteMany({});
    for (const recommendation of data.recommendations) {
      const productData = recommendation.product;
      const modelData = productData.modelList[0]; // Assuming we're using the first model in the list

      const product = new Product({
        name: productData.fmyMarketingName,
        modelCode: modelData.modelCode,
        displayName: modelData.displayName,
        brand: "Samsung", // Assuming all products are Samsung
        price: parseFloat(modelData.price),
        promotionPrice: parseFloat(modelData.promotionPrice),
        listPrice: parseFloat(modelData.listPrice),
        saveText: modelData.saveText,
        description: productData.fmyEngName,
        features: modelData.usp,
        usp: modelData.usp,
        images: modelData.galleryImage,
        galleryImage: modelData.galleryImage,
        galleryImageAlt: modelData.galleryImageAlt,
        thumbUrl: modelData.thumbUrl,
        largeUrl: modelData.largeUrl,
        pdpUrl: modelData.pdpUrl,
        stockStatusText: modelData.stockStatusText,
        category: productData.categorySubTypeEngName,
        categorySubTypeCode: productData.categorySubTypeCode,
        categorySubTypeEngName: productData.categorySubTypeEngName,
        ratingsAverage: parseFloat(modelData.ratings) || 0,
        ratingsCount: parseInt(modelData.reviewCount) || 0,
        chipOptions: productData.chipOptions,
        fmyChipList: modelData.fmyChipList,
        financing: modelData.financing === "Y",
        financingDesc: modelData.financingDesc,
        energyLabelGrade: modelData.energyLabelGrade,
        pviTypeName: modelData.pviTypeName,
        pviSubtypeName: modelData.pviSubtypeName,
        familyId: productData.familyId,
        fmyMarketingName: productData.fmyMarketingName,
        fmyEngName: productData.fmyEngName,
        productGroupId: productData.productGroupId,
        simplePdYN: productData.simplePdYN,
        oldProductYN: productData.oldProductYN,
        configuratorUrl: modelData.configuratorUrl,
        monthlyPriceInfo: modelData.monthlyPriceInfo,
        ctaType: modelData.ctaType,
        offerCtaFlag: modelData.offerCtaFlag,
        wtbUseFlag: modelData.wtbUseFlag,
        tradeIn: modelData.tradeIn,
        tradeInDesc: modelData.tradeInDesc,
        premiumCare: modelData.premiumCare,
        premiumCareDesc: modelData.premiumCareDesc,
        upgrade: modelData.upgrade,
        upgradeDesc: modelData.upgradeDesc,
        topFlags: modelData.topFlags,
        merchandisingText: modelData.merchandisingText,
        keySummary: modelData.keySummary,
        emiCalculatorUrl: modelData.emiCalculatorUrl,
        deliveryYN: modelData.deliveryYN,
        buyingConfigLinkType: modelData.buyingConfigLinkType,
        buyingConfigLink: modelData.buyingConfigLink,
        bespokeCtaUse: modelData.bespokeCtaUse,
        bespokeCtaLink: modelData.bespokeCtaLink,
        ctaLocalText: modelData.ctaLocalText,
        ctaEngText: modelData.ctaEngText,
        configuratorUseYn: modelData.configuratorUseYn,
        pf360IconUse: modelData.pf360IconUse,
        uspText: modelData.uspText,
        lowestWasPrice: parseFloat(modelData.lowestWasPrice) || null,
        lowestWasPriceDisplay: modelData.lowestWasPriceDisplay,
        specCompareYN: modelData.specCompareYN,
        isComingSoon: modelData.isComingSoon,
        packageYN: modelData.packageYN,
        pkgChildModelList: modelData.pkgChildModelList,
        keySpec: modelData.keySpec,
      });
      await product.save();
      console.log(`Saved product: ${product.name}`);
    }
    console.log("All products have been uploaded successfully");
  } catch (error) {
    console.error("Error uploading products:", error);
  } finally {
    mongoose.connection.close();
  }
}
// const dataPath = path.join(__dirname, "data.json"); // Adjust if it's in a different folder
// const ProductData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
// const importData = async () => {
//   try {
//     await Product.create(ProductData);
//     console.log("data Loaded succesfully imported");
//   } catch (err) {
//     console.log(err.message);
//   }
//   process.exit();
// };

// const deleteData = async () => {
//   try {
//     await Product.deleteMany();
//     console.log("data deleted successfully");
//   } catch (err) {
//     console.log(err.message);
//   }
//   process.exit();
// };

// if (process.argv[2] == "--import") {
//   importData();
// } else if (process.argv[2] == "--delete") {
//   deleteData();
// }
// console.log(process.argv);
