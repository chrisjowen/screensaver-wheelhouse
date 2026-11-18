/**
 * Calm music made in the browser with Web Audio: a slow pad of detuned
 * triangle and sine voices through a lowpass and a generated reverb, a chord
 * every 9 s, an occasional soft bell and a brown-noise sea swell. Nothing is
 * downloaded. Ported from the approved prototype.
 *
 * Browsers start audio only after the page has had a click or key press
 * (sticky activation), so `unlock` is called from those; before that the
 * music stays silent rather than nagging.
 */

/** Each scene's chords, as MIDI note numbers. */
const PROG = {
	dusk: [
		[50, 57, 62, 66, 69],
		[47, 54, 59, 62, 66],
		[43, 50, 55, 59, 64],
		[45, 52, 57, 61, 64]
	],
	night: [
		[45, 52, 55, 59, 64],
		[41, 48, 53, 57, 60],
		[43, 50, 53, 57, 62],
		[40, 47, 52, 55, 59]
	],
	fog: [
		[48, 55, 60, 62, 67],
		[45, 52, 57, 60, 64],
		[41, 48, 55, 57, 60],
		[43, 50, 55, 59, 62]
	]
};

/** @param {number} m */
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

/**
 * @param {any} win the page's window
 */
export function createMusic(win) {
	const Ctx = win?.AudioContext || win?.webkitAudioContext;
	/** @type {AudioContext | null} */
	let ac = null;
	/** @type {GainNode | null} */
	let master = null;
	/** @type {ReturnType<typeof setInterval>[]} */
	let timers = [];
	/** @type {AudioScheduledSourceNode[]} */
	let sea = [];
	let playing = false;
	/** @type {(() => void) | null} */
	let onState = null;

	/** May audio start without a fresh gesture? Unknown counts as yes. */
	const activated = () => win?.navigator?.userActivation?.hasBeenActive !== false;

	function ensure() {
		if (ac || !Ctx) return ac;
		ac = /** @type {AudioContext} */ (new Ctx());
		ac.onstatechange = () => onState?.();
		master = ac.createGain();
		master.gain.value = 0;
		const verb = ac.createConvolver();
		verb.buffer = impulse(ac, 4);
		const wet = ac.createGain();
		wet.gain.value = 0.6;
		const dry = ac.createGain();
		dry.gain.value = 0.55;
		const comp = ac.createDynamicsCompressor();
		master.connect(dry);
		master.connect(verb);
		verb.connect(wet);
		dry.connect(comp);
		wet.connect(comp);
		comp.connect(ac.destination);
		return ac;
	}

	/**
	 * @param {AudioContext} a
	 * @param {number} sec
	 */
	function impulse(a, sec) {
		const len = a.sampleRate * sec;
		const b = a.createBuffer(2, len, a.sampleRate);
		for (let ch = 0; ch < 2; ch++) {
			const d = b.getChannelData(ch);
			for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
		}
		return b;
	}

	/**
	 * @param {AudioContext} a
	 * @param {number} m
	 * @param {number} when
	 * @param {number} dur
	 * @param {number} v
	 */
	function voice(a, m, when, dur, v) {
		const f = a.createBiquadFilter();
		f.type = 'lowpass';
		f.frequency.value = 650 + Math.random() * 350;
		f.Q.value = 0.3;
		const g = a.createGain();
		g.gain.setValueAtTime(0, when);
		g.gain.linearRampToValueAtTime(v, when + dur * 0.35);
		g.gain.setValueAtTime(v, when + dur * 0.6);
		g.gain.linearRampToValueAtTime(0, when + dur);
		for (const [type, det] of /** @type {[OscillatorType, number][]} */ ([
			['triangle', -7],
			['sine', 6]
		])) {
			const o = a.createOscillator();
			o.type = type;
			o.frequency.value = mtof(m);
			o.detune.value = det;
			o.connect(f);
			o.start(when);
			o.stop(when + dur + 0.2);
		}
		f.connect(g);
		g.connect(/** @type {GainNode} */ (master));
	}

	/**
	 * @param {AudioContext} a
	 * @param {number} m
	 * @param {number} when
	 * @param {number} v
	 */
	function bell(a, m, when, v) {
		[1, 2.76, 5.4].forEach((ratio, i) => {
			const o = a.createOscillator();
			o.type = 'sine';
			o.frequency.value = mtof(m) * ratio;
			const g = a.createGain();
			const vv = v / (i * 2 + 1);
			g.gain.setValueAtTime(0, when);
			g.gain.linearRampToValueAtTime(vv, when + 0.02);
			g.gain.exponentialRampToValueAtTime(0.0001, when + 5 - i);
			o.connect(g);
			g.connect(/** @type {GainNode} */ (master));
			o.start(when);
			o.stop(when + 5.2);
		});
	}

	/**
	 * @param {AudioContext} a
	 * @param {number} i
	 * @param {string} scene
	 */
	function chord(a, i, scene) {
		const prog = PROG[/** @type {keyof typeof PROG} */ (scene)] ?? PROG.dusk;
		const notes = prog[i % 4];
		const now = a.currentTime + 0.05;
		notes.forEach((m, k) => voice(a, m, now + k * 0.15, 13, k === 0 ? 0.07 : 0.045));
		if (Math.random() < (scene === 'fog' ? 0.9 : 0.55))
			bell(a, notes[2 + Math.floor(Math.random() * 3)] + 12, now + 2 + Math.random() * 5, 0.03);
	}

	/**
	 * @param {AudioContext} a
	 * @param {string} scene
	 */
	function startSea(a, scene) {
		const len = a.sampleRate * 4;
		const b = a.createBuffer(1, len, a.sampleRate);
		const d = b.getChannelData(0);
		let last = 0;
		for (let i = 0; i < len; i++) {
			last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
			d[i] = last * 3.5;
		}
		const src = a.createBufferSource();
		src.buffer = b;
		src.loop = true;
		const f = a.createBiquadFilter();
		f.type = 'lowpass';
		f.frequency.value = 420;
		const g = a.createGain();
		g.gain.value = scene === 'fog' ? 0.1 : 0.06;
		const lfo = a.createOscillator();
		lfo.frequency.value = 0.075;
		const lg = a.createGain();
		lg.gain.value = 0.045;
		lfo.connect(lg);
		lg.connect(g.gain);
		src.connect(f);
		f.connect(g);
		g.connect(/** @type {GainNode} */ (master));
		src.start();
		lfo.start();
		sea = [src, lfo];
	}

	function halt() {
		timers.forEach(clearInterval);
		timers = [];
		for (const n of sea) {
			try {
				n.stop();
			} catch {
				// already stopped
			}
		}
		sea = [];
	}

	return {
		/**
		 * Fades the music in for a scene.
		 * @param {string} scene
		 * @param {number} vol 0 to 1
		 */
		start(scene, vol) {
			if (!activated()) return;
			const a = ensure();
			if (!a || !master) return;
			void a.resume?.().catch(() => {});
			halt();
			playing = true;
			const now = a.currentTime;
			master.gain.cancelScheduledValues(now);
			master.gain.setValueAtTime(master.gain.value, now);
			master.gain.linearRampToValueAtTime(vol, now + 4);
			let i = 0;
			chord(a, i++, scene);
			timers.push(setInterval(() => chord(a, i++, scene), 9000));
			startSea(a, scene);
		},
		/** Fades it out over 0.7 s. */
		stop() {
			if (!ac || !master || !playing) return;
			playing = false;
			const now = ac.currentTime;
			master.gain.cancelScheduledValues(now);
			master.gain.setValueAtTime(master.gain.value, now);
			master.gain.linearRampToValueAtTime(0, now + 0.7);
			timers.forEach(clearInterval);
			timers = [];
			const s = sea;
			sea = [];
			setTimeout(() => {
				for (const n of s) {
					try {
						n.stop();
					} catch {
						// already stopped
					}
				}
			}, 900);
		},
		/** From a click or key press: lets the audio start later without one. */
		unlock() {
			const a = ensure();
			if (a?.state === 'suspended') void a.resume().catch(() => {});
		},
		/** Is music actually sounding? */
		get audible() {
			return playing && ac?.state === 'running';
		},
		/** @param {(() => void) | null} fn called when the audio starts or stops running */
		set onState(fn) {
			onState = fn;
		},
		close() {
			halt();
			playing = false;
			void ac?.close?.().catch(() => {});
			ac = null;
			master = null;
		}
	};
}
