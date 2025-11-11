const jwt = require("jsonwebtoken");
var bcrypt = require('bcryptjs');
const validator = require('validator')
const UserAuth = require("../model/usersAuth")
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { InitializeDiceGame } = require("../games/dice.controllers");

const {createFC, createCD, handleWalletInstance, handleAllWallets } = require("../wallet_transaction/index")
const { RegisterRefCode } = require("../controllers/profile.controller")
const Profile = require("../model/profile");
const { handleNodeMailer } = require("../emailConfig/config")
const Chats = require("../model/public-chat");

const Images = [
  "https://res.cloudinary.com/dxwhz3r81/image/upload/v1720390192/avatar55_rtiys4.png",
  "https://res.cloudinary.com/dxwhz3r81/image/upload/v1720390141/avatar44_ncyqcw.png",
  "https://res.cloudinary.com/dxwhz3r81/image/upload/v1720398516/avatar1_l6garj.png",
  "https://res.cloudinary.com/dxwhz3r81/image/upload/v1720398515/avatar2_ztgal3.png",
  "https://res.cloudinary.com/dxwhz3r81/image/upload/v1720390128/avatar11_fbdw02.png",
  "https://res.cloudinary.com/dxwhz3r81/image/upload/v1720389924/avatar66_daptmu.png",
  "https://res.cloudinary.com/dxwhz3r81/image/upload/v1720389880/avatar88_enyz9d.png"
]

const ImageFunction = (()=>{
  var item = Images[Math.floor(Math.random()*Images.length)];
  return item
})

const handleGlobalFaVerification = (async(token, secret)=>{
  const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token
  });
  return verified
})

const uniqueId = (length=15) => {
  return parseInt(Math.ceil(Math.random() * Date.now()).toPrecision(length).toString().replace(".", ""))
}
const handleCreateOTP = ((length)=>{
  return Math.floor(Math.pow(10, length-1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length-1) - 1));
}) 

const createToken = ((_id)=>{
    return  jwt.sign({_id}, `InenwiNIWb39Nneol?s.mee39nshoosne(3n)`, { expiresIn: '7d' })
})

const handleSignup = (async(req, res)=>{
    try{
        const { auth } = req.body
        const Usernmae = await UserAuth.findOne({ username: auth?.username })
        if (Usernmae){
            return  res.status(401).json("Username already exist")
          }
        if(!validator.isEmail(auth?.email)){
          return  res.status(404).json("Email is not valid")
        }
        if(!validator.isStrongPassword(auth?.password)){
           return res.status(401).json("Password is not strong")
        }
        const Emailexist = await UserAuth.findOne({ email: auth?.email })
        if (Emailexist){
          return  res.status(401).json("Email already exist")
        }
        if (!Emailexist){
            const salt = await bcrypt.genSalt(10)
            const hash = await bcrypt.hash(auth?.password, salt)
            const user_id = uniqueId()
            const token = createToken(user_id)
            let authData = {
                password: hash,
                user_id, 
                username: auth?.username,
                email: auth?.email,
                login_type: "password",
                created_at: new Date(),
                login_history: [auth?.device]
            }
            let profile = {
              user_id: user_id,
              username: auth?.username,
              email: auth?.email,
              current_level: "Unranked",
              next_level:"Bronze 1",
              profileImg: ImageFunction(),
              emailIsVerified: false,
              level: 0
            }
            await createFC(user_id)
            await createCD(user_id) 
            await InitializeDiceGame(user_id)
            let wallet = handleWalletInstance()
            await RegisterRefCode({user_id, referral:auth?.referral})
            await Profile.create(profile)
            await UserAuth.create(authData)
            return res.status(200).json({token})
        }
    }
    catch(err){
        console.log(err)
        return  res.status(401).json("Server Error")
    }
})

const handleLogin = (async(req, res)=>{
    try{
        const {auth} = req.body;
        if(auth){
          const user = await UserAuth.findOne({ email: auth?.email})
          if (!user){
            return res.status(401).json("Email does not exist")
          }
          if(!auth?.secret){
            const match = await bcrypt.compare(auth?.password, user.password)
            if(!match){
              return res.status(404).json('Incorrect password')
            }
          }
          if(user?.fa_auth){
              if(!auth?.secret){
                const secrete = user.fa_secrete?.base32
                return res.status(200).json({type:"_2fa", email:auth?.email,  secrete, user_id: user?.user_id,password:createToken(user?.user_id) })
              }
          }
          if(auth?.secret){
            const verified = await handleGlobalFaVerification(auth?.code, auth?.secret)
            if(!verified){
              return res.status(404).json('Incorrect code')
            }
          }
          const profile = await Profile.findOne({ email: auth?.email})
          const token = createToken(user?.user_id);
          await UserAuth.updateOne({ email: auth?.email },{ $push: {
            login_history: auth?.device
          } })
          let wallet = handleAllWallets(user?.user_id)
          return res.status(200).json({token})
      }
    }
      catch(err){
        console.log(err)
        return  res.status(401).json("Server Error")
    }
})

const handleGoogleAuth = (async(req, res)=>{
  try{
    const { auth } = req.body
    let device = auth.device
    if(!auth){
      return res.status(401).json("Invalid Authentication")
    } 
    const user = await UserAuth.findOne({ email: auth?.email })
    if(user){
      let tys = ({...device, type :"Google Login"})
      await UserAuth.updateOne({ email: auth?.email },{ $push: {
        login_history: tys
      } });
      let wallet = handleAllWallets(user?.user_id)
      const token = createToken(user?.user_id);
      return  res.status(200).json({token, user, wallet})
    }
    if(!user){
      let de = ({...device, type :"Google Registration"})
      const user_id = uniqueId()
      const username = auth?.displayName
      let authData = {
        password: auth.auth?.apiKey,
        user_id,
        username,
        email: auth?.email,
        login_type: "google",
        login_history: [de],
        created_at: new Date()
    }
    let profile = {
      user_id,
      email: auth?.email,
      username,
      current_level: "Unranked",
      next_level:"Bronze 1",
      profileImg: ImageFunction(),
      emailIsVerified: true,
      level: 0
    }
    await createFC(user_id)
    await createCD(user_id) 
    const token = createToken(user_id);
    await Profile.create(profile)
    await UserAuth.create(authData)
    await InitializeDiceGame(user_id)
    let wallet = handleWalletInstance()
    return res.status(200).json({token})
    }
  }
  catch(err){
      console.log(err)
      return res.status(500).json("Server error")
  }
})

const HandleUserProfile = (async(req, res)=>{
    try{
        const user_id = req.params?.id
        if(!user_id){
            return res.status(401).json("Invalid User Id")
        }
        const Emailexist = await UserAuth.findOne({user_id})
        console.log(Emailexist)
    }
    catch(err){
        console.log(err)
        return res.status(500).json("Server error")
    }
})

// ============= get previous messages ====================
const previousChats = async (req, res) => {
  try {
    let newMessage = await Chats.find();
    return res.status(200).json(newMessage);
  } catch (err) {
    console.log(err)
    return res.status(500).json("Server error")
  }
};

const handleChangePassword = (async(req, res)=> {
  try{
    const user_id = req.params.id
    const {auth} = req.body
    if(auth){
      const user = await UserAuth.findOne({user_id})
      if (!user){
        return res.status(401).json("Invalid user_id, Please Logout")
      }
      if(!validator.isStrongPassword(auth?.newPassword)){
        return res.status(401).json("Please set a strong password")
      }
      const match = await bcrypt.compare(auth?.oldPassword, user.password)
      if(!match){
        return res.status(404).json('Incorrect old password')
      }
      if(auth?.newPassword === auth?.oldPassword){
        return res.status(404).json('Set a different password')
      }
      const salt = await bcrypt.genSalt(10)
      const hash = await bcrypt.hash(auth?.newPassword, salt)
      await UserAuth.updateOne({user_id},{
        password: hash
      })
      return res.status(200).json("successfully done")
    }
  }
  catch(err){
    console.log(err)
    return res.status(500).json("Server error")
  }
})

const handleChangeEmailOtp = (async(req, res)=>{
    try{
      const user_id = req.params.id
      const { emails } = req.body
      // const user = await UserAuth.findOne({user_id})
      let otp = handleCreateOTP(6)
      let netToken = otp.toString()
      const salt = await bcrypt.genSalt(10)
      const hash = await bcrypt.hash(netToken, salt)
      const changeEmail= await handleNodeMailer({type: "change-email", code:otp, new_email: emails?.new_email , email:emails?.old_email},
         {token: hash, new_email: emails?.new_email , email:emails?.old_email})
      if(changeEmail)
        return res.status(httpStatus.OK).json("EMAIL CHANGED")
        else return res.status(httpStatus.INTERNAL_SERVER_ERROR).json("INTERNAL SERVER ERROR")
      }
    catch(err){
      console.log(err)
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json("INTERNAL SERVER ERROR")
    }
})

const handleChangeEmail = (async(req, res)=> {
  try{
    const {data} = req.body
    const user_id = req.params.id
    let codez = data?._otpCode.toString()
    const match = await bcrypt.compare(codez, data.token?.token)
    let secret = data._faToken?.base32
    let faToken = data?._2faCode
    let verify = await handleGlobalFaVerification(faToken, secret)
    if(!match){
        return res.status(404).json('Incorrect code from email')
    }
    if(!verify){
      return res.status(404).json('Incorrect two-factor Authenication')
    }
    let newEmail = data.token?.new_email
      await Profile.updateOne({user_id},{
        emailIsVerified: false,
        email: newEmail
      })
      await UserAuth.updateOne({user_id},{
        email: newEmail
      })
    let user =  await Profile.findOne({user_id})
    return res.status(200).json(user)
  }
  catch(err){
    console.log(err)
    return res.status(500).json("Server error")
  }
})

const handleSetGooglePassword = (async(req, res)=>{
  try{
    const user_id = req.params.id
    const {auth} = req.body
    if(!validator.isStrongPassword(auth)){
       return res.status(401).json("Password is not strong")
    }
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(auth, salt)

    await UserAuth.updateOne({user_id},{
      password: hash,
      login_type:"email-password"
    })
    return res.status(200).json("successfully done")
  }
  catch(err){
    console.log(err)
    return res.status(500).json("Server error")
  }
})

const generate2FAsecrete = (async(req, res)=>{
  const email = req.params.id;
  const companyName = "Cyclix Games";
  const Emailexist = await UserAuth.findOne({email})
  if(!Emailexist?.fa_secrete){
    const secret = speakeasy.generateSecret({ length: 20,
        name: `${companyName}: ${email}`,
        issuer: companyName
    });
    await UserAuth.updateOne({email},{
      fa_secrete: secret
    })
    qrcode.toDataURL(secret.otpauth_url, (err, url) => {
    return  res.json({ secret: secret.base32, qrCode: url });
    });
  }
  if(Emailexist?.fa_secrete){
    let oldSecrete = Emailexist?.fa_secrete
    qrcode.toDataURL(oldSecrete.otpauth_url, (err, url) => {
    return  res.json({ secret: oldSecrete.base32, qrCode: url });
    });
  }
})

const handleVerifyFa = (async(req, res)=>{
  try{
    const user_id = req.params.id
    const { token, secret } = req.body;
    const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token
    });
    if(!verified){
      return res.status(500).json("Incorrect Code")
    }
    await UserAuth.updateOne({user_id},{
      fa_auth: true,
    })
    const user = await UserAuth.findOne({user_id})
    return res.status(200).json(user)
  }
  catch(err){
    console.log(err)
    return res.status(500).json("Server error")
  }
})

const handleDeleteAuthentication = (async(req, res)=>{
  try{
    const email = req.params.id
    const Emailexist = await UserAuth.findOne({email})
    let oldSecrete = Emailexist?.fa_secrete
    let secret = oldSecrete?.base32
    const { token } = req.body;
    if(!token){
      return res.status(500).json("Incorrect code")
    }
    const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token
    });
    if(!verified){
      return res.status(500).json("Incorrect Code")
    }
    await UserAuth.updateOne({email},{
      fa_auth: false,
    })
    const user = await UserAuth.findOne({email})
    return res.status(200).json(user)
  }
  catch(err){
    console.log(err)
    return res.status(500).json("Server error")
  }
})


const requestForgetPasword = (async(req, res)=>{
  try{
    const { email } = req.body
    if(!email){
      return res.status(500).json("Enter email")
    }
    const Emailexist = await UserAuth.findOne({email})
    if(!Emailexist){
      return res.status(500).json("Email does not exist")
    }
    let otp = handleCreateOTP(6)
      let netToken = otp.toString()
      const salt = await bcrypt.genSalt(10)
      const hash = await bcrypt.hash(netToken, salt)
    const response = await handleNodeMailer({type: "forget-password", email, code:otp})
    if(response)
      return res.status(200).json({Emailexist,hash})
      else return res.status(httpStatus.INTERNAL_SERVER_ERROR).json("INTERNAL SERVER ERROR")
  }
  catch(err){
    console.log(err)
    return res.status(500).json("Server error")
  }

})

const resetPassword = (async(req, res)=>{
  try{
    const { auth } = req.body
    if(!auth){
      return res.status(500).json("Something went wrong")
    }
    const exist = await UserAuth.findOne({email: auth?.email, user_id: auth?.user_id})
    if(!exist){
      return res.status(500).json("Something went wrong, please restart the process again")
    }
    const match = await bcrypt.compare(auth?.code, auth?.hash)
    if(!match){
      return res.status(500).json("Incorrect code")
    }
    if(!validator.isStrongPassword(auth?.password)){
      return res.status(401).json("Password is not strong")
   }
   const salt = await bcrypt.genSalt(10)
   const hash = await bcrypt.hash(auth?.password, salt)
   await UserAuth.updateOne({email: auth?.email, user_id: auth?.user_id},{
      password: hash
   })
   return res.status(200).json("Success")
  }
  catch(err){
    console.log(err)
    return res.status(500).json("Server error")
  }

})

module.exports = { 
  handleSignup,handleDeleteAuthentication, HandleUserProfile,
  handleChangePassword, handleChangeEmailOtp,handleSetGooglePassword,
 handleLogin,previousChats, handleGoogleAuth,handleGlobalFaVerification,resetPassword,
   handleChangeEmail, generate2FAsecrete,handleVerifyFa, requestForgetPasword
  }