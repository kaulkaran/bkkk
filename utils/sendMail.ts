import { Resend } from "resend";
import ejs from "ejs";
import path from "path";
import fs from "fs";

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async (options: EmailOptions): Promise<void> => {
  const { email, subject, template, data } = options;

  try {
    // Build the absolute path to the template file
    const templatePath = path.join(__dirname, "../mails", template);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    // Render EJS template
    const html = await ejs.renderFile(templatePath, data);

    // Send email using Resend
    const { data: result, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL as string,
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error("❌ Email send failed:", error);
      throw new Error(error.message);
    }

    console.log("✅ Email sent successfully:", result);
  } catch (err: any) {
    console.error("💥 sendMail error:", err.message);
    throw new Error(err.message);
  }
};

export default sendMail;
