
const Seller = require("../Models/Seller");

const handleFactory = require("./handleFactory");

exports.getAllSeller = handleFactory.getAll(Seller);
exports.getSellerById = handleFactory.getOne(Seller);
exports.newSeller = handleFactory.create(Seller);
exports.deleteSeller = handleFactory.delete(Seller);
exports.updateSeller = handleFactory.update(Seller);
// exports.deleteMultipleSeller = handleFactory.deleteMultipleSeller(Seller)