
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail', // Use your email provider (e.g., Gmail, Outlook, etc.)
  auth: {
    user: 'valiantcodez@gmail.com',
    pass: 'diwm dqjt dmnu atss'
  },
});

// const transporter = nodemailer.createTransport({
//   host: "smtp.hostinger.com",
//   secure: true, 
//   secureConnection: false,
//   tls: {
//      ciphers: "SSLv3",
//   },
//   requireTLS: true,
//   port: 465,
//   debug: true,
//   connectionTimeout: 10000,
//   auth: {
//       user: "info@fairstakebet.com",
//       pass: "Keys2541?",
//   },
// });

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: '"Fairstakebet Casino"', // Replace with your email
      to,
      subject,
      html,
    };

     await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendEmail;