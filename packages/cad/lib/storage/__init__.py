"""
Storage module for CDN uploads
Handles S3-compatible storage (Cloudflare R2)
"""

from .cdn_uploader import CDNUploader, R2StorageClient

__all__ = ["CDNUploader", "R2StorageClient"]

