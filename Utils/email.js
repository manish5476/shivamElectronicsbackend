// const nodemailer = require('nodemailer');

// const sendEmail = async (options) => {
//   // Create a transporter
//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT, // 2525 is usually for Mailtrap
//     secure: false, // Use false for Mailtrap; true for port 465
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   // Define email options
//   const mailOptions = {
//     from: '"Manish Singh" <your-email@example.com>', // Ensure "from" is valid for your SMTP service
//     to: options.email,
//     subject: options.subject,
//     text: options.message, // Plain text body
//     html: options.html,   // HTML body (optional)
//   };

//   // Send email
//   await transporter.sendMail(mailOptions); // No callback needed when using `await`
// };

// module.exports = sendEmail;

const nodemailer = require('nodemailer');

const sendEmail = async options=>{
  //create a transporter
const transporter = nodemailer.createTransport(
  { 
    host:process.env.EMAIL_HOST,
    port:process.env.EMAIL_PORT,
    // secure: true,  //true for 465, false for other ports
    auth:{
      user:process.env.EMAIL_USERNAME,
      pass:process.env.EMAIL_PASSWORD  //your gmail password
    }    //activate the less secure app version
  }
)
  //define email option
const mailOptions = {
  from: 'Manish Singh',
  to: options.email,
  subject: options.subject,
  text: options.message,
  html: options.html
  }
  
  //send email to user with nodemailer 
  await transporter.sendMail(mailOptions,(error, info)=>{
    if(error){
      console.error('Error sending email: ', error);
    }else{
      console.log('Email sent: ', info.response);
    }
  })
}
module.exports = sendEmail