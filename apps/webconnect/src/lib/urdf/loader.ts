import { getCDNLoader } from '$lib/cdn';
import { ROBOT_CONFIG } from '$lib/config';
import { URDFError, logger } from '$lib/core';
import * as THREE from 'three';
import URDFLoader from 'urdf-loader';
import type { URDFJoint, URDFRobot } from 'urdf-loader';

export interface RobotModel {
	robot: URDFRobot;
	joints: Map<string, URDFJoint>;
}

export class RobotURDFLoader {
	private readonly loader: URDFLoader;
	private readonly loadingManager: THREE.LoadingManager;
	private readonly cdnLoader = getCDNLoader();
	private readonly assetUrlMap = new Map<string, string>();

	constructor() {
		this.loadingManager = new THREE.LoadingManager();
		this.loader = new URDFLoader(this.loadingManager);
		this.setupURLModifier();
		this.setupLoadingCallbacks();
	}

	private setupURLModifier(): void {
		this.loadingManager.setURLModifier((url: string) => {
			// Normalize backslashes to forward slashes
			let normalized = url.replace(/\\/g, '/');

			// Try different cache key variations
			const cacheKeys = [
				normalized,
				normalized.replace('package://', ''),
				normalized.split('/').pop() || '' // Just the filename
			];

			for (const key of cacheKeys) {
				const cached = this.assetUrlMap.get(key);
				if (cached) {
					logger.info('URL resolved from cache', { 
						original: url, 
						cacheKey: key,
						resolved: cached 
					});
					return cached;
				}
			}

			// If not in cache, log warning
			logger.warn('URL not in cache, using as-is', { 
				url, 
				normalized,
				cacheSize: this.assetUrlMap.size 
			});
			return normalized;
		});
	}

	private setupLoadingCallbacks(): void {
		this.loadingManager.onStart = (url, loaded, total) => {
			logger.debug('Loading started', { url, loaded, total });
		};

		this.loadingManager.onLoad = () => {
			logger.info('All assets loaded');
		};

		this.loadingManager.onError = (url) => {
			logger.error('Asset loading failed', { url });
		};
	}

	async load(urdfFilename: string): Promise<RobotModel> {
		try {
			logger.info('Loading robot from CDN', { urdfFilename });

			// Load manifest first to get asset URLs
			await this.cdnLoader.loadManifest();

			// Resolve URDF URL from manifest (gets hashed filename)
			const urdfUrl = await this.cdnLoader.getUrdfUrl(urdfFilename);
			logger.info('URDF URL resolved from manifest', { urdfUrl });

			// Fetch URDF content
			const response = await fetch(urdfUrl);
			if (!response.ok) {
				throw new URDFError(`Failed to fetch URDF: ${response.statusText}`, {
					path: urdfUrl,
					status: response.status
				});
			}

			let urdfContent = await response.text();

			// Normalize backslashes
			urdfContent = urdfContent.replace(/\\/g, '/');

			// Pre-resolve all asset URLs from CDN manifest
			await this.preResolveAssetUrls(urdfContent);

			// Create a Blob URL for the normalized content
			const blob = new Blob([urdfContent], { type: 'application/xml' });
			const blobUrl = URL.createObjectURL(blob);

			// Load the URDF using URDFLoader
			const robot = await new Promise<URDFRobot>((resolve, reject) => {
				this.loader.load(
					blobUrl,
					(result) => resolve(result),
					undefined,
					(error) => reject(error)
				);
			});

			// Clean up blob URL
			URL.revokeObjectURL(blobUrl);

			// Build joint map
			const joints = new Map<string, URDFJoint>();
			this.collectJoints(robot, joints);

			logger.info('URDF loaded successfully', {
				joints: joints.size,
				links: Object.keys(robot.links).length
			});

			return { robot, joints };
		} catch (err) {
			throw new URDFError('Failed to load URDF from CDN', {
				path: urdfFilename,
				error: String(err)
			});
		}
	}

	/**
	 * Pre-resolve all asset URLs from CDN manifest
	 * URDF already contains hashed filenames (e.g., base.f8d39dd2cd50.stl)
	 * Just map them directly to CDN URLs from manifest
	 */
	private async preResolveAssetUrls(urdfContent: string): Promise<void> {
		// Extract all .stl references from URDF (already hashed filenames)
		const stlPattern = /filename="package:\/\/assets[\\\/]([^"]+\.stl)"/g;
		const matches = [...urdfContent.matchAll(stlPattern)];

		// Get unique processed (hashed) filenames
		const uniqueFiles = new Set(matches.map((m) => m[1]));

		logger.info('Pre-resolving hashed asset URLs from manifest', { 
			count: uniqueFiles.size,
			files: Array.from(uniqueFiles) 
		});

		for (const processedFilename of uniqueFiles) {
			try {
				// Get CDN URL by processed (hashed) filename
				const cdnUrl = await this.cdnLoader.getAssetUrlByProcessed(processedFilename);
				
				// Cache all path variations that Three.js might use
				const key1 = `package://assets/${processedFilename}`;
				const key2 = `assets/${processedFilename}`;
				const key3 = processedFilename;
				
				this.assetUrlMap.set(key1, cdnUrl);
				this.assetUrlMap.set(key2, cdnUrl);
				this.assetUrlMap.set(key3, cdnUrl);

				logger.info('Cached asset URL mapping', { 
					processed: processedFilename,
					keys: [key1, key2, key3],
					cdnUrl
				});
			} catch (error) {
				logger.error(`Failed to resolve CDN URL for ${processedFilename}`, error);
			}
		}

		logger.info('Pre-resolution complete', { 
			uniqueAssets: uniqueFiles.size,
			cacheEntries: this.assetUrlMap.size,
			cacheKeys: Array.from(this.assetUrlMap.keys())
		});
	}

	private collectJoints(obj: THREE.Object3D, joints: Map<string, URDFJoint>): void {
		if ('isURDFJoint' in obj && obj.isURDFJoint) {
			const joint = obj as URDFJoint;
			if (joint.name) {
				joints.set(joint.name, joint);
			}
		}

		obj.children.forEach((child: THREE.Object3D) => this.collectJoints(child, joints));
	}
}
