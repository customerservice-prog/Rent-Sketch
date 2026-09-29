const express=require('express'),db=require('../db');
const {reviewPricing}=require('../reviewPricing');
const router=express.Router();
router.post('/:slug/review-pricing',async(req,res,next)=>{
 try{
  const tenant=(await db.query('SELECT slug,show_prices FROM tenants WHERE slug=$1',[req.params.slug])).rows[0];
  if(!tenant)return res.status(404).json({error:'Tenant not found'});
  res.setHeader('Cache-Control','no-store');
  res.json(await reviewPricing(tenant,req.body||{}));
 }catch(error){
  if(error&&error.status)return res.status(error.status).json({error:error.message});
  next(error);
 }
});
module.exports=router;
