"""
Configuration module for CDN processing
Centralized configuration with validation
"""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

# Load .env file if it exists
try:
    from dotenv import load_dotenv
    
    # Look for .env in current directory and parent directories
    env_path = Path.cwd() / '.env'
    if env_path.exists():
        load_dotenv(env_path)
    else:
        # Try parent directories
        load_dotenv(dotenv_path=Path.cwd().parent / '.env', override=False)
        load_dotenv(override=False)  # Load from default locations
except ImportError:
    # python-dotenv not installed, rely on system environment
    pass


@dataclass(frozen=True)
class ProcessingConfig:
    """Asset processing configuration"""

    hash_algorithm: str = "sha256"
    hash_length: int = 12
    output_dir: str = "processed"
    generate_manifest: bool = True
    manifest_version: str = "1.0.0"


@dataclass(frozen=True)
class R2Config:
    """Cloudflare R2 configuration"""

    account_id: str
    access_key_id: str
    secret_access_key: str
    bucket_name: str = "openarm-cad-assets"
    public_url: str = "https://assets.openarm.dev"
    region: str = "auto"

    @classmethod
    def from_env(cls) -> "R2Config":
        """Load configuration from environment variables"""
        account_id = os.getenv("R2_ACCOUNT_ID")
        access_key_id = os.getenv("R2_ACCESS_KEY_ID")
        secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")

        if not all([account_id, access_key_id, secret_access_key]):
            raise ValueError("Missing required R2 environment variables")

        return cls(
            account_id=account_id,
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
            bucket_name=os.getenv("R2_BUCKET_NAME", cls.bucket_name),
            public_url=os.getenv("R2_PUBLIC_URL", cls.public_url),
        )

    def validate(self) -> list[str]:
        """Validate configuration"""
        errors = []

        if not self.account_id:
            errors.append("R2_ACCOUNT_ID is required")
        if not self.access_key_id:
            errors.append("R2_ACCESS_KEY_ID is required")
        if not self.secret_access_key:
            errors.append("R2_SECRET_ACCESS_KEY is required")
        if not self.bucket_name:
            errors.append("R2_BUCKET_NAME is required")
        if not self.public_url:
            errors.append("R2_PUBLIC_URL is required")

        return errors


@dataclass(frozen=True)
class CacheConfig:
    """CDN caching configuration"""

    asset_max_age: int = 31536000  # 1 year in seconds
    asset_immutable: bool = True
    manifest_max_age: int = 300  # 5 minutes
    compression_enabled: bool = True


@dataclass(frozen=True)
class PathConfig:
    """Path configuration"""

    root: Path
    assets: Path
    processed: Path
    manifest: Path
    urdf: Optional[Path] = None

    @classmethod
    def create(
        cls, root: Optional[Path] = None, assets_dir: str = "assets", output_dir: str = "processed"
    ) -> "PathConfig":
        """Create path configuration"""
        root_path = root or Path.cwd()
        assets_path = root_path / assets_dir
        processed_path = root_path / output_dir
        manifest_path = processed_path / "manifest.json"

        # Find URDF file
        urdf_files = list(root_path.glob("*.urdf"))
        urdf_path = urdf_files[0] if urdf_files else None

        return cls(
            root=root_path,
            assets=assets_path,
            processed=processed_path,
            manifest=manifest_path,
            urdf=urdf_path,
        )


class ConfigLoader:
    """Centralized configuration loader"""

    def __init__(self, root_path: Optional[Path] = None):
        self.root = root_path or Path.cwd()

    def load_processing_config(self, overrides: Optional[dict] = None) -> ProcessingConfig:
        """Load processing configuration with optional overrides"""
        config_dict = {}

        if overrides:
            config_dict.update(overrides)

        return ProcessingConfig(**config_dict)

    def load_r2_config(self) -> R2Config:
        """Load R2 configuration from environment"""
        return R2Config.from_env()

    def load_cache_config(self) -> CacheConfig:
        """Load cache configuration"""
        return CacheConfig()

    def load_path_config(self, assets_dir: str = "assets", output_dir: str = "processed") -> PathConfig:
        """Load path configuration"""
        return PathConfig.create(self.root, assets_dir, output_dir)

