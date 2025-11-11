const validator = require('validator')
const UserAuth = require("../model/usersAuth");
const Profile = require("../model/profile");
const Affiiliate = require("../model/affiliate");
const speakeasy = require('speakeasy');
const { handleNodeMailer } = require("../emailConfig/config")
var bcrypt = require('bcryptjs');
const { handleAllWallets, handleChangeDefaultWalletEl } = require("../wallet_transaction/index")
const { generateSDKaccessToken } = require("../verification/sumsub2")
const httpStatus = require("http-status");
const handleCreateOTP = ((length)=>{
    return Math.floor(Math.pow(10, length-1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length-1) - 1));
}) 
const handleGlobalFaVerification = (async(token, secret)=>{
    const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token
    });
    return verified
})

const externalProfile = (async(req, res)=>{
    try{
        const user_id = req.params.id
        const user = await Profile.findOne({user_id})
        const auth = await UserAuth.findOne({user_id})
        let joined_at = (auth?.created_at)
        if(!user){
            return res.status(401).json("User Not found")
        }
        return res.status(200).json({user, joined_at})
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handleProfile = (async(req, res)=>{
    try{
        const user_id  = req.id
        let wallet = await handleAllWallets(user_id)
        const user = await Profile.findOne({user_id})
        return res.status(200).json({user, wallet})
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const createProfile = (async(data)=>{
    try{
        await Profile.create({
            user_id: data.user_id,
            username: data.username,
            current_level: "Unranked",
            next_level:"Bronze 1",
            emailIsVerified: false,
            level: 0
        })
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handleChangUsername = (async(req, res)=>{
    try{
        const {username} = req.body
       const user_id = req.id
       await Profile.updateOne({user_id},{
            username
       })
       await UserAuth.updateOne({user_id},{
            username
        })
        const user = await Profile.findOne({user_id})
        return res.status(200).json(user)
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handleChangProfilePrivacy = (async(req, res)=>{
    try{
        const {private} = req.body
       const user_id = req.id
       await Profile.updateOne({user_id},{
        profileIsHidden: private
       })
        const user = await Profile.findOne({user_id})
        return res.status(200).json(user)
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handleKYC1 = (async(req, res)=>{
    try{
        const { auth } = req.body
        const user_id  = req.id
        await Profile.updateOne({user_id},{
            kyc1: auth
        })
        const userEl = await Profile.findOne({user_id})
        return res.status(200).json(userEl)
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handleLinkEmail = (async(req, res)=>{
    try{
        const user_id = req.id
        const { email } = req.body
        const user = await UserAuth.findOne({user_id})
        if(user.email === email){
            await Profile.updateOne({user_id},{
                emailIsLinked: true
            })
            const userEl = await Profile.findOne({user_id})
            return res.status(200).json(userEl)
        }
        else{
            return res.status(403).json("Request was unsuccessful")
        }
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handleCreateOtp = (async(req, res)=>{
    try{
        const user_id = req.id
        const user = await UserAuth.findOne({user_id})
        const otp = handleCreateOTP(6)
        let netToken = otp.toString()
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(netToken, salt)
        const nodeMailer=await handleNodeMailer({type: "confirm-email",email:user?.email, code:netToken})
        if(nodeMailer)
        return res.status(httpStatus.OK).json({token: hash})
        else return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({message:"Failed Confirm Email"})
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})


const verifyEmail = (async(req, res)=>{
    try{
        const user_id = req.id
        const { code, token } = req.body
        let codez = code.toString()
        const match = await bcrypt.compare(codez, token)
        if(!match){
            return res.status(404).json('Incorrect code')
        }
        if(match){
            await Profile.updateOne({user_id},{
                emailIsVerified: true,
                is_verified : true
            })
            const userEl = await Profile.findOne({user_id})
            return res.status(200).json(userEl)
        }
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const fetchLoginType = (async(req, res)=>{
    const user_id = req.id
    try{
        if(!user_id){
            return res.status(403).json("Invalid User_id")
        }
        const user = await UserAuth.findOne({user_id})
        return res.status(200).json(user)
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handleChangeProflePicture = (async(req, res)=>{
    const user_id = req.id
    const { image } = req.body
    try{
        if(!user_id){
            return res.status(403).json("Invalid User_id")
        }
        await Profile.updateOne({user_id},{
            profileImg: image
        })
        const user = await Profile.findOne({user_id})
        return res.status(200).json(user)
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const createReferralCode = (async(req, res)=>{
    try{
        const user_id = req.id
        const { code } = req.body
        let data = {
            user_id,
            code,
            user: 0,
            wager: 0,
            claimed: 0,
            available: 0
        }
        if(!user_id){
            return res.status(403).json("Invalid User Id")
        }
        if(!code){
            return res.status(403).json("Code feild is required")
        }
        const reff = await Affiiliate.findOne({user_id, code })
        if(reff?.code){
            return res.status(403).json("Code already in used by you")
        }
        const reff2 = await Affiiliate.findOne({ code })
        if(reff2?.code){
            return res.status(403).json("Code already in used by another user")
        }
        const reffCode = await Affiiliate.find({user_id})
        if(reffCode.length > 10){
            return res.status(403).json("You've exceeded code limit")
        }
        await Affiiliate.create(data)
        const reffCodeNew = await Affiiliate.find({user_id})
        return res.status(200).json(reffCodeNew)
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handleReferralCodeData = (async(req, res)=>{
    try{
        const user_id = req.id
        if(!user_id){
            return res.status(403).json("Invalid User Id")
        }
        const reff = await Affiiliate.find({user_id})
        return res.status(201).json(reff)
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handleRegisterRefCode = (async(req, res)=>{
    const user_id = req.id
    const { code } = req.body
    try{
        if(!user_id){
            return res.status(403).json("Invalid User Id")
        }
        if(!code){
            return res.status(403).json("Enter referral code")
        }
        const refSelf = await Affiiliate.findOne({code, user_id})
        if(refSelf){
            return res.status(403).json("You can't register your code")
        }
        const refCode = await Affiiliate.findOne({code})
        if(!refCode){
            return res.status(403).json("Referral code does not exist")
        }
        await Profile.updateOne({user_id},{
            referral_code: code
        })
         await Affiiliate.updateOne({code},{
            user: parseFloat(refCode?.user) + 1
         })
        const user = await Profile.findOne({user_id})
        return res.status(201).json(user)
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const RegisterRefCode = (async(dtta)=>{
    const user_id = dtta?.user_id
    const code = dtta?.referral
    try{
        if(!user_id){
            return false
        }
        if(!code){
            return false
        }
        const refSelf = await Affiiliate.findOne({code, user_id})
        if(refSelf){
            return false
        }
        const refCode = await Affiiliate.findOne({code})
        if(!refCode){
            return false
        }
        await Profile.updateOne({user_id},{
            referral_code: code
        })
         await Affiiliate.updateOne({code},{
            user: parseFloat(refCode?.user) + 1
         })
        return true
    }
    catch(err){
        console.log(err)
        return false
    }
})

const handleFetchSumsubToken = (async(req, res)=>{
    try{
        const user_id = req.id
        const sumsubToken = await generateSDKaccessToken(user_id)
        return res.status(200).json(sumsubToken)
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handleUpdateVerify = (async(req, res)=>{
    const user_id = req.id
    const { status } = req.body
    try{
        if(!user_id){
            return res.status(403).json("Invalid User_id")
        }
        await Profile.updateOne({user_id},{
            is_verified: status
        })
        const user = await Profile.findOne({user_id})
        return res.status(200).json(user)
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handleCheckEmailChange = (async(req, res)=>{
    const user_id = req.id
    const { emails } = req.body
    try{
        if(!user_id){
            return res.status(403).json("Invalid User_id")
        }
        const Emailexist = await UserAuth.findOne({user_id})
        if (Emailexist?.email !== emails?.old_email){
          return res.status(401).json("Old Email not found, Please enter your correct Email")
        }
        if(emails?.old_email === emails?.new_email){
            return res.status(404).json("Use a diiferent email")
        }
        const newEmail = await UserAuth.findOne({ email: emails?.new_email })
        if (newEmail){
            return res.status(401).json("You already have an acoount with this new email")
          }
        if(!validator.isEmail(emails?.new_email)){
           return res.status(404).json("New Email is not valid")
        }
        return res.status(200).json(emails)
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handleChangeDefaultWallet = (async(req, res)=>{
    try{
        const user_id = req.id
        const {data} = req.body
        await handleChangeDefaultWalletEl(user_id ,data, res)
    }
    catch(err){
        console.log(err)
        return res.status(403).json("Server Error")
    }
})

const handlePasswordValidation = (async(req, res)=>{
    try{
      const { auth } = req.body
      const user_id = req.id
      const user = await UserAuth.findOne({user_id})
      if(user?.password){
        const match = await bcrypt.compare(auth?.oldPassword, user.password)
        if(!match){
          return res.status(404).json('Incorrect old password')
        }
        if(auth?.newPassword === auth?.oldPassword){
          return res.status(404).json('Set a different password')
        }
      }
      if(!validator.isStrongPassword(auth?.newPassword)){
        return res.status(401).json("Please set a strong password")
      }
      return res.status(200).json("Password verified")
    }
    catch(err){
      console.log(err)
      return res.status(500).json("Server error")
    }
})
 
const handleChangePassword = (async(req, res)=>{
    try{
        const user_id = req.id
        const {auth} = req.body
        if(auth){
          const user = await UserAuth.findOne({user_id})
          if (!user){
            return res.status(401).json("Invalid user_id, Please Logout")
          }
          let secret = user.fa_secrete?.base32
          let faToken = auth?._2faCode
          let verify = await handleGlobalFaVerification(faToken, secret)
          if(!verify){
            return res.status(404).json('Incorrect two-factor Authenication')
          }
          const salt = await bcrypt.genSalt(10)
          const hash = await bcrypt.hash(auth?.newPassword, salt) 
          await UserAuth.updateOne({user_id},{
            password: hash,
            login_type:"password"
          })
          return res.status(200).json("successfully done")
        }
    }
    catch(err){
        console.log(err)
        return res.status(500).json("Server error")
      }

})



module.exports = {fetchLoginType,handleChangeProflePicture,RegisterRefCode, handleProfile,handleChangePassword,
     handleKYC1,verifyEmail,handleRegisterRefCode, createProfile,handleCheckEmailChange,handlePasswordValidation,
     handleChangUsername, handleChangProfilePrivacy, handleLinkEmail, handleCreateOtp, handleChangeDefaultWallet,
     createReferralCode, handleReferralCodeData, handleFetchSumsubToken, handleUpdateVerify, externalProfile }