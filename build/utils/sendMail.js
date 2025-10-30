"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const resend_1 = require("resend");
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const sendMail = async (options) => {
    const { email, subject, template, data } = options;
    try {
        // Build the absolute path to the template file
        const templatePath = path_1.default.join(__dirname, "../mails", template);
        if (!fs_1.default.existsSync(templatePath)) {
            throw new Error(`Template file not found: ${templatePath}`);
        }
        // Render EJS template
        const html = await ejs_1.default.renderFile(templatePath, data);
        // Send email using Resend
        const { data: result, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: email,
            subject,
            html,
        });
        if (error) {
            console.error("❌ Email send failed:", error);
            throw new Error(error.message);
        }
        console.log("✅ Email sent successfully:", result);
    }
    catch (err) {
        console.error("💥 sendMail error:", err.message);
        throw new Error(err.message);
    }
};
exports.default = sendMail;
