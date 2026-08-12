# DreamozTech + Lovable App Frontend Showcase

Welcome to the frontend companion app for **DreamozTech**! This project demonstrates how seamlessly you can use the DreamozTech free API to power a dynamic, content-driven website (including user profiles, blogs, and product listings) with a frontend built completely in Lovable.

🔗 **Live Demo (Vercel):** [https://dreamoztech-lovable.vercel.app/](https://dreamoztech-lovable.vercel.app/)  
🔗 **Backend Platform:** [https://dreamoztech.com](https://dreamoztech.com)

---

## 🚀 Getting Started

This project is a blueprint for developers, creators, and no-code builders who want a fast, reliable, and completely free Headless CMS backend for their Lovable applications. 

To ensure a smooth setup, **you must configure your content backend first** before integrating it with Lovable.

### 📋 Step 0: Prerequisites (Content Setup First)

1. **Create Your Content Base:** Before jumping into Lovable, you need to set up your backend content. Create a free account directly here:  
   👉 **[Sign up on DreamozTech](https://dreamoztech.com/sign-up)**
   
2. **Populate Your Data:** Once signed up, take a minute to set up your profile and create a few sample blog posts or products. This ensures you have live data ready to be pulled by the API.

---

## 🛠️ Step-by-Step Integration Guide

### Step 1: Get Your API Key
1. Log into your dashboard at [DreamozTech.com](https://dreamoztech.com).
2. Go to your settings/profile page and copy your unique **DreamozTech API Key**.

### Step 2: Clone or Import This Repository
1. Fork or clone this repository to your own GitHub account.
2. Click on **New Project**, choose **Import from GitHub**, and select this repository.

### Step 3: Connect Your API Key
1. Once your project loads in Lovable, open the environment variables configuration or the API configuration file (typically found in your fetch/services layer).
2. Paste your **DreamozTech API Key** into the designated variable field:
```env
   VITE_DREAMOZTECH_API_KEY="your_api_key_here"
```

### Step 4: Configure Email Delivery (Vercel)
Email notifications for contact forms and orders are sent through Brevo. After deployment to Vercel, add these environment variables in your Vercel project settings:
```env
BREVO_API_KEY="your_brevo_api_key"
BREVO_FROM_EMAIL="support@yourdomain.com"
BREVO_FROM_NAME="Your Business Name"
```

- `BREVO_API_KEY` is required.
- `BREVO_FROM_EMAIL` and `BREVO_FROM_NAME` are optional, but recommended so the sender address is not hard-coded.

---

### Step 5: Vercel private blob images (VERCEL_BLOB_TOKEN)

If your project stores images on private Vercel Blob storage (URLs like `*.private.blob.vercel-storage.com`), the frontend must proxy image requests through the server so the required bearer token can be attached.

- Add the following environment variable in your Vercel Project Settings → Environment Variables:

```env
VERCEL_BLOB_TOKEN=your_vercel_blob_token_here
```

- Set this variable for the appropriate environments (Preview/Production) and then redeploy.

- For local development, create a local `.env.local` file (do NOT commit it) containing the same variable.

The app includes an `/image` proxy endpoint that will forward image requests and attach `Authorization: Bearer <token>` when needed.


## 🌐 Connecting a Custom Domain

You can connect your own domain (or subdomain) to your published Lovable app.

### Prerequisites
- Your project must be **published** first (it will have a `.lovable.app` URL).

### Steps
1. Go to **Project Settings → Domains** (or click **Publish → Add custom domain**).
2. Click **Connect Domain** and enter your full domain or subdomain (e.g. `shop.yourdomain.com`).
3. Lovable will provide DNS records to add at your registrar:
   - **A Record** — Name: `@` (root) or your subdomain, Value: `185.158.133.1`
   - **TXT Record** — Name: `_lovable`, Value: the verification string shown in Lovable
4. Add those records at your domain registrar/DNS provider, then return to Lovable and confirm.
5. Wait for DNS propagation (up to 72 hours). Lovable will automatically verify and issue SSL.

### Tips
- If you use **Cloudflare proxy**, check the "Domain uses Cloudflare or a similar proxy" option in the advanced setup during connection. This switches to CNAME-based verification.
- Add both `yourdomain.com` and `www.yourdomain.com` if you want both to resolve.
- For domains purchased through Lovable, you can manage DNS records directly in **Project Settings → Domains → Configure → Manage DNS records**.

For more details, see the [Lovable Custom Domain docs](https://docs.lovable.dev/features/custom-domain)
