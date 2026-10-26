import {ClassName, type Value, type View, type ViewProps} from '@tweakpane/core';

import type {MediaKind, MediaParams, MediaValue} from './media-plugin';

const cn = ClassName('med');

const ICON_CLEAR =
	'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
const ICON_UNDO =
	'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3L3 6l3 3M3 6h6a4 4 0 010 8H6"/></svg>';

interface Config {
	kind: MediaKind;
	params: MediaParams;
	value: Value<MediaValue>;
	viewProps: ViewProps;
}

export class MediaView implements View {
	public readonly element: HTMLElement;
	public readonly fileInput: HTMLInputElement;
	public readonly checkbox: HTMLInputElement | undefined;
	public readonly clearButton: HTMLButtonElement | undefined;
	private readonly preview_: HTMLImageElement | HTMLVideoElement;
	private readonly value_: Value<MediaValue>;
	private readonly clearText_: string | undefined;
	private readonly undoText_: string | undefined;

	constructor(doc: Document, config: Config) {
		const {kind, params, value, viewProps} = config;
		this.value_ = value;
		this.clearText_ = params.clearText;
		this.undoText_ = params.undoText;

		this.element = doc.createElement('div');
		this.element.className = `${cn()} ${params.classNames?.root ?? ''}`.trim();
		if (params.width) this.element.style.setProperty('--med-w', `${params.width}px`);
		if (params.height) this.element.style.setProperty('--med-h', `${params.height}px`);
		viewProps.bindClassModifiers(this.element);

		if (params.checkbox) {
			const label = doc.createElement('label');
			label.className = cn('check');
			this.checkbox = doc.createElement('input');
			this.checkbox.type = 'checkbox';
			label.append(this.checkbox, doc.createElement('span'));
			this.element.append(label);
		}

		const frame = doc.createElement('div');
		frame.className = cn('frame');
		const drop = doc.createElement('label');
		drop.className = cn('drop');
		this.fileInput = doc.createElement('input');
		this.fileInput.type = 'file';
		this.fileInput.accept = params.accept ?? `${kind}/*`;
		this.fileInput.setAttribute('aria-label', params.label ?? `Choose ${kind}`);
		viewProps.bindDisabled(this.fileInput);

		if (kind === 'video') {
			const video = doc.createElement('video');
			video.autoplay = params.autoplay ?? true;
			video.loop = params.loop ?? true;
			video.muted = params.muted ?? true;
			video.playsInline = true;
			this.preview_ = video;
		} else {
			const img = doc.createElement('img');
			img.alt = '';
			this.preview_ = img;
		}
		this.preview_.className =
			`${cn('preview')} ${params.classNames?.preview ?? ''}`.trim();
		if (params.fit) this.preview_.style.objectFit = params.fit;
		const hint = doc.createElement('span');
		hint.className = cn('hint');
		hint.textContent = params.placeholder ?? 'Drop or click';
		drop.append(this.fileInput, this.preview_, hint);
		frame.append(drop);
		this.element.append(frame);

		// The file input handles the drop itself; these only drive the highlight.
		const setDrag = (on: boolean) =>
			this.element.classList.toggle(cn(undefined, 'drag'), on);
		drop.addEventListener('dragenter', () => setDrag(true));
		drop.addEventListener('dragleave', () => setDrag(false));
		drop.addEventListener('drop', () => setDrag(false));

		if (params.clearText !== '') {
			this.clearButton = doc.createElement('button');
			this.clearButton.type = 'button';
			this.clearButton.className =
				`${cn('clear')} ${params.classNames?.clear ?? ''}`.trim();
			this.paintButton_(false);
			viewProps.bindDisabled(this.clearButton);
			frame.append(this.clearButton);
		}

		value.emitter.on('change', () => this.refresh_());
		this.refresh_();
	}

	/** Turns the clear button into an Undo button while the last clear can be reverted. */
	public setUndoable(on: boolean) {
		this.element.classList.toggle(cn(undefined, 'undo'), on);
		if (!this.clearButton) return;
		this.paintButton_(on);
	}

	// Icon by default; custom text from the params replaces it.
	private paintButton_(undo: boolean) {
		if (!this.clearButton) return;
		const text = undo ? this.undoText_ : this.clearText_;
		const name = undo ? 'Undo' : 'Clear';
		if (text === undefined) this.clearButton.innerHTML = undo ? ICON_UNDO : ICON_CLEAR;
		else this.clearButton.textContent = text;
		this.clearButton.setAttribute('aria-label', name);
		this.clearButton.title = name;
	}

	private refresh_() {
		const {src, checked} = this.value_.rawValue;
		if (this.preview_.getAttribute('src') !== src) {
			if (src) this.preview_.setAttribute('src', src);
			else this.preview_.removeAttribute('src');
		}
		if (this.checkbox) this.checkbox.checked = checked;
		this.element.classList.toggle(cn(undefined, 'off'), !checked);
		this.element.classList.toggle(cn(undefined, 'empty'), !src);
	}
}
