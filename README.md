# Memoria Studio 🎨✨

**Memoria Studio** is a premium production-ready MERN stack web application that allows users to browse, customize, purchase, and download visual templates (such as Indian political campaigning posters, birthday cards, and anniversary invites). The project features a custom-built HTML5 Canvas editor for real-time photo scaling and text overlay.

---

## 📂 Project Architecture & File Sections

The project is structured into two main packages under the root directory:

```
memoria-studio/
├── README.md (This file)
├── client/                     # React Single Page Application (Vite-powered)
│   ├── public/                 # Static asset public files
│   ├── src/
│   │   ├── components/         # Reusable Shell Components (Navbar, Footer, Floating Buttons)
│   │   ├── context/            # AuthContext (JWT session management, state, and greeting logic)
│   │   ├── services/           # Axios API configuration & request headers interceptors
│   │   ├── pages/              # Core Application Screens
│   │   │   ├── Home/           # Hero Banner Slider, Featured & Popular sections, Testimonials
│   │   │   ├── Auth/           # Registration, Login, Forgot Password, time-based greetings
│   │   │   ├── Categories/     # Categories Listing & Indian Political Parties selection grid
│   │   │   ├── TemplatesListing/ # Search, Category/Format filters, Sorting, and Pagination
│   │   │   ├── TemplateDetail/ # Live HTML5 Canvas preview editor (crop photo, sliders, text inputs)
│   │   │   ├── Checkout/       # Payment gateway checkout page (Razorpay + local testing simulator)
│   │   │   ├── PaymentSuccess/ # Success transaction receipt with green checkmark animation
│   │   │   ├── UserDashboard/  # Profile metrics, download files, and design re-customizations
│   │   │   ├── Services/       # Visual management agency packages & inquiry modal fields
│   │   │   ├── Contact/        # Standard queries forms saving requests to database
│   │   │   ├── About/          # Agency description, details, and core principles
│   │   │   └── AdminDashboard/ # Metrics cards, Templates CRUD (file inputs + custom JSON configs)
│   │   ├── App.js              # Routing paths and Protected / Admin Route shells
│   │   └── main.js             # React entry mounting
│   ├── index.html              # Shell HTML
│   └── vite.config.js          # Custom JSX compiler configurations for JS files
└── server/                     # Node.js + Express.js REST API Backend
    ├── config/                 # Database configurations (Mongoose instance connect)
    ├── controllers/            # Request handlers (auth, categories, templates, orders, contacts)
    ├── middlewares/            # JWT validator guards & Multer file uploads configuration
    ├── models/                 # Mongoose schemas (User, Category, Template, Order, Service, Contact)
    ├── routes/                 # Express route mappings
    ├── services/               # Integrations (AWS S3 file storage & Razorpay payment keys)
    ├── uploads/                # Local directory fallback for static uploads (if AWS is blank)
    ├── .env                    # System environment properties
    └── server.js               # Application entry point
```

---

## 🛠️ Implemented Features

### 1. Frontend SPA (React + Pure CSS)
- **Zero UI Frameworks**: Built entirely with **Pure CSS** files separated by component (no Tailwind CSS, no Bootstrap) to support dark mode themes and glassmorphism.
- **Vite 8 & OXC Integration**: Configured with a pre-compiler transpiler in `vite.config.js` to process JSX syntax inside `.js` files without necessitating `.jsx` extensions.
- **Floating Social Widgets**: Multi-page floating social support shortcuts for WhatsApp direct messages and Instagram page routes.

### 2. Live Canvas Editor (HTML5)
- **Real-time Preview Rendering**: Merges template background dimensions with custom font sizing, color attributes, weights, text shadows, and alignments.
- **Image Positioning Sliders**: Restricts user photo frames using a circular/rectangular clipping path inside the canvas. Provides sliders to adjust **Zoom (Scale)**, **Horizontal Offset (X)**, and **Vertical Offset (Y)**.
- **Purchase Restriction Watermark**: Renders a semi-transparent diagonal "MEMORIA STUDIO PREVIEW" watermark across the canvas if the template has not been purchased. The watermark is automatically removed upon payment verification.

### 3. Payment Processing
- **Razorpay Integration**: Standard dynamic script loading for card, UPI, wallet, and netbanking payments.
- **Local Test Simulator**: Dynamically displays a mock payment modal when developer keys are set to `mock` in `.env`. Users can test the complete purchase loop without real credentials.

### 4. Admin Management (CRUD)
- **Overview Stat Cards**: Displays Total Users, Total Orders, Total Revenue, and Total Templates.
- **Full Database CRUD**: UI tables to insert, edit, or delete Templates (with custom file attachments and interactive JSON layout mapping), Categories, and Services.
- **Inquiry & Orders Managers**: System orders list, contact submissions table, and custom service request sheets with status dropdown updates (Paid, Replied, Pending).

### 5. Backend Server (Node/Express)
- **Automatic Fallback Storage**: Automatically shifts assets storage to the local disk (`server/uploads`) and serves files statically if S3 credentials are left blank in `.env`.
- **Download Guard**: Protects master templates. High-res files or vector project packages can only be downloaded by users with a verified `'paid'` order.

### 6. Multimedia Audio & Video Support
- **Video Audio Controls**: Uploaded video layers support audio settings (Keep Original Audio, Mute, or Replace with Custom Voiceover) with volume adjustment sliders and active trim bars.
- **Image Layer Audio Options**: Uploaded image layers support optional custom audio files (MP3/WAV/M4A) for slideshow-style custom templates, equipped with separate volume controls and trim parameters.
- **Mixing & Compilation**: Fully integrated backend audio mixing complex utilizing FFmpeg amix + adelay graphs to merge original vocals, overlay video tracks, custom replacement audios, and background templates cleanly.

### 7. Mobile View Optimization & Touch Gestures
- **Touch Interaction Handles**: Canvas layers support native touch gestures (`onTouchStart`, `touchmove`, `touchend`) enabling responsive resizing, rotating, and dragging handles on mobile viewports.
- **Scrollable Navigation Bar**: Replaced static bottom tab layouts with responsive scrollable touch sheets (`overflow-x: auto;`), ensuring the `Style` properties tab and `Audio` tab remain fully accessible.
- **AI Background Removal Cutout**: Integrates server-side person segmentation using Python `rembg` (U²-Net models). Includes an in-browser automatic color cutout (chroma-key) fallback with custom color selection and tolerance sliders if the server's AI model is initializing.

---

## 🚀 How to Run Locally

### 1. Prerequisites
- **Node.js** (v16 or higher)
- **MongoDB** running locally (`mongodb://localhost:27017`) or a **MongoDB Atlas** connection string.

### 2. Backend Server Setup
1. Navigate to the `server/` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment file [server/.env](file:///d:/projects%20with%20antigravity/server/.env):
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/memoriastudio
   JWT_SECRET=your_jwt_secret_key
   RAZORPAY_KEY_ID=rzp_test_mockkeyid123
   RAZORPAY_KEY_SECRET=mockkeysecret456
   
   # Leave AWS blank to use local server storage (server/uploads)
   AWS_ACCESS_KEY_ID=
   AWS_SECRET_ACCESS_KEY=
   AWS_REGION=us-east-1
   AWS_BUCKET_NAME=
   
   NODE_ENV=development
   ```
4. Start the server:
   ```bash
   npm start
   ```
   *(Ensure MongoDB is active; you should see `Server running on port 5000`)*.

### 3. Frontend Client Setup
1. Navigate to the `client/` directory:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173/`.

### 4. Seed Default Database Data
Once the client and server are running:
1. Register a new user account on the website.
2. Navigate to `http://localhost:5173/admin` or click on `🌱 Seed DB Defaults` at the top right of the Admin Dashboard. This triggers the `/api/seed` endpoint to automatically populate the database with default campaign poster coordinates, categories, and branding services.

---

## 🌐 How to Host on the Internet (Production)

To make your application public with a secure connection and a custom domain name, follow this deployment workflow:

### Step 1: Deploy the Database
- Register for a free account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
- Create a new shared cluster, create a database user, and whitelist all IP addresses (`0.0.0.0/0`).
- Copy your connection string (`mongodb+srv://...`) and use it as your `MONGO_URI` in the production environment variables.

### Step 2: Deploy the Backend Server
You can host the Node/Express backend on cloud platforms like **Render**, **Heroku**, or **Railway**.

#### Example: Deploying on Render (Free/Paid Web Service)
1. Push your code repository to GitHub (include both `client` and `server` folders).
2. Create a new **Web Service** on Render and link it to your GitHub repository.
3. Configure the service settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Under the **Environment** tab, add your environment variables:
   - `MONGO_URI` (your MongoDB Atlas connection string)
   - `JWT_SECRET` (a strong random string)
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (your live or test keys)
   - `NODE_ENV=production`
5. Click **Deploy**. Render will generate a URL like `https://memoria-studio-api.onrender.com`.

### Step 3: Deploy the Frontend Client
You can host the frontend SPA on static hosting services like **Vercel** or **Netlify**.

#### Example: Deploying on Vercel
1. Install Vercel CLI or link your repository directly on [Vercel Dashboard](https://vercel.com).
2. Create a new project, select the root directory as `client`.
3. Configure settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, if you wish to override the API target URL, configure your Axios baseURL to target your live backend URL (e.g., `https://your-backend-domain.com/api`).
5. Click **Deploy**. Vercel will provide an auto-generated URL like `https://memoria-studio.vercel.app`.

---

## 🔒 Securing the App with a Domain Name & SSL

To establish a safe, professional, and encrypted (HTTPS) web experience, configure a custom domain name using **Cloudflare** for DNS management.

### 1. Register a Safe Domain Name
- Purchase a domain name (e.g., `memoriastudio.com`) from a trusted ICANN-accredited registrar:
  - **Cloudflare Registrar** (Highly recommended: sold at cost price, includes free privacy protection and automatic DNS configuration).
  - **Namecheap** or **Squarespace Domains**.

### 2. Point Domain DNS to Cloudflare (Highly Recommended)
Using Cloudflare protects your backend server and frontend files from DDoS attacks, hides your host IP address, and provides a free Web Application Firewall (WAF).
1. Sign up for a free account on [Cloudflare](https://www.cloudflare.com).
2. Click **Add a Site** and input your domain (e.g., `memoriastudio.com`).
3. Cloudflare will provide two **Nameservers** (e.g., `alice.ns.cloudflare.com` and `bob.ns.cloudflare.com`).
4. Log into your domain registrar (where you purchased the domain), go to DNS/Nameservers settings, select **Custom Nameservers**, and paste the two Cloudflare nameservers.
5. Wait 5-10 minutes for nameserver propagation.

### 3. Link Custom Domain to Vercel/Netlify (Frontend)
1. Go to your **Vercel Project Dashboard** -> **Settings** -> **Domains**.
2. Input your custom domain (e.g., `www.memoriastudio.com` or `memoriastudio.com`) and click **Add**.
3. Vercel will prompt you to add DNS records. Log into Cloudflare, go to **DNS Records** for your site, and add:
   - An **A Record** pointing `@` to `76.76.21.21` (Vercel IP).
   - A **CNAME Record** pointing `www` to `cname.vercel-dns.com`.
4. Ensure the proxy status toggles in Cloudflare DNS are checked (cloud icon is orange: **Proxied**).

### 4. Link Custom Subdomain to Backend Server (e.g., `api.memoriastudio.com`)
1. Go to your backend hosting dashboard (e.g., Render) and select **Custom Domains**.
2. Add a subdomain like `api.memoriastudio.com`.
3. Render will provide a CNAME value. Go to Cloudflare DNS, add a **CNAME Record**:
   - **Name**: `api`
   - **Target**: the Render app URL (e.g., `memoria-studio-api.onrender.com`).
   - Keep proxy status set to **Proxied** (orange cloud).

### 5. Configure Free SSL/TLS Certificates
1. In the **Cloudflare Dashboard**, navigate to **SSL/TLS** -> **Overview**.
2. Select **Full** or **Full (Strict)** encryption mode. This encrypts all traffic between:
   - The user's browser and Cloudflare (SSL certificate provided by Cloudflare).
   - Cloudflare and your host servers Vercel/Render (SSL certificates automatically generated by Vercel/Render using Let's Encrypt).
3. Under **SSL/TLS** -> **Edge Certificates**, enable **Always Use HTTPS**. This automatically redirects all HTTP requests to secure HTTPS.

### 6. Production Security Enhancements (CORS & Security Headers)
- **CORS Config**: Update your backend `CORS` origins in [server.js](file:///d:/projects%20with%20antigravity/server/server.js) to whitelist **only** your custom frontend domain name:
  ```javascript
  app.use(cors({
    origin: ['https://www.memoriastudio.com', 'https://memoriastudio.com']
  }));
  ```
- **Helmet Middleware**: Import and use `helmet` inside `server.js` to automatically set HTTP headers that guard against Clickjacking, Cross-Site Scripting (XSS), and MIME sniffing attacks:
  ```javascript
  import helmet from 'helmet';
  app.use(helmet());
  ```
