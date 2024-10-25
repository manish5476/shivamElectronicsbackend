const { query } = require("express");
const Product = require("./../Models/productModel");
const ApiFeatures = require("../Utils/ApiFeatures");




//get all data on the basis of the product
exports.getAllProduct = async (req, res) => {
  try {
    const features = new ApiFeatures(Product.find(), req.query)
      .filter()
      .limitFields()
      .sort()
      .paginate();
    const products = await features.query;
    res.status(200).json({
      status: "success",
      result: products.length,
      data: { products },
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message || "Failed to get products",
    });
  }
};

//Create new Product
exports.newProduct = async (req, res) => {
  try {
    const newProduct = await Product.create(req.body);
    console.log(newProduct);
    res.status(201).json({
      status: "success",
      data: {
        Product: newProduct,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err.message || err,
    });
  }
};
//update Product
exports.updateProduct=async(req,res)=>{
  try{
    const product= await Product.findByIdAndUpdate(req.params.id,req.body)
    rea.status(201).json({
      status:'Success',
      data:{        product      }
    })
  } catch(err){
    res.status(400).json({
      status:'fail',
      message:err.message || err,
    })
  }
}

//Delete methodds
exports.deleteProduct=async(req,res)=>{
  try{
    await Product.findByIdAndDelete(req.params.id)
    res.status(200).json({
      Status: 'success',
      message: 'Data deleted successfully',
      data: null,
    });
  }catch(err){
res.status(404).json({
  status:'fail',
  message:'Data Not Found'
})
  }
}

// Get product dropDown data
exports.getProductDropDownWithId=async(req,res)=>{
  try{
    const products = await Product.find().select('modelName modelCode _id');
    res.status(200).json({
      status: 'success',
      results: products.length,
      data: {
        products
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
}