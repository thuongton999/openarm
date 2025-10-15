"""
Asset processing logic
Single Responsibility: Process individual assets
"""

import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


@dataclass(frozen=True)
class AssetInfo:
    """Immutable asset information"""

    original: str
    processed: str
    hash: str
    size: int
    type: str
    path: str


class FileHasher(Protocol):
    """Protocol for file hashers"""

    def hash_file(self, file_path: Path) -> str:
        ...


class AssetProcessor:
    """
    Process individual assets
    Dependency Inversion: Depends on FileHasher protocol, not concrete implementation
    """

    MIME_TYPES = {
        ".stl": "model/stl",
        ".dae": "model/vnd.collada+xml",
        ".obj": "model/obj",
        ".urdf": "application/xml",
        ".xml": "application/xml",
    }

    def __init__(self, hasher: FileHasher, output_dir: Path):
        self.hasher = hasher
        self.output_dir = output_dir

    def process_file(self, file_path: Path, relative_to: Path) -> AssetInfo:
        """
        Process a single file with hashing
        Pure function: Same input → same output
        """
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # Ensure both paths are resolved (absolute)
        file_path = file_path.resolve()
        relative_to = relative_to.resolve()

        # Calculate hash
        file_hash = self.hasher.hash_file(file_path)

        # Create output filename
        output_name = f"{file_path.stem}.{file_hash}{file_path.suffix}"
        output_path = self.output_dir / output_name

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Copy file
        shutil.copy2(file_path, output_path)

        # Get file metadata
        file_size = file_path.stat().st_size
        mime_type = self.get_mime_type(file_path)
        
        # Calculate relative path safely
        try:
            relative_path = str(file_path.relative_to(relative_to))
        except ValueError:
            # If not in subpath, use absolute path
            relative_path = str(file_path)

        return AssetInfo(
            original=file_path.name,
            processed=output_name,
            hash=file_hash,
            size=file_size,
            type=mime_type,
            path=relative_path,
        )

    def get_mime_type(self, file_path: Path) -> str:
        """Get MIME type for file extension"""
        return self.MIME_TYPES.get(file_path.suffix.lower(), "application/octet-stream")

    def copy_with_hash(self, source: Path, dest_dir: Path) -> Path:
        """Copy file with hashed filename"""
        file_hash = self.hasher.hash_file(source)
        dest_name = f"{source.stem}.{file_hash}{source.suffix}"
        dest_path = dest_dir / dest_name

        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, dest_path)

        return dest_path

