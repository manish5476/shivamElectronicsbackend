const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  familyRecord: { type: String },
  familyId: { type: String, required: true },
  modelCount: { type: String },
  fmyMarketingName: { type: String, required: true },
  fmyEngName: { type: String, required: true },
  categorySubTypeCode: { type: String },
  categorySubTypeEngName: { type: String },
  categorySubTypeName: { type: String },
  simplePdYN: { type: String },
  oldProductYN: { type: String },
  productGroupId: { type: String, required: true },
  optionPriceUse: { type: String },
  iaCtaDisplay: { type: String },
  wtbOnlineDispFuncUseYN: { type: String },
  wtbDispFuncUseYN: { type: String },
  filterParamText: { type: String },
  thirdPASeller: { type: String },
  isRecommended: { type: String },
  chipOptions: [
    {
      fmyChipType: { type: String },
      optionTypeSeq: { type: String },
      optionTypeCode: { type: String },
      optionList: [
        {
          optionCode: { type: String },
          optionName: { type: String },
          optionLocalName: { type: String },
          multiColorYN: { type: String },
          multiColorList: { type: [String] },
        },
      ],
    },
  ],
  awardList: { type: [String] },
  quickLooks: { type: [String] },
  localBenefitList: { type: [String] },
  modelList: [
    {
      modelCode: { type: String, required: true },
      shopSKU: { type: String, required: true },
      modelName: { type: String, required: true },
      displayName: { type: String, required: true },
      marketingpdpYN: { type: String },
      thumbUrl: { type: String },
      thumbUrlAlt: { type: String },
      largeUrl: { type: String },
      galleryImage: { type: [String] },
      galleryImageAlt: { type: [String] },
      galleryImageLarge: { type: [String] },
      pdpUrl: { type: String },
      originPdpUrl: { type: String },
      configuratorUrl: { type: String },
      ratings: { type: String },
      reviewCount: { type: String },
      reviewUrl: { type: String },
      energyLabelGrade: { type: String },
      newEnergyLabel: { type: String },
      energyLabelClass1: { type: String },
      energyLabelClass2: { type: String },
      energyFileUrl: { type: String },
      ficheFileUrl: { type: String },
      selected: { type: String, default: "N" },
      fmyChipList: [
        {
          fmyChipType: { type: String },
          optionTypeSeq: { type: String },
          optionTypeCode: { type: String },
          fmyChipCode: { type: String },
          fmyChipName: { type: String },
          fmyChipLocalName: { type: String },
          multiColorYN: { type: String },
          multiColorList: { type: [String] },
        },
      ],
      ctaType: { type: String },
      offerCtaFlag: { type: String },
      tariffYN: { type: String },
      wtbUseFlag: { type: String },
      repairabilityIndex: { type: String },
      repairabilityIndexPdfUrl: { type: String },
      stockStatusText: { type: String },
      financeInfoAmount: { type: String },
      financeInfoValue: { type: String },
      tradeIn: { type: String },
      tradeInDesc: { type: String },
      tradeInFormattedDesc: { type: String },
      premiumCare: { type: String },
      premiumCareDesc: { type: String },
      premiumCareFormattedDesc: { type: String },
      financing: { type: String },
      financingDesc: [{ type: String }],
      financingFormattedDesc: [{ type: String }],
      upgrade: { type: String },
      upgradeDesc: { type: String },
      upgradeFormattedDesc: { type: String },
      storePromotions: { type: String },
      usp: { type: [String] },
      leasingInfo: {
        leasingUpfront: { type: String },
        leasingMonthly: { type: String },
        leasingMonths: { type: String },
        interest: { type: String },
      },
      price: { type: String },
      priceDisplay: { type: String },
      promotionPrice: { type: String },
      promotionPriceDisplay: { type: String },
      listPrice: { type: String },
      listPriceDisplay: { type: String },
      saveText: { type: String },
      monthlyPriceInfo: { type: Object },
      keySummary: [
        {
          displayType: { type: String },
          title: { type: String },
          imgUrl: { type: String },
          imgAlt: { type: String },
        },
      ],
      pviTypeName: { type: String },
      pviSubtypeName: { type: String },
      ctaLocalText: { type: String },
      ctaEngText: { type: String },
      configuratorUseYn: { type: Boolean, default: false },
      specCompareYN: { type: Boolean, default: false },
      isComingSoon: { type: Boolean, default: false },
      packageYN: { type: Boolean, default: false },
    },
  ],
});

module.exports = mongoose.model("Samsung", productSchema);
