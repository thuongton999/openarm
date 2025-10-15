# OpenArm CAD Package

CAD asset management, processing, and CDN deployment for the OpenArm robot project.

## Overview

This package provides:
- 🤖 **URDF Export** - Convert Onshape CAD to URDF using [onshape-to-robot](https://onshape-to-robot.readthedocs.io/)
- 📦 **Asset Processing** - Hash and optimize STL files for web delivery
- 🌐 **CDN Deployment** - Upload to Cloudflare R2 for global distribution
- 🧪 **Simulation** - Test with PyBullet or MuJoCo

## Features

- ✅ Automated CAD export from Onshape
- ✅ Custom processor for CDN preparation (integrated with onshape-to-robot)
- ✅ Content-addressable asset naming (SHA256 hashing)
- ✅ Automatic URDF reference updates
- ✅ Manifest generation for web applications
- ✅ Cloudflare R2 integration
- ✅ Zero-duplication design

## Project Structure

```
packages/cad/
├── config.json          # Onshape document config + processor settings
├── pyproject.toml       # Python dependencies
├── env.example          # Environment variable template
├── processors/          # Custom onshape-to-robot processors
│   ├── cdn_processor.py      # Main CDN processor
│   ├── config.py             # Configuration management
│   ├── hasher.py             # File hashing (SHA256)
│   ├── asset_processor.py    # Asset processing logic
│   ├── urdf_updater.py       # URDF transformation
│   ├── manifest_generator.py # Manifest generation
│   └── cdn_uploader.py       # CDN upload logic
├── scripts/             # Deployment scripts
│   ├── upload_to_cdn.py      # Upload to Cloudflare R2
│   └── deploy.py             # Full pipeline orchestrator
├── assets/              # STL files from Onshape (gitignored)
└── processed/           # Hashed, CDN-ready assets (gitignored)
```

---

## Quick Start

```bash
# 1. Install dependencies
uv sync
uv pip install -e .

# 2. Setup environment
cp env.example .env
# Edit .env with your Onshape and R2 credentials

# 3. Export from Onshape (includes CDN processing)
uv run onshape-to-robot .

# 4. (Optional) Upload to CDN
uv run python scripts/upload_to_cdn.py
```

## Detailed Setup

### 1. Install Dependencies

This project uses [uv](https://docs.astral.sh/uv/) for dependency management.

```bash
# Install uv (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install project dependencies
uv sync

# Install this package in editable mode (makes processors available)
uv pip install -e .
```

**Dependencies installed:**
- `onshape-to-robot` - CAD export tool
- `pybullet` - Physics simulation
- `mujoco` - Advanced simulation
- `boto3` - AWS S3/Cloudflare R2 SDK

**Note:** The editable install (`-e .`) is required so onshape-to-robot can find the custom `processors` module.

### 2. Configure Environment

```bash
# Copy template
cp env.example .env

# Edit with your credentials
# - ONSHAPE_ACCESS_KEY (get from Onshape API portal)
# - ONSHAPE_SECRET_KEY (get from Onshape API portal)
# - R2_* variables (get from Cloudflare dashboard)
```

See [env.example](env.example) for detailed credential setup.

### 3. Configure Robot Export

Edit `config.json` to specify your Onshape document:

```json
{
    "url": "https://cad.onshape.com/documents/.../w/.../e/...",
    "output_format": "urdf",
    "robot_name": "openarm",
    "cdn_enabled": true,
    "processors": ["processors.cdn_processor:CDNProcessor"]
}
```

**Configuration options:**
- `url` - Onshape assembly URL (required)
- `output_format` - `urdf` or `mujoco` (required)
- `robot_name` - Name for output files (default: directory name)
- `cdn_enabled` - Enable CDN processing (default: false)
- `processors` - Custom processors to run

See [onshape-to-robot config docs](https://onshape-to-robot.readthedocs.io/en/latest/config.html) for all options.

### 4. Export Robot from Onshape

Export CAD model with automatic CDN processing:

```bash
# Export from Onshape
uv run onshape-to-robot .
```

**What happens:**
1. 📥 Downloads CAD model from Onshape (via API)
2. 📄 Generates `robot.urdf` file
3. 🎨 Downloads STL mesh files to `assets/`
4. 🔄 **CDN Processor runs automatically** (if `cdn_enabled: true`):
   - Calculates SHA256 hash for each STL file
   - Creates hashed filenames: `base.abc123def.stl`
   - Copies to `processed/` directory
   - Updates URDF references to hashed names
   - Generates `processed/manifest.json`

**Output:**
```
assets/          # Original STL files from Onshape
processed/       # CDN-ready hashed assets + manifest
robot.urdf       # Standard URDF (local paths)
```

### 5. Simulate (Optional)

Test your robot in simulation:

```bash
# PyBullet simulation
uv run onshape-to-robot-bullet .

# MuJoCo simulation
uv run onshape-to-robot-mujoco .
```

### 6. Deploy to CDN (Production)

Upload processed assets to Cloudflare R2:

```bash
# Ensure .env has R2 credentials set
# Then upload to CDN
uv run python scripts/upload_to_cdn.py
```

---

## Workflows

### Development Workflow

For local testing and iteration:

```bash
# 1. Disable CDN processing
# Edit config.json: "cdn_enabled": false

# 2. Export
uv run onshape-to-robot .

# 3. Simulate
uv run onshape-to-robot-bullet .
```

### Production Deployment

For web application deployment:

```bash
# 1. Enable CDN processing
# Edit config.json: "cdn_enabled": true

# 2. Export and process
uv run onshape-to-robot .

# 3. Upload to CDN
uv run python scripts/upload_to_cdn.py

# Result: Assets available at https://assets.openarm.dev
```

### Quick Update

If you only changed CAD and need to re-export:

```bash
# Re-export and process
uv run onshape-to-robot .

# Upload new assets
uv run python scripts/upload_to_cdn.py
```

---

## Configuration Reference

### config.json

Complete configuration example:

```json
{
  // Onshape document (required)
  "url": "https://cad.onshape.com/documents/.../w/.../e/...",
  "output_format": "urdf",
  
  // Output settings
  "robot_name": "openarm",           // Robot name in URDF <robot name="...">
  "output_filename": "robot",        // Output file: robot.urdf (CDN processor uses this)
  "assets_directory": "assets",
  
  // URDF-specific options
  "joint_properties": {
    "*": {
      "max_effort": 10.0,
      "max_velocity": 10.0
    }
  },
  
  // CDN processor settings
  "cdn_enabled": true,
  "cdn_output_dir": "processed",
  "cdn_hash_length": 12,
  "cdn_generate_manifest": true,
  
  // Custom processors
  "processors": [
    "processors.cdn_processor:CDNProcessor"
  ]
}
```

### Environment Variables

See `env.example` for complete list. Key variables:

**Onshape (required for export):**
- `ONSHAPE_ACCESS_KEY` - API access key
- `ONSHAPE_SECRET_KEY` - API secret key

**Cloudflare R2 (required for CDN upload):**
- `R2_ACCOUNT_ID` - Cloudflare account ID
- `R2_ACCESS_KEY_ID` - R2 API key
- `R2_SECRET_ACCESS_KEY` - R2 API secret
- `R2_BUCKET_NAME` - Bucket name (default: `openarm-cad-assets`)
- `R2_PUBLIC_URL` - Public CDN URL (default: `https://assets.openarm.dev`)

---

## CDN Processor

### What It Does

The custom CDN processor is integrated with onshape-to-robot's plugin system:

1. **Hashing** - SHA256 hash of each STL file
2. **Naming** - Content-addressable filenames (`base.abc123.stl`)
3. **URDF Updates** - Automatic reference updates
4. **Manifest** - JSON file mapping original → CDN URLs

### How It Works

Following [onshape-to-robot's custom processor pattern](https://onshape-to-robot.readthedocs.io/en/latest/custom_processors.html):

```python
class CDNProcessor(Processor):
    def process(self, robot: Robot):
        # Called automatically after URDF generation
        # Processes all assets and generates manifest
```

### Configuration

Enable/disable in `config.json`:

```json
{
  "cdn_enabled": true,  // Enable CDN processing
  "processors": ["processors.cdn_processor:CDNProcessor"]
}
```

### Benefits

- ✅ **Automatic** - Runs with every export
- ✅ **Integrated** - Uses onshape-to-robot's workflow
- ✅ **Configurable** - All settings in config.json
- ✅ **Immutable URLs** - Hash-based cache busting
- ✅ **Zero duplication** - Modular, SOLID design

---

## Commands

### Export

```bash
# Basic export
uv run onshape-to-robot .

# With specific configuration
uv run onshape-to-robot . --config-file custom_config.json
```

### Simulation

```bash
# PyBullet (interactive GUI)
uv run onshape-to-robot-bullet .

# MuJoCo (advanced physics)
uv run onshape-to-robot-mujoco .
```

### CDN Deployment

```bash
# Upload processed assets (ensure .env is configured)
uv run python scripts/upload_to_cdn.py
```

---

## Documentation

- 📖 **[CDN_SETUP.md](./CDN_SETUP.md)** - Complete CDN deployment guide
- 📖 **[PROCESSOR_INTEGRATION.md](./PROCESSOR_INTEGRATION.md)** - Processor integration details
- 📖 **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - Code architecture and SOLID principles
- 📖 **[ENVIRONMENT_SETUP.md](../../ENVIRONMENT_SETUP.md)** - Environment variable setup

---

## Troubleshooting

### Export Fails

**Error:** "Invalid Onshape credentials"
```bash
# Check .env file exists
ls .env

# Verify credentials
# Get new keys from: https://cad.onshape.com/appstore/dev-portal
```

**Error:** "Document not found"
```bash
# Verify URL in config.json
# Ensure you have access to the Onshape document
```

### CDN Upload Fails

**Error:** "Missing R2 credentials"
```bash
# Check R2 variables in .env
# Get credentials from: https://dash.cloudflare.com → R2
```

**Error:** "Bucket not found"
```bash
# Create bucket in Cloudflare dashboard
# Verify R2_BUCKET_NAME matches bucket name
```

### Processing Not Running

**Issue:** Processed/ directory not created

**Solution:**
```json
// Ensure cdn_enabled is true in config.json
{
  "cdn_enabled": true,
  "processors": ["processors.cdn_processor:CDNProcessor"]
}
```

---

## References

- 📚 [onshape-to-robot Documentation](https://onshape-to-robot.readthedocs.io/)
- 📚 [onshape-to-robot Config Reference](https://onshape-to-robot.readthedocs.io/en/latest/config.html)
- 📚 [Custom Processors Guide](https://onshape-to-robot.readthedocs.io/en/latest/custom_processors.html)
- 📚 [uv Documentation](https://docs.astral.sh/uv/)
- 📚 [PyBullet](https://github.com/bulletphysics/bullet3)
- 📚 [MuJoCo](https://mujoco.org/)
- 📚 [Cloudflare R2](https://developers.cloudflare.com/r2/)

---

## License

Part of the OpenArm project.
