"""
Manifest generation
Single Responsibility: Generate asset manifest
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any

from ..processing.asset_processor import AssetInfo


class ManifestGenerator:
    """
    Generate asset manifest JSON
    Interface Segregation: Small, focused interface
    """

    def __init__(self, version: str = "1.0.0", pretty_print: bool = True):
        self.version = version
        self.pretty_print = pretty_print

    def generate(self, assets: List[AssetInfo], metadata: Dict[str, Any] = None) -> Dict:
        """
        Generate manifest dictionary
        Pure function: Same inputs → same output (except timestamp)
        """
        manifest = {
            "version": self.version,
            "generated": datetime.now(timezone.utc).isoformat(),
            "processor": "onshape-to-robot-cdn",
            "assets": [self._asset_to_dict(asset) for asset in assets],
        }

        if metadata:
            manifest.update(metadata)

        return manifest

    def write(self, manifest: Dict, output_path: Path) -> None:
        """Write manifest to file"""
        output_path.parent.mkdir(parents=True, exist_ok=True)

        indent = 2 if self.pretty_print else None

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=indent, ensure_ascii=False)

    def generate_and_write(
        self, assets: List[AssetInfo], output_path: Path, metadata: Dict[str, Any] = None
    ) -> Dict:
        """Generate manifest and write to file"""
        manifest = self.generate(assets, metadata)
        self.write(manifest, output_path)
        return manifest

    def add_cdn_urls(self, manifest: Dict, base_url: str) -> Dict:
        """
        Add CDN URLs to manifest
        URDF (entry point) at root, mesh assets in /assets/
        Immutable: Returns new dict, doesn't modify input
        """
        updated = manifest.copy()

        updated["assets"] = [
            {
                **asset,
                "url": (
                    f"{base_url}/{asset['processed']}"
                    if asset["type"] == "application/xml"
                    else f"{base_url}/assets/{asset['processed']}"
                ),
            }
            for asset in manifest["assets"]
        ]

        return updated

    @staticmethod
    def _asset_to_dict(asset: AssetInfo) -> Dict:
        """Convert AssetInfo to dictionary"""
        return {
            "original": asset.original,
            "processed": asset.processed,
            "hash": asset.hash,
            "size": asset.size,
            "type": asset.type,
            "path": asset.path,
        }

    @staticmethod
    def calculate_total_size(assets: List[AssetInfo]) -> int:
        """Calculate total size of all assets in bytes"""
        return sum(asset.size for asset in assets)

    @staticmethod
    def format_size(size_bytes: int) -> str:
        """Format bytes as human-readable string"""
        for unit in ["B", "KB", "MB", "GB"]:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"

