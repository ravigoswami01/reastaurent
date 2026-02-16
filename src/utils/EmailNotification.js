import nodemailer from "nodemailer";
import { generateOrderEmailHTML } from "../services/emailtemplet.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {object} templateData - data for the template { name, orderId, items, total, eta }
 */
export const sendEmail = async (to, subject, templateData) => {
  const html = generateOrderEmailHTML(templateData);
  await transporter.sendMail({
    from: `"Your Restaurant" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
