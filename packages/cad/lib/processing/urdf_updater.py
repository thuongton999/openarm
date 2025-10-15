"""
URDF content updater
Single Responsibility: Update URDF references
"""

from pathlib import Path
from typing import List

from .asset_processor import AssetInfo


class URDFUpdater:
    """
    Update URDF file with processed asset references
    Pure transformation: Input URDF + Assets → Output URDF
    """

    @staticmethod
    def normalize_paths(content: str) -> str:
        """Normalize backslashes to forward slashes"""
        return content.replace("\\", "/")

    @staticmethod
    def update_references(content: str, assets: List[AssetInfo]) -> str:
        """
        Update asset references in URDF content
        Immutable: Does not modify input
        """
        updated = content

        for asset in assets:
            # Only update mesh files (STL, DAE, OBJ)
            if asset.type.startswith("model/"):
                # Replace original with processed filename
                # Handle various path formats
                patterns = [
                    asset.original,  # Direct filename
                    f"assets/{asset.original}",  # With directory
                    f"assets\\{asset.original}",  # With backslash
                ]

                for pattern in patterns:
                    updated = updated.replace(pattern, asset.processed)

        return updated

    @classmethod
    def process_urdf(
        cls, urdf_content: str, assets: List[AssetInfo], normalize: bool = True
    ) -> str:
        """
        Process URDF content with asset updates
        Composable: Multiple transformations
        """
        # Normalize paths
        if normalize:
            urdf_content = cls.normalize_paths(urdf_content)

        # Update asset references
        urdf_content = cls.update_references(urdf_content, assets)

        return urdf_content

    @classmethod
    def process_urdf_file(
        cls, urdf_path: Path, assets: List[AssetInfo], output_path: Path
    ) -> None:
        """Process URDF file and write to output"""
        # Read original
        with open(urdf_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Process
        processed = cls.process_urdf(content, assets)

        # Write output
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(processed)

