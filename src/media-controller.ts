import type {Controller, Value, ViewProps} from '@tweakpane/core';

import type {MediaKind, MediaParams, MediaValue} from './media-plugin';
import {MediaView} from './media-view';

interface Config {
	kind: MediaKind;
	params: MediaParams;
	value: Value<MediaValue>;
	viewProps: ViewProps;
}

export class MediaController implements Controller<MediaView> {
	public readonly value: Value<MediaValue>;
	public readonly view: MediaView;
	public readonly viewProps: ViewProps;
	// Blob URLs created here; each pins its file in memory until revoked.
	private readonly owned_ = new Set<string>();
	// `src` removed by Clear, kept so Undo can bring it back.
	private stash_: string | undefined;

	constructor(doc: Document, config: Config) {
		this.value = config.value;
		this.viewProps = config.viewProps;
		this.view = new MediaView(doc, config);

		this.view.fileInput.addEventListener('change', () => {
			const file = this.view.fileInput.files?.[0];
			if (file) {
				const url = URL.createObjectURL(file);
				this.owned_.add(url);
				this.setSrc_(url);
			}
			// Reset so picking the same file again still fires `change`.
			this.view.fileInput.value = '';
		});
		this.view.checkbox?.addEventListener('change', () => {
			this.value.rawValue = {
				...this.value.rawValue,
				checked: !!this.view.checkbox?.checked,
			};
		});
		this.view.clearButton?.addEventListener('click', () => this.clearOrUndo_());

		this.value.emitter.on('change', () => this.sync_());
		this.viewProps.handleDispose(() => {
			for (const url of this.owned_) URL.revokeObjectURL(url);
			this.owned_.clear();
		});
	}

	private setSrc_(src: string) {
		this.value.rawValue = {...this.value.rawValue, src};
	}

	// One button: Clear while there is media, Undo right after clearing.
	private clearOrUndo_() {
		const {src} = this.value.rawValue;
		if (src) {
			this.stash_ = src;
			this.setSrc_('');
		} else if (this.stash_) {
			const restored = this.stash_;
			this.stash_ = undefined;
			this.setSrc_(restored);
		}
	}

	// Runs on every value change, including ones made from outside the plugin.
	private sync_() {
		const {src} = this.value.rawValue;
		if (src) this.stash_ = undefined;
		for (const url of this.owned_) {
			if (url !== src && url !== this.stash_) {
				URL.revokeObjectURL(url);
				this.owned_.delete(url);
			}
		}
		this.view.setUndoable(!src && this.stash_ !== undefined);
	}
}
