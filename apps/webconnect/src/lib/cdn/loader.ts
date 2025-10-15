/**
 * CDN Asset Loader
 * Loads assets from Cloudflare CDN with caching and retry logic
 * Single Responsibility: Manage CDN asset loading
 */

import { CDN_CONFIG } from '$lib/config';
import { logger } from '$lib/core';

export interface AssetManifest {
	version: string;
	generated: string;
	processor?: string;
	assets: AssetInfo[];
}

export interface AssetInfo {
	original: string;
	processed: string;
	hash: string;
	size: number;
	type: string;
	url?: string;
	path?: string;
}

export class CDNAssetLoader {
	private manifest: AssetManifest | null = null;
	private readonly manifestCache = new Map<string, { data: AssetManifest; timestamp: number }>();
	private readonly assetUrlCache = new Map<string, string>();
	private readonly manifestUrl: string;
	private readonly publicUrl: string;
	private readonly cacheTimeout: number;
	private readonly retryAttempts: number;
	private readonly retryDelay: number;

	constructor() {
		this.manifestUrl = CDN_CONFIG.manifestUrl;
		this.publicUrl = CDN_CONFIG.publicUrl;
		this.cacheTimeout = CDN_CONFIG.cacheTimeout;
		this.retryAttempts = CDN_CONFIG.retryAttempts;
		this.retryDelay = CDN_CONFIG.retryDelay;
	}

	/**
	 * Load and cache the asset manifest with retry logic
	 */
	async loadManifest(): Promise<AssetManifest> {
		// Check cache validity
		const cached = this.manifestCache.get(this.manifestUrl);
		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			logger.debug('Using cached manifest', { age: Date.now() - cached.timestamp });
			return cached.data;
		}

		// Load with retries
		for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
			try {
				logger.info('Fetching manifest from CDN', { attempt, url: this.manifestUrl });

				const response = await fetch(this.manifestUrl);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const manifest = (await response.json()) as AssetManifest;

				// Validate manifest
				this.validateManifest(manifest);

				// Cache manifest
				this.manifestCache.set(this.manifestUrl, {
					data: manifest,
					timestamp: Date.now()
				});
				this.manifest = manifest;

				logger.info('Manifest loaded', {
					version: manifest.version,
					assets: manifest.assets.length,
					processor: manifest.processor
				});

				return manifest;
			} catch (error) {
				logger.error(`Manifest load failed (attempt ${attempt}/${this.retryAttempts})`, error);

				if (attempt < this.retryAttempts) {
					await this.sleep(this.retryDelay);
				} else {
					throw new Error(`Failed to load manifest after ${this.retryAttempts} attempts: ${error}`);
				}
			}
		}

		throw new Error('Failed to load manifest');
	}

	/**
	 * Validate manifest structure
	 */
	private validateManifest(manifest: unknown): asserts manifest is AssetManifest {
		if (!manifest || typeof manifest !== 'object') {
			throw new Error('Invalid manifest: not an object');
		}

		const m = manifest as Partial<AssetManifest>;

		if (!m.version || !m.generated || !Array.isArray(m.assets)) {
			throw new Error('Invalid manifest: missing required fields');
		}
	}

	/**
	 * Get CDN URL by original asset name
	 */
	async getAssetUrl(originalName: string): Promise<string> {
		// Check cache
		const cached = this.assetUrlCache.get(originalName);
		if (cached) {
			logger.debug('Using cached asset URL', { original: originalName });
			return cached;
		}

		// Load manifest if not loaded
		if (!this.manifest) {
			await this.loadManifest();
		}

		// Find asset in manifest
		const asset = this.manifest?.assets.find((a) => a.original === originalName);

		if (!asset) {
			throw new Error(`Asset not found in manifest: ${originalName}`);
		}

		// Use CDN URL from manifest (already includes correct path)
		const url = asset.url || this.constructAssetUrl(asset);

		// Cache the URL
		this.assetUrlCache.set(originalName, url);

		logger.debug('Asset URL resolved', { original: originalName, url });

		return url;
	}

	/**
	 * Get CDN URL by processed (hashed) filename
	 * Used when URDF already contains hashed filenames
	 */
	async getAssetUrlByProcessed(processedName: string): Promise<string> {
		// Check cache
		const cached = this.assetUrlCache.get(processedName);
		if (cached) {
			logger.debug('Using cached asset URL', { processed: processedName });
			return cached;
		}

		// Load manifest if not loaded
		if (!this.manifest) {
			await this.loadManifest();
		}

		// Find asset by processed name
		const asset = this.manifest?.assets.find((a) => a.processed === processedName);

		if (!asset) {
			throw new Error(`Asset not found in manifest: ${processedName}`);
		}

		// Use CDN URL from manifest
		const url = asset.url || this.constructAssetUrl(asset);

		// Cache the URL
		this.assetUrlCache.set(processedName, url);

		logger.debug('Asset URL resolved by processed name', { processed: processedName, url });

		return url;
	}

	/**
	 * Get URDF entry point URL from manifest
	 */
	async getUrdfUrl(urdfFilename: string): Promise<string> {
		// Check cache
		const cached = this.assetUrlCache.get(urdfFilename);
		if (cached) {
			logger.debug('Using cached URDF URL', { filename: urdfFilename });
			return cached;
		}

		// Load manifest if not loaded
		if (!this.manifest) {
			await this.loadManifest();
		}

		// Find URDF in manifest (entry point)
		const urdfAsset = this.manifest?.assets.find(
			(a) => a.original === urdfFilename && a.type === 'application/xml'
		);

		if (!urdfAsset) {
			throw new Error(`URDF not found in manifest: ${urdfFilename}`);
		}

		// URDF is at CDN root (entry point)
		const url = urdfAsset.url || `${this.publicUrl}/${urdfAsset.processed}`;

		// Cache the URL
		this.assetUrlCache.set(urdfFilename, url);

		logger.info('URDF URL resolved', { filename: urdfFilename, url });

		return url;
	}

	/**
	 * Construct asset URL based on type
	 */
	private constructAssetUrl(asset: AssetInfo): string {
		// URDF (entry point) at root, mesh assets in /assets/
		if (asset.type === 'application/xml') {
			return `${this.publicUrl}/${asset.processed}`;
		}
		return `${this.publicUrl}/assets/${asset.processed}`;
	}

	/**
	 * Resolve package:// URLs to CDN URLs
	 */
	async resolvePackageUrl(packageUrl: string): Promise<string> {
		// Normalize path separators
		let normalized = packageUrl.replace(/\\/g, '/');

		// Remove package:// prefix
		if (normalized.startsWith('package://')) {
			normalized = normalized.replace('package://', '');
		}

		// Extract filename from path
		const filename = normalized.split('/').pop() || '';

		if (!filename) {
			throw new Error(`Invalid package URL: ${packageUrl}`);
		}

		// Get CDN URL for the asset
		return await this.getAssetUrl(filename);
	}

	/**
	 * Preload assets for faster initial render
	 * Uses link prefetch for non-blocking preload
	 */
	async preloadAssets(): Promise<void> {
		if (!this.manifest) {
			await this.loadManifest();
		}

		if (!this.manifest) {
			logger.warn('No manifest available for preloading');
			return;
		}

		logger.info('Preloading assets', { count: this.manifest.assets.length });

		const preloadPromises = this.manifest.assets
			.filter((asset) => asset.url)
			.map((asset) => this.createPrefetchLink(asset.url as string, asset.type));

		await Promise.all(preloadPromises);

		logger.info('Assets preloaded');
	}

	/**
	 * Create prefetch link element for asset
	 */
	private createPrefetchLink(url: string, contentType: string): Promise<void> {
		return new Promise((resolve) => {
			const link = document.createElement('link');
			link.rel = 'prefetch';
			link.href = url;
			link.as = contentType.startsWith('model/') ? 'fetch' : 'fetch';
			link.onload = () => resolve();
			link.onerror = () => resolve(); // Don't fail on preload errors
			document.head.appendChild(link);
		});
	}

	/**
	 * Clear all caches
	 */
	clearCache(): void {
		this.manifestCache.clear();
		this.assetUrlCache.clear();
		this.manifest = null;
		logger.info('CDN cache cleared');
	}

	/**
	 * Sleep utility for retry delays
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		manifestCached: boolean;
		assetsCached: number;
		manifestAge: number | null;
	} {
		const cached = this.manifestCache.get(this.manifestUrl);

		return {
			manifestCached: !!cached,
			assetsCached: this.assetUrlCache.size,
			manifestAge: cached ? Date.now() - cached.timestamp : null
		};
	}
}

// Singleton instance
let cdnLoaderInstance: CDNAssetLoader | null = null;

export function getCDNLoader(): CDNAssetLoader {
	if (!cdnLoaderInstance) {
		cdnLoaderInstance = new CDNAssetLoader();
	}
	return cdnLoaderInstance;
}

export function resetCDNLoader(): void {
	cdnLoaderInstance = null;
}
