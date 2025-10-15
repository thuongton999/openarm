# WebConnect

Real-time robot control web application for OpenArm using SvelteKit, Three.js, and Web Serial API.

## Features

- 🤖 3D robot visualization from URDF (loaded from CDN)
- 🎮 Real-time joint control with sliders
- 🔌 Web Serial API for direct hardware communication
- 🌐 CDN-powered asset delivery (Cloudflare R2)
- 📦 Zero duplication (no static asset copying)
- 🧪 Unit tested protocol implementation (24 tests passing)
- 🎨 Carbon Design System (IBM)
- ⚡ Performance optimized (memoization, throttling, retry logic)
- 🏗️ SOLID principles throughout
- ♿ WCAG 2.1 AA accessible

## Architecture

```
apps/webconnect/
├── __tests__/        # Centralized test suite
│   ├── protocol/    # Protocol tests (checksum, packet)
│   └── utils/       # Utility tests (math, timing)
├── src/
│   ├── lib/
│   │   ├── config/  # Centralized configuration (all constants)
│   │   ├── core/    # Error handling, logging, environment
│   │   ├── protocol/# Binary packet protocol (sync, checksum, encoding)
│   │   ├── serial/  # Web Serial port manager, reader FSM, writer
│   │   ├── three/   # Three.js scene, renderer, controls
│   │   ├── urdf/    # URDF loader with asset path resolution
│   │   ├── ik/      # IK solver with joint constraints
│   │   ├── state/   # Svelte stores (connection, robot, joints)
│   │   ├── ui/      # Carbon Design System components
│   │   └── utils/   # Reusable utilities (math, timing)
│   └── routes/      # SvelteKit pages
```

## Requirements

- **Bun** (latest) - Runtime and package manager
- **Chromium-based browser** (Chrome, Edge, Brave, etc.) - Web Serial API support

## Setup

### 1. Deploy CDN Assets

WebConnect loads all robot assets from CDN. Before running the app, deploy assets:

```bash
# From project root
cd packages/cad

# Install dependencies
uv sync
uv pip install -e .

# Setup environment
cp env.example .env
# Edit .env with Onshape and R2 credentials

# Export and process assets
uv run onshape-to-robot .

# Upload to CDN
uv run python scripts/upload_to_cdn.py
```

### 2. Configure WebConnect

```bash
cd apps/webconnect

# Setup environment
cp env.example .env
# Edit .env with CDN URLs (should match R2_PUBLIC_URL from cad package)

# Install dependencies
bun install
```

## Development

```bash
# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Run tests
bun test

# Type check
bun run check

# Lint (Biome)
bun run lint

# Format (Biome)
bun run format

# Check formatting without writing
bun run format:check

# Run all Biome checks (lint + format)
bun run biome:check

# Fix all Biome issues automatically
bun run biome:fix
```

## Browser Permissions

When you first click "Connect Serial", the browser will prompt you to select a serial port. This is required by the Web Serial API for security.

### Troubleshooting

**Web Serial not available:**

- Make sure you're using a Chromium-based browser (Chrome, Edge, Brave)
- Ensure you're accessing via HTTPS or localhost
- Check browser feature flags if needed

**CDN/URDF loading errors:**

- Ensure CDN assets are deployed (see Setup section)
- Check CDN URLs in `.env` match your R2 deployment
- Verify manifest.json is accessible from CDN
- Check browser console for detailed error messages

**Connection fails:**

- Check that the correct port is selected
- Verify baud rate matches firmware (default: 115200)
- Ensure no other application is using the port

## Protocol

### Packet Format

```
[SYNC_HI][SYNC_LO][LENGTH][CMD][PAYLOAD...][CHECKSUM]
```

- **SYNC**: `0xAA55` (big-endian)
- **LENGTH**: Payload size in bytes
- **CMD**: Command ID
- **PAYLOAD**: Command-specific data
- **CHECKSUM**: XOR of all bytes from CMD to end of payload

### Commands

**Set Joint Angles (0x01)**

```
CMD: 0x01
PAYLOAD: [joint1_float32][joint2_float32][joint3_float32] (little-endian)
LENGTH: 12 bytes
```

## Tech Stack

- **SvelteKit 2.x** - Framework
- **TypeScript 5.9** - Language (strict mode)
- **Three.js 0.180** - 3D rendering
- **Carbon Design System 0.89** - UI components
- **urdf-loader 0.12** - URDF parsing and visualization
- **Web Serial API** - Hardware communication
- **Biome 1.9** - Linting and formatting
- **Bun 1.2** - Runtime and package manager

## Clean Code Practices

- ✅ Feature-sliced architecture
- ✅ Pure functions for protocol and calculations
- ✅ Strict TypeScript (no `any`)
- ✅ Comprehensive error handling
- ✅ Unit tests for critical paths
- ✅ Biome for linting and formatting
- ✅ Zero code duplication
- ✅ Modular, composable components

## License

Part of the OpenArm project.
