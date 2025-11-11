const nodemailer = require("nodemailer");
const confirmEmail  = require("./templates/confirmEmail")
const ChangeEmail  = require("./templates/changeEmail")
  // user: 'valiantcodez@gmail.com',
  //   pass: 'egno dwpu xqel rgje'
let transporter = nodemailer.createTransport({
  service: 'Gmail',
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: 'valiantcodez@gmail.com',
    pass: 'egno dwpu xqel rgje'
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false,
  },
});

// Verify connection configuration
// transporter.verify(function (error, success) {
//   if (error) {
//     console.log(error);
//   } else {
//     console.log('Server is ready to take our messages');
//   }
// });

const handleTemplate = ((data)=>{
  if(data.type === "change-email"){
   let rest = {
      subject: ChangeEmail(data.code, data.email).subject,
      html: ChangeEmail(data.code, data.email).html
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
})

const handleNodeMailer2 = (async(data)=>{
  let mailOptions = {
    from: 'verify@cyclixgames.com',
    to: `valiantotung1@gmail.com`,
    subject: "Put God first" ,
    text: 'Hello world?',
    html: `<b>It works bro, Let's keep going?</b>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
  }
  console.log('Message sent: %s', info);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  });
})

// handleNodeMailer2()
const handleNodeMailer = (async(data)=>{
  let mailOptions = {
    from: 'admin',
    to: `${data.email}`,
    subject: handleTemplate(data)?.subject,
    html: handleTemplate(data)?.html
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email: ", error);
    } else {
      console.log("Email sent: ", info.response);
    }
  });
})


module.exports = { handleNodeMailer }