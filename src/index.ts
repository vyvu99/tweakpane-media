import type {TpPluginBundle} from '@tweakpane/core';

import css from './media.css?inline';
import {createMediaPlugin} from './media-plugin';

export type {MediaParams, MediaValue} from './media-plugin';

export const ImageInput = createMediaPlugin('image');
export const VideoInput = createMediaPlugin('video');

/** `pane.registerPlugin(TweakpaneMedia)` registers both inputs. */
export const TweakpaneMedia: TpPluginBundle = {
	id: 'media',
	css,
	plugins: [ImageInput, VideoInput],
};
