#!/usr/bin/env python3
"""
Upload processed assets to Cloudflare R2 (S3-compatible CDN)
Refactored for modularity and zero duplication
"""

import json
import sys
from pathlib import Path

# Load .env file before importing processors
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / '.env')
except ImportError:
    pass

# Add parent directory to Python path for local imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib.config import CacheConfig, ConfigLoader, R2Config
from lib.manifest import ManifestGenerator
from lib.storage import CDNUploader, R2StorageClient


class UploadOrchestrator:
    """
    Orchestrate CDN upload workflow
    Single Responsibility: Coordinate upload process
    """

    def __init__(self):
        # Load configurations (no hardcoding)
        self.config_loader = ConfigLoader()
        self.r2_config = self._load_r2_config()
        self.cache_config = self.config_loader.load_cache_config()
        self.path_config = self.config_loader.load_path_config()

        # Create components (Dependency Injection)
        self.storage_client = R2StorageClient(self.r2_config)
        self.uploader = CDNUploader(self.storage_client, self.r2_config, self.cache_config)
        self.manifest_gen = ManifestGenerator()

    def _load_r2_config(self) -> R2Config:
        """Load and validate R2 configuration"""
        try:
            config = self.config_loader.load_r2_config()
        except ValueError as e:
            print(f"❌ Configuration error: {e}")
            print("\nSet required environment variables:")
            print("  export R2_ACCOUNT_ID=your_account_id")
            print("  export R2_ACCESS_KEY_ID=your_access_key")
            print("  export R2_SECRET_ACCESS_KEY=your_secret_key")
            sys.exit(1)

        # Validate
        errors = config.validate()
        if errors:
            print("❌ R2 configuration errors:")
            for error in errors:
                print(f"   - {error}")
            sys.exit(1)

        return config

    def upload_all(self) -> None:
        """Upload all processed assets and URDF entry point"""
        # Check manifest exists
        if not self.path_config.manifest.exists():
            print(f"❌ No manifest found: {self.path_config.manifest}")
            print("   Run: uv run onshape-to-robot .")
            sys.exit(1)

        # Load manifest
        with open(self.path_config.manifest, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        print(f"🚀 Uploading to Cloudflare R2...\n")
        print(f"   Bucket: {self.r2_config.bucket_name}")
        print(f"   Public URL: {self.r2_config.public_url}\n")

        # Separate URDF entry point from assets
        urdf_asset = None
        mesh_assets = []
        
        for asset in manifest["assets"]:
            if asset["type"] == "application/xml":
                urdf_asset = asset
            else:
                mesh_assets.append(asset)

        # Upload mesh assets first
        print(f"📦 Uploading {len(mesh_assets)} mesh assets...")
        for asset in mesh_assets:
            file_path = self.path_config.processed / asset["processed"]

            if not file_path.exists():
                print(f"   ⚠️  Skipping missing file: {asset['processed']}")
                continue

            s3_key = f"assets/{asset['processed']}"
            self.uploader.upload_asset(file_path, s3_key, asset["type"])

            cdn_url = self.uploader.get_cdn_url(s3_key)
            print(f"   ✓ {asset['original']} → {cdn_url}")

        # Upload URDF entry point (at root, not in assets/)
        if urdf_asset:
            print(f"\n📄 Uploading URDF entry point...")
            file_path = self.path_config.processed / urdf_asset["processed"]
            
            if file_path.exists():
                # URDF goes to root, not assets/ subdirectory
                s3_key = urdf_asset["processed"]
                self.uploader.upload_asset(file_path, s3_key, urdf_asset["type"])
                
                cdn_url = self.uploader.get_cdn_url(s3_key)
                print(f"   ✓ {urdf_asset['original']} → {cdn_url}")
            else:
                print(f"   ⚠️  URDF file not found: {file_path}")

        # Update manifest with CDN URLs and upload
        self._upload_manifest_with_urls(manifest)

        # Print summary
        self._print_summary()

    def _upload_manifest_with_urls(self, manifest: dict) -> None:
        """Update manifest with CDN URLs and upload"""
        # Add CDN URLs using ManifestGenerator
        cdn_manifest = self.manifest_gen.add_cdn_urls(manifest, self.r2_config.public_url)

        # Write updated manifest
        cdn_manifest_path = self.path_config.processed / "manifest.cdn.json"
        self.manifest_gen.write(cdn_manifest, cdn_manifest_path)

        # Upload
        with open(cdn_manifest_path, "r", encoding="utf-8") as f:
            self.uploader.upload_manifest(f.read())

        print(f"\n   ✓ Manifest uploaded")

    def _print_summary(self) -> None:
        """Print upload summary"""
        stats = self.uploader.get_stats()
        manifest_url = self.uploader.get_cdn_url("manifest.json")

        print(f"\n✅ Upload complete!")
        print(f"   Files: {stats['uploaded_count']}")
        print(f"   Size: {stats['total_size_mb']:.2f} MB")
        print(f"   Manifest: {manifest_url}")


def main():
    """Main entry point"""
    orchestrator = UploadOrchestrator()
    orchestrator.upload_all()


if __name__ == "__main__":
    main()

