import {defineConfig} from 'vitest/config';

export default defineConfig({
	build: {
		lib: {
			entry: 'src/index.ts',
			fileName: 'tweakpane-media',
			formats: ['es'],
		},
		minify: true,
		rollupOptions: {external: [/^@tweakpane\/core/]},
		sourcemap: true,
	},
	test: {
		environment: 'jsdom',
		// Without this `?inline` css imports come back empty in tests.
		css: true,
		include: ['test/**/*.test.ts'],
	},
});
