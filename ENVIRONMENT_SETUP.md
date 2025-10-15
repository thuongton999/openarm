# Environment Setup Guide

Complete guide for setting up environment variables across the OpenArm monorepo.

## Overview

The OpenArm project uses environment variables for:
- **Onshape API** credentials (CAD package)
- **Cloudflare R2** credentials (CDN deployment)
- **CDN configuration** (WebConnect app)

## Quick Start

```bash
# 1. CAD Package
cd packages/cad
cp env.example .env
# Edit .env with your credentials

# 2. WebConnect App
cd ../../apps/webconnect
cp env.example .env
# Edit .env with your CDN settings
```

## Detailed Setup

### 1. packages/cad/.env

**Purpose:** Onshape export and CDN upload

**Required for:**
- Exporting CAD from Onshape → URDF
- Uploading processed assets to Cloudflare R2

**Template:**
```bash
# Onshape API (required for export)
ONSHAPE_API=https://cad.onshape.com
ONSHAPE_ACCESS_KEY=your_onshape_access_key
ONSHAPE_SECRET_KEY=your_onshape_secret_key

# Cloudflare R2 (required for CDN upload)
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=openarm-cad-assets
R2_PUBLIC_URL=https://assets.openarm.dev
```

**How to get credentials:**

**Onshape API:**
1. Go to https://cad.onshape.com/appstore/dev-portal
2. Click "Create API Key"
3. Copy Access Key and Secret Key
4. Paste into `.env`

**Cloudflare R2:**
1. Log in to https://dash.cloudflare.com
2. Navigate to **R2 Object Storage**
3. Click **Manage R2 API Tokens**
4. Create token with **Read & Write** permissions
5. Copy credentials to `.env`
6. Create bucket: `openarm-cad-assets`
7. Set up public access (custom domain or R2.dev)

### 2. apps/webconnect/.env

**Purpose:** CDN asset loading in production

**Required for:**
- Loading assets from CDN instead of local files (production)

**Template:**
```bash
# CDN Configuration
VITE_CDN_ENABLED=false

# CDN URLs (set these for production)
VITE_CDN_MANIFEST_URL=https://assets.openarm.dev/manifest.json
VITE_CDN_PUBLIC_URL=https://assets.openarm.dev
```

**Modes:**

**Development (default):**
```bash
VITE_CDN_ENABLED=false
# or just don't create .env file
```
- Assets loaded from `packages/cad/assets`
- No internet required
- Fast iteration

**Production:**
```bash
VITE_CDN_ENABLED=true
VITE_CDN_MANIFEST_URL=https://assets.openarm.dev/manifest.json
VITE_CDN_PUBLIC_URL=https://assets.openarm.dev
```
- Assets loaded from Cloudflare CDN
- Global edge delivery
- Faster worldwide

## Environment Variable Reference

### Onshape Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ONSHAPE_API` | Yes | - | Onshape API endpoint |
| `ONSHAPE_ACCESS_KEY` | Yes | - | API access key |
| `ONSHAPE_SECRET_KEY` | Yes | - | API secret key |

### Cloudflare R2 Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `R2_ACCOUNT_ID` | Yes | - | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Yes | - | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | Yes | - | R2 API secret key |
| `R2_BUCKET_NAME` | No | `openarm-cad-assets` | R2 bucket name |
| `R2_PUBLIC_URL` | No | `https://assets.openarm.dev` | Public CDN URL |

### WebConnect Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_CDN_ENABLED` | No | `false` | Enable CDN asset loading |
| `VITE_CDN_MANIFEST_URL` | No | - | Manifest JSON URL |
| `VITE_CDN_PUBLIC_URL` | No | - | CDN base URL |

## Security Best Practices

### ✅ DO

- ✅ Use `.env` files (gitignored)
- ✅ Copy from `env.example`
- ✅ Rotate credentials periodically
- ✅ Use minimal permissions (read-only where possible)
- ✅ Keep credentials local (never commit)

### ❌ DON'T

- ❌ Commit `.env` files to git
- ❌ Share credentials in chat/email
- ❌ Use production credentials in development
- ❌ Hardcode credentials in code
- ❌ Use overly permissive API tokens

## Validation

### Check Configuration

**CAD Package:**
```bash
cd packages/cad

# Verify Onshape credentials
uv run onshape-to-robot .
# Will show errors if credentials invalid

# Verify R2 credentials
uv run python scripts/upload_to_cdn.py
# Will validate before attempting upload
```

**WebConnect:**
```bash
cd apps/webconnect

# Check CDN config
bun run dev
# Check browser console for CDN messages
```

### Common Errors

**"Missing required environment variables"**
- Check `.env` file exists
- Verify variable names are correct
- Ensure no typos in values

**"Failed to fetch URDF"**
- Check Onshape credentials
- Verify document URL in `config.json`
- Check internet connection

**"Failed to upload to R2"**
- Check R2 credentials
- Verify bucket exists
- Check bucket permissions

## Multi-Environment Setup

### Local Development

```bash
# packages/cad/.env
ONSHAPE_ACCESS_KEY=dev_key
R2_BUCKET_NAME=openarm-dev

# apps/webconnect/.env
VITE_CDN_ENABLED=false
```

### Staging

```bash
# packages/cad/.env
ONSHAPE_ACCESS_KEY=staging_key
R2_BUCKET_NAME=openarm-staging
R2_PUBLIC_URL=https://staging-assets.openarm.dev

# apps/webconnect/.env
VITE_CDN_ENABLED=true
VITE_CDN_PUBLIC_URL=https://staging-assets.openarm.dev
```

### Production

```bash
# packages/cad/.env
ONSHAPE_ACCESS_KEY=prod_key
R2_BUCKET_NAME=openarm-cad-assets
R2_PUBLIC_URL=https://assets.openarm.dev

# apps/webconnect/.env
VITE_CDN_ENABLED=true
VITE_CDN_PUBLIC_URL=https://assets.openarm.dev
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy CAD Assets

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      
      - name: Install uv
        run: curl -LsSf https://astral.sh/uv/install.sh | sh
      
      - name: Export and Process
        working-directory: packages/cad
        env:
          ONSHAPE_ACCESS_KEY: ${{ secrets.ONSHAPE_ACCESS_KEY }}
          ONSHAPE_SECRET_KEY: ${{ secrets.ONSHAPE_SECRET_KEY }}
        run: uv run onshape-to-robot .
      
      - name: Upload to CDN
        working-directory: packages/cad
        env:
          R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
        run: uv run python scripts/upload_to_cdn.py
```

### Secrets Configuration

Add these secrets in GitHub repository settings:

- `ONSHAPE_ACCESS_KEY`
- `ONSHAPE_SECRET_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

## Troubleshooting

### Issue: "Cannot find .env file"

**Solution:**
```bash
# Create from example
cp env.example .env
# Edit with your credentials
```

### Issue: "Invalid credentials"

**Solution:**
```bash
# Re-generate Onshape API keys
# Visit: https://cad.onshape.com/appstore/dev-portal

# Re-generate R2 API token
# Visit: https://dash.cloudflare.com → R2 → API Tokens
```

### Issue: "Permission denied"

**Solution:**
```bash
# Check API token permissions
# Onshape: Needs read access to documents
# R2: Needs read/write access to bucket
```

### Issue: "Bucket not found"

**Solution:**
```bash
# Create R2 bucket
# Dashboard → R2 → Create Bucket → openarm-cad-assets
```

## Environment Files Summary

| File | Purpose | Gitignored | Variables |
|------|---------|-----------|-----------|
| `packages/cad/env.example` | Template | ❌ No | All (with placeholders) |
| `packages/cad/.env` | Actual credentials | ✅ Yes | Onshape + R2 |
| `apps/webconnect/env.example` | Template | ❌ No | CDN config |
| `apps/webconnect/.env` | Actual config | ✅ Yes | CDN enabled/URLs |

## Status

✅ **Environment Setup Complete**
- Comprehensive env.example files
- Clear documentation
- Security best practices
- Multi-environment support
- CI/CD examples
- Troubleshooting guide

🔒 **Security Verified**
- All credentials in .env (gitignored)
- No hardcoded secrets
- Minimal permissions documented
- Rotation guidance included

📚 **Documentation Complete**
- Step-by-step setup
- Credential acquisition guides
- Common error solutions
- CI/CD integration examples

