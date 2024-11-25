const mongoose = require("mongoose");
const dotenv = require("dotenv");
const data = require("./data1");
const Samsung = require("./../Models/samPho"); // Changed to Samsung model
dotenv.config({ path: "./config.env" });

// Connect to MongoDB
mongoose
  .connect(
    process.env.DATABASE
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
      const existingProduct = await Samsung.findOne({
        familyId: productData.familyId,
      });

      if (existingProduct) {
        console.log(`Product already exists: ${existingProduct.familyId}`);
        continue; // Skip this product if it already exists
      }

      const product = new Samsung({
        familyRecord: productData.familyRecord,
        familyId: productData.familyId,
        modelCount: productData.modelCount,
        fmyMarketingName: productData.fmyMarketingName,
        fmyEngName: productData.fmyEngName,
        categorySubTypeCode: productData.categorySubTypeCode,
        categorySubTypeEngName: productData.categorySubTypeEngName,
        categorySubTypeName: productData.categorySubTypeName,
        simplePdYN: productData.simplePdYN,
        oldProductYN: productData.oldProductYN,
        productGroupId: productData.productGroupId,
        optionPriceUse: productData.optionPriceUse,
        iaCtaDisplay: productData.iaCtaDisplay,
        wtbOnlineDispFuncUseYN: productData.wtbOnlineDispFuncUseYN,
        wtbDispFuncUseYN: productData.wtbDispFuncUseYN,
        filterParamText: productData.filterParamText,
        thirdPASeller: productData.thirdPASeller,
        isRecommended: productData.isRecommended,
        chipOptions: productData.chipOptions || [], // Default to empty array if undefined
        awardList: productData.awardList || [],
        quickLooks: productData.quickLooks || [],
        localBenefitList: productData.localBenefitList || [],
        modelList: productData.modelList.map((model) => ({
          modelCode: model.modelCode,
          shopSKU: model.shopSKU,
          modelName: model.modelName,
          displayName: model.displayName,
          marketingpdpYN: model.marketingpdpYN,
          thumbUrl: model.thumbUrl,
          thumbUrlAlt: model.thumbUrlAlt,
          largeUrl: model.largeUrl,
          galleryImage: model.galleryImage || [],
          galleryImageAlt: model.galleryImageAlt || [],
          galleryImageLarge: model.galleryImageLarge || [],
          pdpUrl: model.pdpUrl,
          originPdpUrl: model.originPdpUrl,
          configuratorUrl: model.configuratorUrl,
          ratings: model.ratings,
          reviewCount: model.reviewCount,
          reviewUrl: model.reviewUrl,
          energyLabelGrade: model.energyLabelGrade,
          newEnergyLabel: model.newEnergyLabel,
          energyLabelClass1: model.energyLabelClass1,
          energyLabelClass2: model.energyLabelClass2,
          energyFileUrl: model.energyFileUrl,
          ficheFileUrl: model.ficheFileUrl,
          selected: model.selected || "N",
          fmyChipList: model.fmyChipList || [], // Default to empty array
          ctaType: model.ctaType,
          offerCtaFlag: model.offerCtaFlag,
          tariffYN: model.tariffYN,
          wtbUseFlag: model.wtbUseFlag,
          repairabilityIndex: model.repairabilityIndex,
          repairabilityIndexPdfUrl: model.repairabilityIndexPdfUrl,
          stockStatusText: model.stockStatusText,
          financeInfoAmount: model.financeInfoAmount,
          financeInfoValue: model.financeInfoValue,
          tradeIn: model.tradeIn,
          tradeInDesc: model.tradeInDesc,
          tradeInFormattedDesc: model.tradeInFormattedDesc,
          premiumCare: model.premiumCare,
          premiumCareDesc: model.premiumCareDesc,
          premiumCareFormattedDesc: model.premiumCareFormattedDesc,
          financing: model.financing,
          financingDesc: model.financingDesc,
          financingFormattedDesc: model.financingFormattedDesc,
          upgrade: model.upgrade,
          upgradeDesc: model.upgradeDesc,
          upgradeFormattedDesc: model.upgradeFormattedDesc,
          storePromotions: model.storePromotions,
          usp: model.usp || [],
          leasingInfo: model.leasingInfo || {
            leasingUpfront: null,
            leasingMonthly: null,
            leasingMonths: null,
            interest: null,
          },
          price: model.price,
          priceDisplay: model.priceDisplay,
          promotionPrice: model.promotionPrice,
          promotionPriceDisplay: model.promotionPriceDisplay,
          listPrice: model.listPrice,
          listPriceDisplay: model.listPriceDisplay,
          saveText: model.saveText,
          monthlyPriceInfo: model.monthlyPriceInfo || {},
          keySummary: model.keySummary || [],
          pviTypeName: model.pviTypeName,
          pviSubtypeName: model.pviSubtypeName,
          ctaLocalText: model.ctaLocalText,
          ctaEngText: model.ctaEngText,
          configuratorUseYn: model.configuratorUseYn === "Y",
          specCompareYN: model.specCompareYN === "Y",
          isComingSoon: model.isComingSoon || false,
          packageYN: model.packageYN === "Y",
        })),
      });

      await product.save();
      console.log(`Saved product: ${product.fmyMarketingName}`);
    }
    console.log("All products have been uploaded successfully");
  } catch (error) {
    console.error("Error uploading products:", error);
  } finally {
    mongoose.connection.close();
  }
}
