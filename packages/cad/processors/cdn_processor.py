"""
CDN Processor for onshape-to-robot
Processes assets for CDN deployment with hashing and optimization
"""

from pathlib import Path
from typing import List

try:
    from onshape_to_robot.processor import Processor
    from onshape_to_robot.config import Config
    from onshape_to_robot.robot import Robot
except ImportError:
    print("❌ onshape-to-robot not installed")
    print("Install with: uv pip install onshape-to-robot")
    raise

import sys
from pathlib import Path

# Add parent directory to Python path for lib imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib.config import ConfigLoader, ProcessingConfig
from lib.manifest import ManifestGenerator
from lib.processing import AssetInfo, AssetProcessor, URDFUpdater, create_hasher


class CDNProcessor(Processor):
    """
    Custom processor for CDN asset preparation
    
    SOLID Principles:
    - Single Responsibility: Orchestrates asset processing workflow
    - Open/Closed: Extendable via composition
    - Dependency Inversion: Depends on abstractions (protocols)
    
    Configuration in config.json:
    {
        "cdn_enabled": true,
        "cdn_output_dir": "processed",
        "cdn_hash_length": 12,
        "cdn_generate_manifest": true
    }
    """

    def __init__(self, config: Config):
        super().__init__(config)

        # Load configuration
        self.cdn_enabled: bool = config.get("cdn_enabled", False)
        output_dir_name: str = config.get("cdn_output_dir", "processed")
        hash_length: int = config.get("cdn_hash_length", 12)
        self.should_generate_manifest: bool = config.get("cdn_generate_manifest", True)

        # Setup components (Dependency Injection)
        self.config_loader = ConfigLoader()
        self.hasher = create_hasher("sha256", hash_length)
        self.output_dir = Path.cwd() / output_dir_name
        self.asset_processor = AssetProcessor(self.hasher, self.output_dir)
        self.urdf_updater = URDFUpdater()
        self.manifest_generator = ManifestGenerator()

        # Paths
        self.assets_dir = Path(config.get("assets_directory", "assets"))
        
        # Get output filename (defaults to robot name if not specified)
        self.output_filename = config.get("output_filename", config.get("robot_name", "robot"))

        # State
        self.processed_assets: List[AssetInfo] = []

        if self.cdn_enabled:
            print("🌐 CDN Processor enabled")
            print(f"   Output: {self.output_dir}")

    def process(self, robot: Robot):
        """
        Process robot assets after URDF generation
        This is called automatically by onshape-to-robot
        
        Orchestrates the workflow using injected components
        """
        if not self.cdn_enabled:
            return

        print("\n🔄 Processing assets for CDN...")

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Process all STL files
        self._process_stl_assets()

        # Process URDF - use output_filename, not robot.name
        urdf_path = Path(f"{self.output_filename}.urdf")
        if urdf_path.exists():
            self._process_urdf(urdf_path, self.output_filename)
        else:
            print(f"   ⚠️  URDF file not found: {urdf_path}")
            print(f"   Expected: {urdf_path.absolute()}")

        # Generate manifest
        if self.should_generate_manifest:
            self._generate_manifest()

        print("\n✅ CDN processing complete!")

    def _process_stl_assets(self) -> None:
        """Process all STL files (Single Responsibility)"""
        stl_files = sorted(self.assets_dir.glob("*.stl"))
        root_path = Path.cwd().resolve()

        for stl_file in stl_files:
            try:
                # Resolve absolute paths for comparison
                resolved_file = stl_file.resolve()
                asset_info = self.asset_processor.process_file(resolved_file, root_path)
                self.processed_assets.append(asset_info)
                print(f"   ✓ {asset_info.original} → {asset_info.processed}")
            except Exception as e:
                print(f"   ⚠️  Failed to process {stl_file.name}: {e}")

    def _process_urdf(self, urdf_path: Path, robot_name: str) -> None:
        """Process URDF file (Single Responsibility)"""
        print(f"\n📝 Updating URDF references...")

        # Read original URDF
        with open(urdf_path, "r", encoding="utf-8") as f:
            urdf_content = f.read()

        # Update references using URDFUpdater
        updated_content = self.urdf_updater.process_urdf(urdf_content, self.processed_assets)

        # Calculate hash for processed URDF
        urdf_hash = self.hasher.hash_string(updated_content)
        processed_urdf_name = f"{robot_name}.{urdf_hash}.urdf"
        processed_urdf_path = self.output_dir / processed_urdf_name

        # Write processed URDF
        with open(processed_urdf_path, "w", encoding="utf-8") as f:
            f.write(updated_content)

        # Add to processed assets
        urdf_info = AssetInfo(
            original=urdf_path.name,
            processed=processed_urdf_name,
            hash=urdf_hash,
            size=processed_urdf_path.stat().st_size,
            type="application/xml",
            path=str(urdf_path),
        )
        self.processed_assets.append(urdf_info)

        print(f"   ✓ {urdf_path.name} → {processed_urdf_name}")

    def _generate_manifest(self) -> None:
        """Generate manifest file (Single Responsibility)"""
        manifest_path = self.output_dir / "manifest.json"

        manifest = self.manifest_generator.generate_and_write(
            self.processed_assets, manifest_path
        )

        total_size = self.manifest_generator.calculate_total_size(self.processed_assets)
        size_str = self.manifest_generator.format_size(total_size)

        print(f"\n📦 Manifest generated:")
        print(f"   File: {manifest_path}")
        print(f"   Assets: {len(self.processed_assets)}")
        print(f"   Total size: {size_str}")

