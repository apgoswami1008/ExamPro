const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    debug: true
});

const sendEmail = async ({ email, subject, template, data }) => {
    try {
        // Verify template path
        const templatePath = path.join(__dirname, '../views/emails', `${template}.ejs`);
        
        // Check if template exists
        try {
            await fs.promises.access(templatePath, fs.constants.R_OK);
        } catch (err) {
            throw new Error(`Email template '${template}' not found`);
        }

        // Read and render template
        let html;
        try {
            html = await ejs.renderFile(templatePath, data);
        } catch (err) {
            throw new Error(`Failed to render email template: ${err.message}`);
        }

        // Send email
        try {
            await transporter.sendMail({
                from: process.env.FROM_EMAIL ? 
                    `${process.env.FROM_NAME || 'Online Examination'} <${process.env.FROM_EMAIL}>` : 
                    process.env.SMTP_USER,
                to: email,
                subject,
                html
            });
            console.log(`Email sent successfully to ${email}`);
        } catch (err) {
            throw new Error(`Failed to send email: ${err.message}`);
        }

    } catch (error) {
        console.error('Email sending error:', {
            message: error.message,
            stack: error.stack,
            template,
            email
        });
        throw error;
    }
};

module.exports = sendEmail;