const nodemailer = require("nodemailer");
const smtpTransport = require('nodemailer-smtp-transport');
const confirmEmail  = require("./templates/confirmEmail")
const ChangeEmail  = require("./templates/changeEmail")
const ResetPassword  = require("./templates/resetPassword")

const businessEmailTransportConfig={
    service: 'Gmail',
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "dev1@cyclixgamesmail.com",
        pass: 'cgdo cmeq ajsj smih'
    }
}

const personalEmailTransportConfig={
    service: 'Gmail',
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: 'valiantcodez@gmail.com',
        pass: 'egno dwpu xqel rgje'
    }
}

const transporter = nodemailer.createTransport(smtpTransport(personalEmailTransportConfig));

const handleTemplate = ((data)=>{
    if(data.type === "change-email"){
     let rest = {
        subject: ChangeEmail(data.code, data.new_email).subject,
        html: ChangeEmail(data.code, data.new_email).html
     }
     return rest
    }
    if(data.type === "confirm-email"){
        let rest = {
            subject: confirmEmail(data.code).subject,
            html: confirmEmail(data.code).html
        } 
        return rest
    }
    if(data.type === "forget-password"){
        let rest = {
            subject: ResetPassword(data.code).subject,
            html: ResetPassword(data.code).html
        } 
        return rest
    }
})

const handleNodeMailer = async(data) => { 
    let mailOptions = {
        from: 'admin@cyclixgames.com',
        to: `${data.email}`,
        subject: handleTemplate(data)?.subject,
        html: handleTemplate(data)?.html
    };

  return await new Promise((resolve,reject)=>
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log("***********" + error);
            reject(false)            
        } else {
            console.log('*********Email sent:********' + info.response);
            resolve(true)
        }
    })
   )
}

module.exports = {handleNodeMailer};
