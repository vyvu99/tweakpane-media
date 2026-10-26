import {describe, expect, it} from 'vitest';

import {ImageInput, TweakpaneMedia, VideoInput} from '../src/index';

describe('package exports', () => {
	it('names the plugins by view', () => {
		expect(ImageInput.id).toBe('media-image');
		expect(VideoInput.id).toBe('media-video');
		expect(ImageInput.type).toBe('input');
	});

	it('stamps plugins with the core version', () => {
		expect(ImageInput.core).toBeDefined();
		expect(VideoInput.core).toBeDefined();
	});

	it('bundles both plugins with the stylesheet', () => {
		expect(TweakpaneMedia.id).toBe('media');
		expect('plugins' in TweakpaneMedia && TweakpaneMedia.plugins).toEqual([
			ImageInput,
			VideoInput,
		]);
		expect(TweakpaneMedia.css).toContain('.tp-medv');
	});
});
