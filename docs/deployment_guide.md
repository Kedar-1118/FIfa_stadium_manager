# StadiumOS AI — Production Deployment Guide (Vercel & AWS EC2)

This guide provides step-by-step instructions to deploy the StadiumOS AI system in a production-grade infrastructure:
- **Frontend Dashboard** (`apps/command-center`): Hosted on **Vercel** for high availability, CDN edge caching, and global delivery.
- **Backend microservices, DB, and Cache** (`apps/backend-gateway` & `apps/agent-mesh`): Hosted on an **AWS EC2 Instance** (Ubuntu 22.04 LTS, `t3.medium` or larger recommended) behind an **Nginx Reverse Proxy** secured with **free Let's Encrypt SSL certificates**.

---

## 1. AWS EC2 Security Group Setup

Configure your EC2 instance's security group to permit incoming traffic on these ports:

| Protocol | Port Range | Source | Purpose |
| :--- | :--- | :--- | :--- |
| **TCP** | `22` | `My IP` | SSH Management access. |
| **TCP** | `80` | `0.0.0.0/0` | HTTP Nginx reverse proxy routing. |
| **TCP** | `443` | `0.0.0.0/0` | HTTPS Nginx secure reverse proxy routing (SSL). |

---

## 2. Docker & Compose Setup on EC2

SSH into your EC2 instance and execute the following installation commands:

```bash
# Update package repositories
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine & Compose
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow running docker commands without sudo
sudo usermod -aG docker $USER
newgrp docker
```

---

## 3. Clone Repository & Set Up Production `.env`

Clone your project repository on the EC2 instance and create a `.env` file in the project root:

```env
NODE_ENV=production
APP_NAME=StadiumOS-AI

# Supabase Managed PostgreSQL Database Connection String
DATABASE_URL="postgresql://postgres:[password]@db.soiujmhecvpamhqwrwkg.supabase.co:5432/postgres"

# Redis Cache Connection URI (e.g., Upstash or local)
REDIS_URL="redis://default:[password]@lustrous-cakes-coat-86494.db.redis.io:10011"

# JWT Config (Lock down with a strong 32-character key for production!)
JWT_SECRET_KEY=your_super_secure_32_character_secret_jwt_key_here
INTERNAL_SERVICE_KEY=gateway-agent-secret-handshake-secure-token-here

# LLM Keys
LLM_PROVIDER=google
GEMINI_API_KEY=AIzaSyYourGeminiAPIKeyHere
OPENAI_API_KEY=sk-proj-YourOpenAIAPIKeyHere
```

---

## 4. Boot Backend Microservices

Deploy the database migrations to your Supabase instance, then start up the Redis cache, API Gateway, and Agent Mesh microservices on EC2:

```bash
# Apply Prisma migrations directly to your Supabase PostgreSQL instance
docker compose -f docker-compose.ec2.yml run --rm api npx prisma migrate deploy

# Build and boot services in the background
docker compose -f docker-compose.ec2.yml up -d --build
```

Verify that all containers are healthy:
```bash
docker ps
```

---

## 5. Nginx Reverse Proxy & Free Let's Encrypt SSL Setup

1. **Install Nginx**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y nginx
   ```

2. **Mount Configuration**:
   Copy the Nginx configuration file template (`infrastructure/stadiumos.nginx.conf`) into Nginx's sites-available directory:
   ```bash
   sudo cp infrastructure/stadiumos.nginx.conf /etc/nginx/sites-available/stadiumos.conf
   sudo ln -s /etc/nginx/sites-available/stadiumos.conf /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   ```

3. **Configure your Domain DNS (Crucial for Let's Encrypt)**:
   Let's Encrypt requires a valid domain name pointing to your EC2 instance.
   - Go to your Domain Registrar / DNS Provider (e.g., Route53, GoDaddy, Cloudflare).
   - Create an **A Record** pointing your domain (e.g., `api.stadiumos.com` or your own custom domain) to your EC2 Public IP:
     - **Host/Name**: `api` (or `@` for root domain)
     - **Type**: `A`
     - **Value/Points to**: `13.126.215.26`

4. **Install Certbot for Let's Encrypt SSL**:
   ```bash
   sudo apt-get install -y snapd
   sudo snap install core; sudo snap refresh core
   sudo snap install --classic certbot
   sudo ln -s /snap/bin/certbot /usr/bin/certbot
   ```

5. **Acquire & Apply Certificates**:
   Run Certbot to automatically acquire certificates and configure SSL protocols in your Nginx config. Replace `api.stadiumos.com` with the custom domain you pointed to your EC2 IP (`13.126.215.26`):
   ```bash
   sudo certbot --nginx -d api.stadiumos.com
   ```
   *(Follow the on-screen prompts to enter your email and agree to the Terms of Service. Certbot will automatically verify the DNS record pointing to `13.126.215.26` and rewrite your `/etc/nginx/sites-available/stadiumos.conf` to configure SSL paths).*

6. **Restart Nginx**:
   ```bash
   sudo nginx -t # Verify syntax correctness
   sudo systemctl restart nginx
   ```

---

## 6. Frontend Deployment to Vercel

1. **Import Project**:
   - Push your codebase to a Git repository (GitHub/GitLab/Bitbucket).
   - Log in to your [Vercel Dashboard](https://vercel.com) and click **Add New > Project**.
   - Select your StadiumOS AI repository.

2. **Configure Build Settings**:
   - **Framework Preset**: `Vite` (Vercel will detect it automatically).
   - **Root Directory**: Select `apps/command-center`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Set Environment Variables**:
   Under the "Environment Variables" section in Vercel, add the following parameters pointing to your Nginx EC2 domain:
   - `VITE_API_URL` = `https://api.stadiumos.com/api/v1`
   - `VITE_WS_URL` = `wss://api.stadiumos.com/ws`

4. **Deploy**:
   Click **Deploy**. Vercel will build, optimize, and serve your CommandCenter dashboard.

---

## 7. Verify Deployment

- Access your frontend app via the Vercel-generated URL (e.g. `stadiumos-command-center.vercel.app`).
- Try logging in with the seeded credentials (`admin@stadiumos.com` / `password123`).
- Submit an emergency report and check the live WebSocket synchronization logs.
