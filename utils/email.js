const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Define email options
  const mailOptions = {
    from: "Sarasraman <hello@sarasraman.io>",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // Send the email

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
