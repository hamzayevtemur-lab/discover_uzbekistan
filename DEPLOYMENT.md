# 🚀 Discover Uzbekistan Deployment Guide

This document provides step-by-step instructions for deploying the **Discover Travel Uzbekistan** platform (FastAPI Backend, MySQL Database, Nginx Frontend) to any production VPS or Cloud server (DigitalOcean, AWS, Hetzner, Vultr, Railway, Render, etc.).

---

## 🛠️ Prerequisites

Before deploying, ensure you have:
1. A Linux server (Ubuntu 22.04 LTS recommended) with Docker and Docker Compose installed.
2. A domain name (optional, but recommended for SSL/HTTPS).
3. Access to your server via SSH.

---

## 📦 Quick Deployment Options

### Option 1: One-Click Docker Compose Deployment (Recommended for VPS)

#### Step 1: Clone Repository onto VPS
```bash
git clone https://github.com/hamzayevtemur-lab/discover_uzbekistan.git
cd discover_uzbekistan
```

#### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and fill in your production values:
```bash
cp .env.example .env
nano .env
```

#### Step 3: Launch Containers
Run Docker Compose in detached mode:
```bash
docker compose up -d --build
```

Verify that all 3 services (`db`, `backend`, `frontend`) are up and running:
```bash
docker compose ps
```

---

### 🔒 Setting Up Free SSL/HTTPS with Let's Encrypt & Certbot

To enable HTTPS on your domain (e.g., `discoveruzbekistan.com`):

1. Install Certbot on your server:
   ```bash
   sudo apt update
   sudo apt install certbot python3-certbot-nginx -y
   ```

2. Generate SSL certificate:
   ```bash
   sudo certbot --nginx -d discoveruzbekistan.com -d www.discoveruzbekistan.com
   ```

3. Certbot will automatically update Nginx to handle HTTPS on port 443 with automatic renewal!

---

### Option 2: Railway / Render / Cloud PaaS Deployment

#### Railway
1. Connect your GitHub repository to Railway.
2. Railway automatically detects `startupbackend/Procfile` and `startupbackend/requirements.txt`.
3. Add a MySQL plugin in Railway. Railway injects `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` automatically into the backend!
4. Add environment variables from `.env.example`.

---

## 📊 Useful Maintenance Commands

- **View Live Container Logs**:
  ```bash
  docker compose logs -f
  ```

- **Restart Services**:
  ```bash
  docker compose restart
  ```

- **Database Backup (Dump)**:
  ```bash
  docker exec discover_uzbekistan_db mysqldump -u root -pIronman3106) discover_uzbekistan > backup.sql
  ```

- **Restore Database**:
  ```bash
  docker exec -i discover_uzbekistan_db mysql -u root -pIronman3106) discover_uzbekistan < backup.sql
  ```
