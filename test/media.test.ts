import {Pane} from 'tweakpane';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {TweakpaneMedia} from '../src/index';

function setup(params: Record<string, unknown>, initial: unknown) {
	const container = document.createElement('div');
	document.body.append(container);
	const pane = new Pane({container});
	pane.registerPlugin(TweakpaneMedia);
	const target = {value: initial};
	const api = pane.addBinding(target, 'value', params);
	const onChange = vi.fn();
	api.on('change', onChange);

	const q = <T extends Element>(sel: string) => container.querySelector<T>(sel);
	return {
		container,
		pane,
		target,
		api,
		onChange,
		q,
		button: () => q<HTMLButtonElement>('.tp-medv_clear'),
		checkbox: () => q<HTMLInputElement>('input[type=checkbox]'),
		fileInput: () => q<HTMLInputElement>('input[type=file]'),
		pick(name = 'x.png') {
			const input = q<HTMLInputElement>('input[type=file]');
			Object.defineProperty(input, 'files', {
				value: [new File(['x'], name)],
				configurable: true,
			});
			input?.dispatchEvent(new Event('change'));
		},
		toggle(checked: boolean) {
			const box = q<HTMLInputElement>('input[type=checkbox]');
			if (!box) return;
			box.checked = checked;
			box.dispatchEvent(new Event('change'));
		},
	};
}

let urlCount = 0;

beforeEach(() => {
	urlCount = 0;
	URL.createObjectURL = vi.fn(() => `blob:${++urlCount}`);
	URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
	document.body.innerHTML = '';
});

describe('accepting values', () => {
	it('renders an image preview from a string', () => {
		const {q} = setup({view: 'image', label: 'Img'}, 'a.png');
		expect(q('img')?.getAttribute('src')).toBe('a.png');
		expect(q('video')).toBeNull();
	});

	it('renders a video preview from a string', () => {
		const {q} = setup({view: 'video'}, 'a.mp4');
		expect(q('video')?.getAttribute('src')).toBe('a.mp4');
		expect(q('img')).toBeNull();
	});

	it('accepts an object with src', () => {
		const {q} = setup({view: 'image', checkbox: true}, {src: 'a.png', checked: true});
		expect(q('img')?.getAttribute('src')).toBe('a.png');
	});

	it.each([42, true])('leaves %j to the other plugins', (value) => {
		const {q} = setup({view: 'image'}, value);
		expect(q('.tp-medv')).toBeNull();
		expect(q('.tp-lblv')).not.toBeNull();
	});

	it.each([null, undefined, {}, {url: 'a.png'}])('rejects %j as unsupported', (value) => {
		expect(() => setup({view: 'image'}, value)).toThrow(/No matching controller/);
	});

	it('does not take over a different view', () => {
		const {q} = setup({view: 'video'}, 42);
		expect(q('.tp-medv')).toBeNull();
	});

	it('registers both plugins from the bundle', () => {
		const {q} = setup({view: 'image'}, 'a.png');
		const second = setup({view: 'video'}, 'a.mp4');
		expect(q('.tp-medv')).not.toBeNull();
		expect(second.q('.tp-medv')).not.toBeNull();
	});
});

describe('bound value shape', () => {
	it('keeps a string without checkbox', () => {
		const {target, button} = setup({view: 'image'}, 'a.png');
		button()?.click();
		expect(target.value).toBe('');
	});

	it('writes {src, checked} with checkbox', () => {
		const {target, toggle} = setup({view: 'image', checkbox: true}, 'a.png');
		toggle(false);
		expect(target.value).toEqual({src: 'a.png', checked: false});
	});

	it('writes a string without checkbox even if bound to an object', () => {
		const {target, button} = setup({view: 'image'}, {src: 'a.png', checked: true});
		button()?.click();
		expect(target.value).toBe('');
	});

	it('treats a missing checked flag as checked', () => {
		const {checkbox, q} = setup({view: 'image', checkbox: true}, {src: 'a.png'});
		expect(checkbox()?.checked).toBe(true);
		expect(q('.tp-medv-off')).toBeNull();
	});

	it('treats a non-string src as empty', () => {
		const {q} = setup({view: 'image'}, {src: 5});
		expect(q('img')?.hasAttribute('src')).toBe(false);
		expect(q('.tp-medv-empty')).not.toBeNull();
	});

	it('emits no change when the value is set to the same thing', () => {
		const {target, pane, onChange} = setup({view: 'image'}, 'a.png');
		target.value = 'a.png';
		pane.refresh();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('follows changes made from outside via refresh', () => {
		const {target, pane, q} = setup({view: 'image'}, 'a.png');
		target.value = 'b.png';
		pane.refresh();
		expect(q('img')?.getAttribute('src')).toBe('b.png');
	});
});

describe('checkbox', () => {
	it('is not rendered by default', () => {
		expect(setup({view: 'image'}, 'a.png').checkbox()).toBeNull();
	});

	it('starts unchecked and dimmed for checked: false', () => {
		const {checkbox, q} = setup(
			{view: 'image', checkbox: true},
			{src: 'a.png', checked: false},
		);
		expect(checkbox()?.checked).toBe(false);
		expect(q('.tp-medv-off')).not.toBeNull();
	});

	it('toggles the dimmed state and keeps src', () => {
		const {q, toggle, target} = setup({view: 'image', checkbox: true}, 'a.png');
		toggle(false);
		expect(q('.tp-medv-off')).not.toBeNull();
		toggle(true);
		expect(q('.tp-medv-off')).toBeNull();
		expect(target.value).toEqual({src: 'a.png', checked: true});
	});

	it('syncs the box when the value changes from outside', () => {
		const {checkbox, target, pane} = setup({view: 'image', checkbox: true}, 'a.png');
		target.value = {src: 'a.png', checked: false};
		pane.refresh();
		expect(checkbox()?.checked).toBe(false);
	});
});

describe('picking files', () => {
	it('uses an object URL for the picked file', () => {
		const {target, pick} = setup({view: 'image'}, '');
		pick();
		expect(target.value).toBe('blob:1');
	});

	it('ignores a change event with no file', () => {
		const {target, fileInput, onChange} = setup({view: 'image'}, 'a.png');
		fileInput()?.dispatchEvent(new Event('change'));
		expect(target.value).toBe('a.png');
		expect(onChange).not.toHaveBeenCalled();
	});

	it('resets the input so the same file can be picked again', () => {
		const {fileInput, pick} = setup({view: 'image'}, '');
		const input = fileInput();
		const reset = vi.fn();
		if (input) Object.defineProperty(input, 'value', {set: reset, configurable: true});
		pick();
		expect(reset).toHaveBeenCalledWith('');
	});

	it('revokes the previous blob URL when a new file replaces it', () => {
		const {pick} = setup({view: 'image'}, '');
		pick();
		pick();
		expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
	});

	it('does not revoke URLs it did not create', () => {
		const {pick} = setup({view: 'image'}, 'a.png');
		pick();
		expect(URL.revokeObjectURL).not.toHaveBeenCalled();
	});

	it('revokes the current blob URL on dispose', () => {
		const {pick, api} = setup({view: 'image'}, '');
		pick();
		api.dispose();
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
	});

	it('defaults accept to the view kind and honours an override', () => {
		expect(setup({view: 'image'}, '').fileInput()?.accept).toBe('image/*');
		expect(setup({view: 'video'}, '').fileInput()?.accept).toBe('video/*');
		expect(setup({view: 'image', accept: '.png'}, '').fileInput()?.accept).toBe('.png');
	});
});

describe('clear and undo', () => {
	it('shows a clear button only while there is media', () => {
		const {button, q} = setup({view: 'image'}, 'a.png');
		expect(button()?.getAttribute('aria-label')).toBe('Clear');
		expect(q('.tp-medv-empty')).toBeNull();
	});

	it('hides the clear button when empty and nothing to undo', () => {
		const {q} = setup({view: 'image'}, '');
		expect(q('.tp-medv-empty:not(.tp-medv-undo)')).not.toBeNull();
	});

	it('turns the button into Undo after clearing', () => {
		const {button, q, onChange} = setup({view: 'image'}, 'a.png');
		button()?.click();
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(button()?.getAttribute('aria-label')).toBe('Undo');
		expect(button()?.getAttribute('aria-label')).toBe('Undo');
		expect(q('.tp-medv-undo')).not.toBeNull();
	});

	it('restores the cleared media on Undo', () => {
		const {button, target, q} = setup({view: 'image'}, 'a.png');
		button()?.click();
		button()?.click();
		expect(target.value).toBe('a.png');
		expect(q('img')?.getAttribute('src')).toBe('a.png');
		expect(button()?.getAttribute('aria-label')).toBe('Clear');
		expect(button()?.getAttribute('aria-label')).toBe('Clear');
		expect(q('.tp-medv-undo')).toBeNull();
	});

	it('can clear and undo repeatedly', () => {
		const {button, target} = setup({view: 'image'}, 'a.png');
		for (let i = 0; i < 3; i++) {
			button()?.click();
			expect(target.value).toBe('');
			button()?.click();
			expect(target.value).toBe('a.png');
		}
	});

	it('keeps the checked flag through clear and undo', () => {
		const {button, target} = setup(
			{view: 'image', checkbox: true},
			{src: 'a.png', checked: false},
		);
		button()?.click();
		expect(target.value).toEqual({src: '', checked: false});
		button()?.click();
		expect(target.value).toEqual({src: 'a.png', checked: false});
	});

	it('still offers Undo after toggling the checkbox while cleared', () => {
		const {button, toggle, target} = setup({view: 'image', checkbox: true}, 'a.png');
		button()?.click();
		toggle(false);
		expect(button()?.getAttribute('aria-label')).toBe('Undo');
		button()?.click();
		expect(target.value).toEqual({src: 'a.png', checked: false});
	});

	it('drops Undo once a new file is picked', () => {
		const {button, pick, target} = setup({view: 'image'}, 'a.png');
		button()?.click();
		pick();
		expect(target.value).toBe('blob:1');
		expect(button()?.getAttribute('aria-label')).toBe('Clear');
		button()?.click();
		button()?.click();
		expect(target.value).toBe('blob:1');
	});

	it('drops Undo when the value is set from outside', () => {
		const {button, target, pane, q} = setup({view: 'image'}, 'a.png');
		button()?.click();
		target.value = 'b.png';
		pane.refresh();
		expect(q('.tp-medv-undo')).toBeNull();
		button()?.click();
		button()?.click();
		expect(target.value).toBe('b.png');
	});

	it('keeps Undo when external code sets the value to empty', () => {
		const {button, target, pane} = setup({view: 'image'}, 'a.png');
		button()?.click();
		target.value = '';
		pane.refresh();
		expect(button()?.getAttribute('aria-label')).toBe('Undo');
	});

	it('does not clear anything when there is no media and nothing to undo', () => {
		const {button, onChange} = setup({view: 'image'}, '');
		button()?.click();
		expect(onChange).not.toHaveBeenCalled();
	});

	describe('with picked files', () => {
		it('does not revoke the blob URL on clear, so Undo still works', () => {
			const {pick, button, target} = setup({view: 'image'}, '');
			pick();
			button()?.click();
			expect(URL.revokeObjectURL).not.toHaveBeenCalled();
			button()?.click();
			expect(target.value).toBe('blob:1');
			expect(URL.revokeObjectURL).not.toHaveBeenCalled();
		});

		it('revokes the cleared blob URL once a new file replaces it', () => {
			const {pick, button} = setup({view: 'image'}, '');
			pick();
			button()?.click();
			pick();
			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
		});

		it('revokes the cleared blob URL when external code sets new media', () => {
			const {pick, button, target, pane} = setup({view: 'image'}, '');
			pick();
			button()?.click();
			target.value = 'b.png';
			pane.refresh();
			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
		});

		it('revokes a stashed blob URL on dispose', () => {
			const {pick, button, api} = setup({view: 'image'}, '');
			pick();
			button()?.click();
			api.dispose();
			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
		});

		it('revokes each blob URL exactly once', () => {
			const {pick, button, api} = setup({view: 'image'}, '');
			pick();
			pick();
			button()?.click();
			api.dispose();
			const urls = vi.mocked(URL.revokeObjectURL).mock.calls.map(([u]) => u);
			expect(urls.sort()).toEqual(['blob:1', 'blob:2']);
		});
	});
});

describe('button icons', () => {
	const pathOf = (el: Element | null | undefined) =>
		el?.querySelector('path')?.getAttribute('d');

	it('uses an svg icon with no text by default', () => {
		const btn = setup({view: 'image'}, 'a.png').button();
		expect(btn?.querySelector('svg')).not.toBeNull();
		expect(btn?.textContent).toBe('');
	});

	it('shows a tooltip and label for the icon', () => {
		const btn = setup({view: 'image'}, 'a.png').button();
		expect(btn?.title).toBe('Clear');
		expect(btn?.getAttribute('aria-label')).toBe('Clear');
	});

	it('swaps to a different icon and tooltip for Undo, and back', () => {
		const {button} = setup({view: 'image'}, 'a.png');
		const clearPath = pathOf(button());
		button()?.click();
		expect(button()?.title).toBe('Undo');
		expect(pathOf(button())).not.toBe(clearPath);
		expect(button()?.querySelector('svg')).not.toBeNull();
		button()?.click();
		expect(pathOf(button())).toBe(clearPath);
	});

	it('hides the icon from assistive tech since the button is labelled', () => {
		const svg = setup({view: 'image'}, 'a.png').button()?.querySelector('svg');
		expect(svg?.getAttribute('aria-hidden')).toBe('true');
	});

	it('replaces only the icon that has custom text', () => {
		const {button} = setup({view: 'image', undoText: 'Back'}, 'a.png');
		expect(button()?.querySelector('svg')).not.toBeNull();
		button()?.click();
		expect(button()?.textContent).toBe('Back');
		expect(button()?.querySelector('svg')).toBeNull();
		expect(button()?.title).toBe('Undo');
		button()?.click();
		expect(button()?.querySelector('svg')).not.toBeNull();
	});

	it('uses custom clear text with the default undo icon', () => {
		const {button} = setup({view: 'image', clearText: 'Remove'}, 'a.png');
		expect(button()?.textContent).toBe('Remove');
		button()?.click();
		expect(button()?.querySelector('svg')).not.toBeNull();
		expect(button()?.textContent).toBe('');
	});
});

describe('labels and options', () => {
	it('uses custom clearText and undoText', () => {
		const {button} = setup(
			{view: 'image', clearText: 'Remove', undoText: 'Restore'},
			'a.png',
		);
		expect(button()?.textContent).toBe('Remove');
		button()?.click();
		expect(button()?.textContent).toBe('Restore');
		button()?.click();
		expect(button()?.textContent).toBe('Remove');
	});

	it('hides the button entirely when clearText is empty', () => {
		expect(setup({view: 'image', clearText: ''}, 'a.png').button()).toBeNull();
	});

	it('shows the placeholder while empty', () => {
		const {q} = setup({view: 'image', placeholder: 'Pick'}, '');
		expect(q('.tp-medv_hint')?.textContent).toBe('Pick');
		expect(q('.tp-medv-empty')).not.toBeNull();
	});

	it('defaults the placeholder', () => {
		expect(setup({view: 'image'}, '').q('.tp-medv_hint')?.textContent).toBe(
			'Drop or click',
		);
	});

	it('gives the file input an accessible name', () => {
		expect(
			setup({view: 'image', label: 'Cover'}, '').fileInput()?.getAttribute('aria-label'),
		).toBe('Cover');
		expect(setup({view: 'video'}, '').fileInput()?.getAttribute('aria-label')).toBe(
			'Choose video',
		);
	});

	it('marks the image decorative', () => {
		expect(setup({view: 'image'}, 'a.png').q('img')?.getAttribute('alt')).toBe('');
	});

	it('sets width and height as CSS variables', () => {
		const {q} = setup({view: 'image', width: 80, height: 40}, 'a.png');
		const root = q<HTMLElement>('.tp-medv');
		expect(root?.style.getPropertyValue('--med-w')).toBe('80px');
		expect(root?.style.getPropertyValue('--med-h')).toBe('40px');
	});

	it('leaves the size variables to the stylesheet when not given', () => {
		const root = setup({view: 'image'}, 'a.png').q<HTMLElement>('.tp-medv');
		expect(root?.style.getPropertyValue('--med-w')).toBe('');
	});

	it('applies fit and ignores an invalid one', () => {
		expect(
			setup({view: 'image', fit: 'contain'}, 'a.png').q<HTMLElement>('img')?.style
				.objectFit,
		).toBe('contain');
		expect(
			setup({view: 'image', fit: 'bogus'}, 'a.png').q<HTMLElement>('img')?.style
				.objectFit,
		).toBeFalsy();
	});

	it('adds classNames to root, preview and clear button', () => {
		const {q} = setup(
			{view: 'image', classNames: {root: 'r', preview: 'p', clear: 'c'}},
			'a.png',
		);
		expect(q('.tp-medv')?.classList.contains('r')).toBe(true);
		expect(q('img')?.classList.contains('p')).toBe(true);
		expect(q('.tp-medv_clear')?.classList.contains('c')).toBe(true);
	});

	it('plays video muted, looping and autoplaying by default', () => {
		const video = setup({view: 'video'}, 'a.mp4').q<HTMLVideoElement>('video');
		expect([video?.muted, video?.loop, video?.autoplay, video?.playsInline]).toEqual([
			true,
			true,
			true,
			true,
		]);
	});

	it('lets video flags be turned off', () => {
		const video = setup(
			{view: 'video', muted: false, loop: false, autoplay: false},
			'a.mp4',
		).q<HTMLVideoElement>('video');
		expect([video?.muted, video?.loop, video?.autoplay]).toEqual([false, false, false]);
	});
});

describe('drag and disabled states', () => {
	it('highlights while a file is dragged over and clears on leave or drop', () => {
		const {q} = setup({view: 'image'}, '');
		const drop = q('.tp-medv_drop');
		drop?.dispatchEvent(new Event('dragenter'));
		expect(q('.tp-medv-drag')).not.toBeNull();
		drop?.dispatchEvent(new Event('dragleave'));
		expect(q('.tp-medv-drag')).toBeNull();
		drop?.dispatchEvent(new Event('dragenter'));
		drop?.dispatchEvent(new Event('drop'));
		expect(q('.tp-medv-drag')).toBeNull();
	});

	it('disables the file input and button when the binding is disabled', () => {
		const {api, fileInput, button} = setup({view: 'image'}, 'a.png');
		api.disabled = true;
		expect(fileInput()?.disabled).toBe(true);
		expect(button()?.disabled).toBe(true);
		api.disabled = false;
		expect(fileInput()?.disabled).toBe(false);
	});

	it('keeps instances independent', () => {
		const a = setup({view: 'image'}, 'a.png');
		const b = setup({view: 'image'}, 'b.png');
		a.button()?.click();
		expect(a.target.value).toBe('');
		expect(b.target.value).toBe('b.png');
	});
});

describe('more edge cases', () => {
	it('emits one change per clear and one per undo', () => {
		const {button, onChange} = setup({view: 'image'}, 'a.png');
		button()?.click();
		button()?.click();
		expect(onChange).toHaveBeenCalledTimes(2);
	});

	it('emits one change per checkbox toggle', () => {
		const {toggle, onChange} = setup({view: 'image', checkbox: true}, 'a.png');
		toggle(false);
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it('keeps the checked flag when a file is picked', () => {
		const {pick, toggle, target} = setup({view: 'image', checkbox: true}, 'a.png');
		toggle(false);
		pick();
		expect(target.value).toEqual({src: 'blob:1', checked: false});
	});

	it('uses only the first file when several are chosen', () => {
		const {fileInput, target} = setup({view: 'image'}, '');
		const input = fileInput();
		Object.defineProperty(input, 'files', {
			value: [new File(['1'], '1.png'), new File(['2'], '2.png')],
			configurable: true,
		});
		input?.dispatchEvent(new Event('change'));
		expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
		expect(target.value).toBe('blob:1');
	});

	it('sets a picked video on the video element', () => {
		const {pick, q} = setup({view: 'video'}, '');
		pick('x.mp4');
		expect(q('video')?.getAttribute('src')).toBe('blob:1');
	});

	it('starts empty and clean for an empty checkbox value', () => {
		const {q, button} = setup({view: 'image', checkbox: true}, {src: '', checked: true});
		expect(q('.tp-medv-empty:not(.tp-medv-undo)')).not.toBeNull();
		button()?.click();
		expect(q('.tp-medv-undo')).toBeNull();
	});

	it('does not revoke anything on dispose when no file was picked', () => {
		const {api} = setup({view: 'image'}, 'a.png');
		api.dispose();
		expect(URL.revokeObjectURL).not.toHaveBeenCalled();
	});

	it('revokes blob URLs when the whole pane is disposed', () => {
		const {pane, pick} = setup({view: 'image'}, '');
		pick();
		pane.dispose();
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
	});

	it('does not break when cleared from outside without a button', () => {
		const {target, pane, q} = setup({view: 'image', clearText: ''}, 'a.png');
		target.value = '';
		pane.refresh();
		expect(q('.tp-medv-empty')).not.toBeNull();
		expect(q('.tp-medv_clear')).toBeNull();
	});

	it('starts disabled when the binding is created disabled', () => {
		const {fileInput, button} = setup({view: 'image', disabled: true}, 'a.png');
		expect(fileInput()?.disabled).toBe(true);
		expect(button()?.disabled).toBe(true);
	});

	it('uses a non-submitting button so it is safe inside forms', () => {
		expect(setup({view: 'image'}, 'a.png').button()?.type).toBe('button');
	});

	it('uses no element ids, so several instances never clash', () => {
		const a = setup({view: 'image'}, 'a.png');
		const b = setup({view: 'image'}, 'b.png');
		expect(a.container.querySelector('.tp-medv [id]')).toBeNull();
		expect(b.container.querySelector('.tp-medv [id]')).toBeNull();
	});
});
