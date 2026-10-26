import {
	type BaseInputParams,
	createPlugin,
	type InputBindingPlugin,
	parseRecord,
} from '@tweakpane/core';

import {MediaController} from './media-controller';

export type MediaKind = 'image' | 'video';

export interface MediaValue {
	src: string;
	checked: boolean;
}

export interface MediaParams extends BaseInputParams {
	view: MediaKind;
	/** Preview size in px. */
	width?: number;
	height?: number;
	fit?: 'cover' | 'contain' | 'fill';
	/** Show an on/off checkbox. The bound value becomes `{src, checked}`. */
	checkbox?: boolean;
	/** Text of the clear button; empty string hides it. Default is an icon. */
	clearText?: string;
	/** Text of the button that restores the media after Clear. Default is an icon. */
	undoText?: string;
	/** Hint shown while empty. Default `Drop or click`. */
	placeholder?: string;
	/** Class names to hook Tailwind or custom CSS onto each part. */
	classNames?: {root?: string; preview?: string; clear?: string};
	/** `accept` of the file input. Default `image/*` or `video/*`. */
	accept?: string;
	/** Video only. All default to `true`. */
	autoplay?: boolean;
	loop?: boolean;
	muted?: boolean;
}

export type MediaExternal = string | MediaValue;

const fits = ['cover', 'contain', 'fill'] as const;

function isMediaValue(v: unknown): v is MediaValue {
	return typeof v === 'object' && v !== null && 'src' in v;
}

function toValue(ex: unknown): MediaValue {
	if (typeof ex === 'string') return {src: ex, checked: true};
	if (isMediaValue(ex)) {
		return {
			src: typeof ex.src === 'string' ? ex.src : '',
			checked: typeof ex.checked === 'boolean' ? ex.checked : true,
		};
	}
	return {src: '', checked: true};
}

export function createMediaPlugin(
	kind: MediaKind,
): InputBindingPlugin<MediaValue, MediaExternal, MediaParams> {
	return createPlugin({
		id: `media-${kind}`,
		type: 'input',

		accept(exValue, params) {
			if (typeof exValue !== 'string' && !isMediaValue(exValue)) return null;

			const parsed = parseRecord<MediaParams>(params, (p) => ({
				view: p.required.constant(kind),
				label: p.optional.string,
				width: p.optional.number,
				height: p.optional.number,
				fit: p.optional.custom((v) => fits.find((f) => f === v)),
				checkbox: p.optional.boolean,
				clearText: p.optional.string,
				undoText: p.optional.string,
				placeholder: p.optional.string,
				classNames: p.optional.object({
					root: p.optional.string,
					preview: p.optional.string,
					clear: p.optional.string,
				}),
				accept: p.optional.string,
				autoplay: p.optional.boolean,
				loop: p.optional.boolean,
				muted: p.optional.boolean,
			}));
			if (!parsed) return null;

			return {initialValue: exValue, params: parsed};
		},

		binding: {
			reader: () => toValue,
			equals: (a, b) => a.src === b.src && a.checked === b.checked,
			writer: (args) => (target, value) =>
				target.write(args.params.checkbox ? value : value.src),
		},

		controller: (args) =>
			new MediaController(args.document, {
				kind,
				params: args.params,
				value: args.value,
				viewProps: args.viewProps,
			}),
	});
}
