const usdtModel = require("../model/dollar-wallet")
const FunCoupon = require("../model/fun-wallet")

let usdtWalletIcon =  "/assets/USDT.webp"
let funCouponImage = "/assets/rx-casino-logo.png"

// ================ store default wallet details ===================
const handleWalletInstance = (()=>{
    let wallet = [
        {
           is_active: false,
            balance: 0,
           coin_image: usdtWalletIcon, 
           coin_name: "USDT", 
       },
       {
        is_active: true,   
        balance: 10000,
        coin_image: funCouponImage, 
        coin_name: "Fun", 
       }
   ]
   return wallet
})

const fetchCDWallet = (async(user_id)=>{
    try{
       let response = await usdtModel.findOne({user_id})
       return response
    }
    catch(error){
        console.log(error)
        return null
    }
})

const fetchFunWallet = (async(user_id)=>{
    try{
       let response = await FunCoupon.findOne({user_id})
       return response
    }
    catch(error){
        console.log(error)
        return null
    }
})

const handleAllWallets = (async(user_id)=>{
    let wallet = [await fetchCDWallet(user_id),  await fetchFunWallet(user_id)]
    return wallet
})

 // ================ store CD wallet  details===================
 const createCD = (async(user_id)=>{
    let coin_image = usdtWalletIcon
    let coin_name = "USDT"
    let data = {user_id, balance:0.0000, coin_image, coin_name, is_active: false}
    await usdtModel.create(data)
})

// ================ store FC wallet  details===================
const createFC = (async(user_id)=>{
    let coin_image = funCouponImage
    let date = new Date()
    let data = {user_id, balance:10000, coin_image, coin_name: "Fun", date, is_active: true}
    await FunCoupon.create(data)
})

const handleChangeDefaultWalletEl = (async(user_id ,data, res)=>{
    if(data.coin_image === usdtWalletIcon){
        await usdtModel.updateOne({user_id},{
            is_active: true
        })
        await FunCoupon.updateOne({user_id},{
            is_active: false
        })
    }
    if(data.coin_image === funCouponImage){
        await FunCoupon.updateOne({user_id},{
            is_active: true
        })
        await usdtModel.updateOne({user_id},{
            is_active: false
        })
    }
    let wallet = await handleAllWallets(user_id)
    return res.status(200).json(wallet)
})

const fetchWallet = (async(req, res)=>{
    try{
        const user_id = req.id
        const wallet = req.params.wallet
        if(wallet === "fun"){
            const result = await FunCoupon.findOne({user_id})
            return res.status(200).json(result)
        }
        if(wallet === "usdt"){
            const result = await usdtModel.findOne({user_id})
            return res.status(200).json(result)
        }
    }
    catch(err){
        return res.status(401).json("Internal Sever Error")
    }
})

const wallet = {
    usdt: usdtModel,
    fun: FunCoupon
}

module.exports = {createFC, createCD,wallet,fetchWallet,  handleWalletInstance, handleAllWallets, handleChangeDefaultWalletEl }