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

  // Resolve EJS template path
  const templatePath = path.join(__dirname, "../mails", template);

  // Check template existence
  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template not found: ${templatePath}`);
    throw new Error(`Email template not found: ${template}`);
  }

  // Render the EJS template
  const html = await ejs.renderFile(templatePath, data);

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "QualtSpire <onboarding@resend.dev>",
      to: email,
      subject,
      html,
    });

    console.log("✅ Email sent successfully:", response);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

export default sendMail;
