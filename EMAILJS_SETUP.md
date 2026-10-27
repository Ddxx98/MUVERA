# EmailJS Setup Instructions for MUVERA

### 1. Template Settings
- **To Email**: `{{to_email}}`
- **From Name**: `MUVERA Luxury Streetwear`
- **Subject**: `{{subject}}` (or `Your MUVERA Verification Code: {{otp}}`)

### 2. Template Code
Copy the full content of [`EMAILJS_TEMPLATE.html`](./EMAILJS_TEMPLATE.html) and paste it into the HTML code / Source view of your EmailJS template.

### 3. Environment Variables to add to `.env.local`
```env
EMAIL_PROVIDER=emailjs
EMAILJS_SERVICE_ID=your_service_id_here
EMAILJS_TEMPLATE_ID=your_template_id_here
EMAILJS_PUBLIC_KEY=your_public_key_here
EMAILJS_PRIVATE_KEY=your_private_key_here
```
