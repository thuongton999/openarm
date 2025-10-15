"""
File hashing utilities
Single Responsibility: Hash calculation
"""

import hashlib
from pathlib import Path
from typing import Protocol


class Hasher(Protocol):
    """Protocol for hash calculators"""

    def hash_file(self, file_path: Path) -> str:
        """Calculate hash of a file"""
        ...


class SHA256Hasher:
    """SHA256 file hasher with configurable output length"""

    def __init__(self, hash_length: int = 12):
        self.hash_length = hash_length
        self.algorithm = "sha256"

    def hash_file(self, file_path: Path) -> str:
        """Calculate SHA256 hash of file"""
        hasher = hashlib.sha256()

        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)

        return hasher.hexdigest()[: self.hash_length]

    def hash_string(self, content: str) -> str:
        """Calculate SHA256 hash of string content"""
        hasher = hashlib.sha256()
        hasher.update(content.encode("utf-8"))
        return hasher.hexdigest()[: self.hash_length]


def create_hasher(algorithm: str = "sha256", length: int = 12) -> Hasher:
    """
    Factory function for creating hashers
    Open/Closed Principle: Easy to add new algorithms
    """
    if algorithm == "sha256":
        return SHA256Hasher(length)
    else:
        raise ValueError(f"Unsupported hash algorithm: {algorithm}")

