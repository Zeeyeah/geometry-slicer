import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

import path from 'path';
import glslify from 'vite-plugin-glslify';
import { readFileSync } from 'fs';

export default defineConfig({
	assetsInclude: ['**/*.glb', '**/*.fbx', '**/*.mp3', '**/*.wav'],
	plugins: [
		glsl({
			include: ['**/*.glsl']
		}),
		glslify()
	],
	build: {
		rollupOptions: {
			output: {
				entryFileNames: `assets/[hash].js`,
				chunkFileNames: `assets/[hash].js`,
				assetFileNames: `assets/[hash].[ext]`,
				manualChunks: {
					three: ['three'],
					gsap: ['gsap'],
					'lil-gui': ['lil-gui']
				}
			}
		}
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
			'@gl': path.resolve(__dirname, 'src/utils/Gl.ts')
		}
	},
	server: {
    host: true,  // Exposes on LAN (0.0.0.0), pairs with --host flag
	// https: true,  // Generates self-signed cert (accept warnings on mobile)
	// To enable HTTPS, provide cert and key files like below:
	// https: {
	//   key: readFileSync('./certs/key.pem'),
	//   cert: readFileSync('./certs/cert.pem')
	// },
    port: 5173,  // Default, or change if needed
  }
	
});
