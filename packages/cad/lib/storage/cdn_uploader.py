"""
CDN Upload functionality
Single Responsibility: Upload files to S3-compatible storage
"""

import sys
from pathlib import Path
from typing import Protocol, Optional

try:
    import boto3
    from botocore.config import Config as BotoConfig
except ImportError:
    print("❌ Error: boto3 not installed")
    print("Install with: uv pip install boto3")
    sys.exit(1)

from ..config import CacheConfig, R2Config


class StorageClient(Protocol):
    """Protocol for storage clients (Interface Segregation)"""

    def upload_file(self, file_path: Path, key: str, content_type: str, cache_control: str) -> None:
        """Upload a file to storage"""
        ...


class R2StorageClient:
    """
    Cloudflare R2 storage client
    Dependency Inversion: Depends on R2Config abstraction
    """

    def __init__(self, config: R2Config):
        self.config = config
        self.client = self._create_client()

    def _create_client(self):
        """Create boto3 S3 client for R2"""
        endpoint_url = f"https://{self.config.account_id}.r2.cloudflarestorage.com"

        return boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=self.config.access_key_id,
            aws_secret_access_key=self.config.secret_access_key,
            config=BotoConfig(signature_version="s3v4"),
            region_name=self.config.region,
        )

    def upload_file(self, file_path: Path, key: str, content_type: str, cache_control: str) -> None:
        """Upload a file to R2"""
        self.client.upload_file(
            str(file_path),
            self.config.bucket_name,
            key,
            ExtraArgs={
                "ContentType": content_type,
                "CacheControl": cache_control,
                "Metadata": {"source": "openarm-cad", "version": "1.0.0"},
            },
        )

    def upload_json(self, content: str, key: str, cache_control: str) -> None:
        """Upload JSON content directly"""
        self.client.put_object(
            Bucket=self.config.bucket_name,
            Key=key,
            Body=content.encode("utf-8"),
            ContentType="application/json",
            CacheControl=cache_control,
            Metadata={"source": "openarm-cad"},
        )


class CDNUploader:
    """
    Upload assets to CDN
    Open/Closed: Extendable via different storage clients
    """

    def __init__(self, storage_client: StorageClient, r2_config: R2Config, cache_config: CacheConfig):
        self.storage = storage_client
        self.r2_config = r2_config
        self.cache_config = cache_config
        self.uploaded_count = 0
        self.total_size = 0

    def upload_asset(self, file_path: Path, key: str, content_type: str) -> None:
        """Upload a single asset file"""
        cache_control = self._get_asset_cache_control()

        self.storage.upload_file(file_path, key, content_type, cache_control)

        self.uploaded_count += 1
        self.total_size += file_path.stat().st_size

    def upload_manifest(self, manifest_content: str) -> None:
        """Upload manifest with shorter cache"""
        cache_control = self._get_manifest_cache_control()

        if isinstance(self.storage, R2StorageClient):
            self.storage.upload_json(manifest_content, "manifest.json", cache_control)

    def _get_asset_cache_control(self) -> str:
        """Get cache control header for assets"""
        immutable = ", immutable" if self.cache_config.asset_immutable else ""
        return f"public, max-age={self.cache_config.asset_max_age}{immutable}"

    def _get_manifest_cache_control(self) -> str:
        """Get cache control header for manifest"""
        return f"public, max-age={self.cache_config.manifest_max_age}"

    def get_cdn_url(self, key: str) -> str:
        """Get CDN URL for a key"""
        return f"{self.r2_config.public_url}/{key}"

    def get_stats(self) -> dict:
        """Get upload statistics"""
        return {
            "uploaded_count": self.uploaded_count,
            "total_size": self.total_size,
            "total_size_mb": self.total_size / 1024 / 1024,
        }

