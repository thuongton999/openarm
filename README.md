# OpenArm

A 3-DOF robot arm control system with web-based interface, featuring real-time 3D visualization, inverse kinematics, and direct hardware communication via Web Serial API.

## 🚀 Features

### WebConnect App
- **3D Robot Visualization**: Real-time 3D rendering using Three.js and URDF models
- **Interactive Control**: Smooth joint sliders with real-time feedback
- **Inverse Kinematics**: Browser-based IK solver for intuitive end-effector control
- **Web Serial Communication**: Direct hardware communication to STM32 microcontroller
- **CDN-Powered Assets**: Optimized asset delivery via Cloudflare R2
- **Modern UI**: Carbon Design System with responsive design

### CAD Processing Pipeline
- **Onshape Integration**: Automated CAD export and processing
- **Asset Optimization**: STL mesh processing with hashing and CDN deployment
- **URDF Generation**: Robot description file creation with proper joint constraints
- **CDN Deployment**: Automated upload to Cloudflare R2 for fast global delivery

## 🏗️ Architecture

```
open_arm/
├── apps/
│   ├── webconnect/          # SvelteKit web application
│   └── firmware/            # STM32 firmware (STM32CubeMX)
├── packages/
│   └── cad/                 # CAD processing and CDN deployment
├── docs/
│   └── paper.md            # Technical research paper
└── .github/workflows/      # GitHub Actions for deployment
```

### System Overview
- **Frontend**: SvelteKit + TypeScript + Three.js
- **Backend**: STM32F103C8T6 microcontroller
- **Communication**: Web Serial API + custom packet protocol
- **Assets**: CDN-hosted URDF models and STL meshes
- **Processing**: Python-based CAD pipeline with `onshape-to-robot`

## 🛠️ Technology Stack

### WebConnect App
- **Framework**: SvelteKit 2.x with TypeScript
- **Runtime**: Bun (package manager + runtime)
- **3D Graphics**: Three.js with URDFLoader
- **UI Components**: Carbon Design System
- **Linting**: Biome (ESLint + Prettier replacement)
- **Build**: Vite with static adapter for GitHub Pages

### CAD Processing
- **Language**: Python 3.13+
- **Package Manager**: uv
- **CAD Integration**: onshape-to-robot
- **Cloud Storage**: Cloudflare R2 (S3-compatible)
- **Asset Processing**: Custom processors for CDN optimization

### Hardware
- **Microcontroller**: STM32F103C8T6 (ARM Cortex-M3)
- **PWM Control**: PCA9685 I2C servo driver
- **Communication**: USB CDC (Virtual COM Port)
- **Protocol**: Custom packet-based serial protocol

## 🚀 Quick Start

### Prerequisites
- **Bun** (latest stable)
- **Python 3.13+** with uv
- **Chrome/Edge** browser (Web Serial API support)
- **STM32CubeIDE** (for firmware development)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd open_arm

# Install dependencies
bun install
```

### 2. CAD Asset Processing
```bash
cd packages/cad

# Install Python dependencies
uv sync
uv pip install -e .

# Setup environment
cp env.example .env
# Edit .env with your Onshape and R2 credentials

# Export and process CAD assets
uv run onshape-to-robot .

# Upload to CDN
uv run python scripts/upload_to_cdn.py
```

### 3. WebConnect Development
```bash
cd apps/webconnect

# Setup environment
cp env.example .env
# Edit .env with your CDN URLs

# Start development server
bun run dev

# Open http://localhost:5173 in Chrome/Edge
```

### 4. Firmware Development
```bash
cd apps/firmware

# Open firmware.ioc in STM32CubeMX
# Generate code and flash to STM32F103C8T6
```

## 📖 Usage

### Robot Control
1. **Connect Hardware**: Flash STM32 firmware and connect via USB
2. **Open WebConnect**: Navigate to the web app in Chrome/Edge
3. **Connect Serial**: Click "Connect Serial" and select the STM32 port
4. **Control Robot**: Use sliders or drag the end-effector in 3D view

### CAD Processing
1. **Update Onshape**: Modify your robot design in Onshape
2. **Process Assets**: Run the CAD processing pipeline
3. **Deploy to CDN**: Upload processed assets to Cloudflare R2
4. **Update WebConnect**: Refresh the web app to load new assets

## 🔧 Configuration

### Environment Variables

#### CAD Package (`packages/cad/.env`)
```ini
# Onshape API
ONSHAPE_ACCESS_KEY=your_access_key
ONSHAPE_SECRET_KEY=your_secret_key

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=openarm-cad-assets
R2_PUBLIC_URL=https://assets.openarm.dev
```

#### WebConnect App (`apps/webconnect/.env`)
```ini
# CDN Configuration
VITE_CDN_MANIFEST_URL=https://assets.openarm.dev/manifest.json
VITE_CDN_PUBLIC_URL=https://assets.openarm.dev
```

## 🚀 Deployment

### GitHub Pages (Automatic)
The project includes GitHub Actions for automatic deployment:

1. **Enable GitHub Pages** in repository settings
2. **Push to main**: Any changes to `apps/webconnect/**` trigger deployment
3. **Access**: Your app will be available at `https://yourusername.github.io/open_arm/`

### Manual Deployment
```bash
cd apps/webconnect
bun run build
# Deploy the 'build' folder to your hosting service
```

## 🧪 Development

### Available Scripts

#### WebConnect App
```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run preview      # Preview production build
bun run check        # Type checking
bun run lint         # Lint code
bun run format       # Format code
bun test            # Run tests
```

#### CAD Package
```bash
uv run onshape-to-robot .                    # Process CAD assets
uv run python scripts/upload_to_cdn.py      # Upload to CDN
```

### Code Structure

#### WebConnect (`apps/webconnect/src/lib/`)
```
├── config/          # Configuration constants
├── core/            # Error handling, logging, environment
├── cdn/             # CDN asset loading and caching
├── urdf/            # URDF model loading and asset resolution
├── three/           # Three.js scene, renderer, controls
├── ik/              # Inverse kinematics solver
├── serial/          # Web Serial port management
├── protocol/        # Packet protocol implementation
├── state/           # Svelte stores (connection, robot, joints)
├── ui/              # UI components
└── utils/           # Utility functions
```

## 🔬 Technical Details

### Serial Protocol
- **Sync Word**: 0xAA55
- **Commands**: Set joint angles, ACK, telemetry
- **Checksum**: XOR validation
- **Rate**: 100Hz maximum update rate

### 3D Rendering
- **Engine**: Three.js with WebGL
- **Models**: URDF format with STL meshes
- **Controls**: OrbitControls for camera manipulation
- **IK**: CCDIK solver for end-effector control

### Performance Optimizations
- **Asset Caching**: CDN with immutable caching (1 year)
- **Real-time UI**: Immediate visual feedback with throttled serial
- **Code Splitting**: Dynamic imports for better loading performance
- **Memoization**: Cached calculations for IK and math operations

## 📚 Documentation

- [Technical Paper](docs/paper.md) - Research and methodology
- [CAD Processing](packages/cad/README.md) - Asset processing pipeline
- [WebConnect](apps/webconnect/README.md) - Web application details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines
- Use TypeScript strict mode
- Follow SOLID principles
- Write clean, modular code
- Add tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Onshape**: CAD platform integration
- **Three.js**: 3D graphics library
- **SvelteKit**: Web framework
- **Carbon Design System**: UI components
- **STM32**: Microcontroller platform

## 🔗 Links

- **Live Demo**: [GitHub Pages](https://yourusername.github.io/open_arm/)
- **CAD Assets**: [CDN](https://assets.openarm.dev/)
- **Documentation**: [Wiki](https://github.com/yourusername/open_arm/wiki)

---

**Note**: This project requires a Chromium-based browser for Web Serial API support. Firefox and Safari are not supported for hardware communication.
