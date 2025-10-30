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
    // Resolve EJS template path
    const templatePath = path_1.default.join(__dirname, "../mails", template);
    // Check template existence
    if (!fs_1.default.existsSync(templatePath)) {
        console.error(`❌ Template not found: ${templatePath}`);
        throw new Error(`Email template not found: ${template}`);
    }
    // Render the EJS template
    const html = await ejs_1.default.renderFile(templatePath, data);
    try {
        const response = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "QualtSpire <onboarding@resend.dev>",
            to: email,
            subject,
            html,
        });
        console.log("✅ Email sent successfully:", response);
    }
    catch (error) {
        console.error("❌ Error sending email:", error);
        throw new Error("Failed to send email");
    }
};
exports.default = sendMail;
