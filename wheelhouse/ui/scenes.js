/**
 * The screensaver's pictures: a sky, a sea and a boat, drawn on a canvas.
 * The tints are partly transparent, so the blurred Wheelhouse page shows
 * through. Ported from the approved prototype; nothing is loaded.
 */

/** @typedef {{ hull: string, trim: string, sail: string, shade: string, mast: string, flag: string, line?: string }} Paint */
/**
 * @typedef {{
 *   sky: [number, string][], sea: [number, string][],
 *   body?: { kind: 'sun' | 'moon', x: number, y?: number, r: number, c: string },
 *   stars?: boolean, lighthouse?: boolean, fog?: boolean, brand?: boolean,
 *   wave: string, glint: string | null, boat: Paint
 * }} Scene
 */
/** @typedef {{ stern: number, bow: number, draw: (c: CanvasRenderingContext2D, s: Paint, flagT: number) => void }} Boat */

/** Seconds the boat takes to cross the screen once. */
export const CROSSING_S = 46;

/** A small seeded random, so the stars and fog sit in the same places each time. */
function rng(/** @type {number} */ seed) {
	return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}
const STARS = (() => {
	const r = rng(7);
	return Array.from({ length: 170 }, () => ({
		x: r(),
		y: Math.pow(r(), 1.5),
		s: 0.4 + r() * 1.3,
		p: r() * 6.28,
		v: 0.6 + r() * 1.6
	}));
})();
const GLINTS = (() => {
	const r = rng(42);
	return Array.from({ length: 90 }, () => ({
		d: r(),
		o: r() * 2 - 1,
		w: 4 + r() * 16,
		p: r() * 6.28
	}));
})();
const FOGS = (() => {
	const r = rng(99);
	return Array.from({ length: 9 }, (_, i) => ({
		x: r(),
		y: 0.38 + r() * 0.42,
		w: 0.35 + r() * 0.4,
		h: 0.06 + r() * 0.08,
		v: 0.004 + r() * 0.008,
		a: 0.07 + r() * 0.09,
		front: i % 3 === 0
	}));
})();

/** @type {Record<string, Scene>} */
export const SCENES = {
	dusk: {
		sky: [
			[0, 'rgba(16,20,38,0.38)'],
			[0.45, 'rgba(70,46,78,0.55)'],
			[0.82, 'rgba(198,116,90,0.74)'],
			[1, 'rgba(244,178,112,0.84)']
		],
		sea: [
			[0, 'rgba(62,50,78,0.9)'],
			[0.25, 'rgba(30,32,56,0.86)'],
			[1, 'rgba(10,14,26,0.72)']
		],
		body: { kind: 'sun', x: 0.7, r: 0.065, c: '255,196,128' },
		wave: '255,206,160',
		glint: '255,214,160',
		boat: {
			hull: '#1c1f2e',
			trim: '#e8b04a',
			sail: '#f4e4cf',
			shade: '#d7ae96',
			mast: '#2a2a35',
			flag: '#e8b04a'
		}
	},
	night: {
		sky: [
			[0, 'rgba(4,8,20,0.6)'],
			[0.6, 'rgba(12,22,46,0.68)'],
			[1, 'rgba(28,46,82,0.8)']
		],
		sea: [
			[0, 'rgba(20,34,62,0.9)'],
			[1, 'rgba(4,8,18,0.82)']
		],
		body: { kind: 'moon', x: 0.27, y: 0.2, r: 0.04, c: '226,234,255' },
		stars: true,
		wave: '170,196,240',
		glint: '220,230,255',
		boat: {
			hull: '#0d1422',
			trim: '#7d93c4',
			sail: '#c9d4ea',
			shade: '#93a3c4',
			mast: '#1b2333',
			flag: '#e8b04a'
		}
	},
	fog: {
		sky: [
			[0, 'rgba(58,68,78,0.45)'],
			[0.7, 'rgba(120,132,142,0.7)'],
			[1, 'rgba(158,168,176,0.78)']
		],
		sea: [
			[0, 'rgba(98,110,120,0.86)'],
			[1, 'rgba(40,48,56,0.78)']
		],
		lighthouse: true,
		fog: true,
		wave: '220,228,234',
		glint: null,
		boat: {
			hull: '#2a333c',
			trim: '#c94f3d',
			sail: '#e6e9ea',
			shade: '#b9c0c4',
			mast: '#3a434c',
			flag: '#c94f3d'
		}
	},
	wheelhouse: {
		sky: [
			[0, 'rgba(11,17,24,0.86)'],
			[1, 'rgba(13,20,28,0.9)']
		],
		sea: [
			[0, 'rgba(8,13,19,0.92)'],
			[1, 'rgba(8,13,19,0.86)']
		],
		brand: true,
		wave: '232,176,74',
		glint: null,
		boat: {
			hull: '#0b1118',
			trim: '#e8b04a',
			sail: '#0f1822',
			shade: '#0f1822',
			mast: '#e8b04a',
			flag: '#e8b04a',
			line: '#e8b04a'
		}
	}
};

/** @type {Record<string, Boat>} */
export const BOATS = {
	sloop: {
		stern: -44,
		bow: 52,
		draw(c, s, t) {
			hull(
				c,
				s,
				[
					[-44, -9],
					[52, -9]
				],
				[44, 1, 30, 4],
				[-34, 4],
				[-42, 2, -44, -9]
			);
			mast(c, s, 2, -9, -112);
			sail(
				c,
				s,
				[
					[0, -108],
					[0, -14],
					[-40, -14]
				],
				[-14, -56],
				false
			);
			sail(
				c,
				s,
				[
					[5, -102],
					[48, -11],
					[9, -14]
				],
				[15, -60],
				true
			);
			flag(c, s, 2, -112, t);
		}
	},
	schooner: {
		stern: -62,
		bow: 84,
		draw(c, s, t) {
			hull(
				c,
				s,
				[
					[-62, -9],
					[66, -9]
				],
				[58, 2, 40, 5],
				[-50, 5],
				[-60, 2, -62, -9]
			);
			c.strokeStyle = s.mast;
			c.lineWidth = 1.6;
			c.beginPath();
			c.moveTo(60, -9);
			c.lineTo(84, -15);
			c.stroke();
			mast(c, s, 16, -9, -98);
			mast(c, s, -20, -9, -118);
			sail(
				c,
				s,
				[
					[14, -88],
					[-14, -96],
					[-14, -14],
					[14, -14]
				],
				null,
				false
			);
			sail(
				c,
				s,
				[
					[-22, -108],
					[-56, -118],
					[-58, -14],
					[-22, -14]
				],
				null,
				false
			);
			sail(
				c,
				s,
				[
					[19, -94],
					[82, -16],
					[24, -14]
				],
				[34, -54],
				true
			);
			flag(c, s, -20, -118, t);
		}
	},
	paper: {
		stern: -40,
		bow: 40,
		draw(c, s) {
			c.lineJoin = 'round';
			poly(c, [
				[-42, -16],
				[42, -16],
				[28, 4],
				[-28, 4]
			]);
			fill(c, s.line ? s.hull : '#f2efe8', s);
			poly(c, [
				[-24, -16],
				[0, -62],
				[0, -16]
			]);
			fill(c, s.line ? s.hull : '#ffffff', s);
			poly(c, [
				[0, -62],
				[24, -16],
				[0, -16]
			]);
			fill(c, s.line ? s.hull : '#d9d4c8', s);
			c.strokeStyle = s.line ? s.line : 'rgba(0,0,0,0.18)';
			c.lineWidth = 1;
			c.beginPath();
			c.moveTo(-42, -16);
			c.lineTo(-30, -8);
			c.lineTo(30, -8);
			c.lineTo(42, -16);
			c.stroke();
		}
	}
};

/**
 * @param {CanvasRenderingContext2D} c
 * @param {number[][]} pts
 */
function poly(c, pts) {
	c.beginPath();
	pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
	c.closePath();
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {string} col
 * @param {Paint} s
 */
function fill(c, col, s) {
	c.fillStyle = col;
	c.fill();
	if (s.line) {
		c.strokeStyle = s.line;
		c.lineWidth = 1.4;
		c.stroke();
	}
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {Paint} s
 * @param {[number, number][]} top
 * @param {[number, number, number, number]} q1
 * @param {[number, number]} p
 * @param {[number, number, number, number]} q2
 */
function hull(c, s, top, q1, p, q2) {
	c.beginPath();
	c.moveTo(...top[0]);
	c.lineTo(...top[1]);
	c.quadraticCurveTo(...q1);
	c.lineTo(...p);
	c.quadraticCurveTo(...q2);
	c.closePath();
	fill(c, s.hull, s);
	c.strokeStyle = s.trim;
	c.globalAlpha *= 0.85;
	c.lineWidth = 1.6;
	c.beginPath();
	c.moveTo(top[0][0] + 2, -5);
	c.lineTo(top[1][0] - 4, -5);
	c.stroke();
	c.globalAlpha /= 0.85;
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {Paint} s
 * @param {number} x
 * @param {number} y0
 * @param {number} y1
 */
function mast(c, s, x, y0, y1) {
	c.strokeStyle = s.mast;
	c.lineWidth = 2;
	c.beginPath();
	c.moveTo(x, y0);
	c.lineTo(x, y1);
	c.stroke();
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {Paint} s
 * @param {[number, number][]} pts
 * @param {[number, number] | null} ctrl
 * @param {boolean} front
 */
function sail(c, s, pts, ctrl, front) {
	c.beginPath();
	c.moveTo(...pts[0]);
	for (let i = 1; i < pts.length; i++) c.lineTo(...pts[i]);
	if (ctrl) c.quadraticCurveTo(ctrl[0], ctrl[1], pts[0][0], pts[0][1]);
	else c.closePath();
	if (s.line) {
		c.fillStyle = s.sail;
		c.fill();
		c.strokeStyle = s.line;
		c.lineWidth = 1.4;
		c.stroke();
		return;
	}
	const xs = pts.map((p) => p[0]);
	const g = c.createLinearGradient(Math.min(...xs), 0, Math.max(...xs), 0);
	g.addColorStop(0, front ? s.sail : s.shade);
	g.addColorStop(1, front ? s.shade : s.sail);
	c.fillStyle = g;
	c.fill();
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {Paint} s
 * @param {number} x
 * @param {number} y
 * @param {number} t
 */
function flag(c, s, x, y, t) {
	const w = Math.sin(t * 3) * 2;
	c.fillStyle = s.flag;
	c.beginPath();
	c.moveTo(x, y);
	c.quadraticCurveTo(x + 8, y + 1 + w, x + 16, y + 3 + w);
	c.quadraticCurveTo(x + 8, y + 5, x, y + 6);
	c.closePath();
	c.fill();
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {number} y0
 * @param {number} y1
 * @param {[number, string][]} stops
 */
function grad(c, y0, y1, stops) {
	const g = c.createLinearGradient(0, y0, 0, y1);
	stops.forEach(([o, col]) => g.addColorStop(o, col));
	return g;
}

/**
 * Draws one frame.
 * @param {CanvasRenderingContext2D} c
 * @param {number} w width in CSS pixels
 * @param {number} h height in CSS pixels
 * @param {number} t seconds since the screensaver opened
 * @param {string} sceneId
 * @param {string} boatId
 * @param {number} pos the boat's way across the screen, 0 to 1
 * @param {{ still?: boolean }} [opts] still: one frame with nothing moving, the boat near the middle
 */
export function drawScene(c, w, h, t, sceneId, boatId, pos, opts = {}) {
	const S = SCENES[sceneId] ?? SCENES.dusk;
	const B = BOATS[boatId] ?? BOATS.sloop;
	const still = Boolean(opts.still);
	const hz = Math.round(h * 0.6);
	c.clearRect(0, 0, w, h);
	c.fillStyle = grad(c, 0, hz, S.sky);
	c.fillRect(0, 0, w, hz);

	if (S.brand) {
		c.strokeStyle = 'rgba(255,255,255,0.03)';
		c.lineWidth = 1;
		const g = Math.max(12, h / 28);
		c.beginPath();
		for (let x = 0; x < w; x += g) {
			c.moveTo(x + 0.5, 0);
			c.lineTo(x + 0.5, h);
		}
		for (let y = 0; y < h; y += g) {
			c.moveTo(0, y + 0.5);
			c.lineTo(w, y + 0.5);
		}
		c.stroke();
		drawWheel(c, w / 2, h * 0.33, Math.min(w, h) * 0.26, still ? 0.3 : t * 0.025);
	}
	if (S.stars)
		STARS.forEach((st) => {
			if (st.y * hz > hz - 6) return;
			const a = 0.35 + 0.55 * (still ? 0.7 : 0.5 + 0.5 * Math.sin(t * st.v + st.p));
			c.fillStyle = `rgba(235,240,255,${a * (1 - st.y * 0.6)})`;
			c.beginPath();
			c.arc(st.x * w, st.y * hz * 0.98, st.s, 0, 6.283);
			c.fill();
		});
	let bodyX = null;
	if (S.body) {
		const b = S.body;
		const r = b.r * h;
		bodyX = b.x * w;
		const by = b.y ? b.y * h : hz - r * 0.15;
		const gl = c.createRadialGradient(
			bodyX,
			by,
			r * 0.2,
			bodyX,
			by,
			r * (b.kind === 'sun' ? 7 : 5)
		);
		gl.addColorStop(0, `rgba(${b.c},0.55)`);
		gl.addColorStop(0.3, `rgba(${b.c},0.16)`);
		gl.addColorStop(1, `rgba(${b.c},0)`);
		c.fillStyle = gl;
		c.fillRect(0, 0, w, hz);
		c.save();
		c.beginPath();
		c.rect(0, 0, w, hz);
		c.clip();
		c.fillStyle = `rgba(${b.c},0.96)`;
		c.beginPath();
		c.arc(bodyX, by, r, 0, 6.283);
		c.fill();
		c.restore();
		if (b.kind === 'moon') {
			c.fillStyle = 'rgba(160,172,200,0.25)';
			for (const [dx, dy, rr] of [
				[-0.3, -0.2, 0.22],
				[0.25, 0.2, 0.16],
				[0.1, -0.35, 0.1]
			]) {
				c.beginPath();
				c.arc(bodyX + dx * r, by + dy * r, rr * r, 0, 6.283);
				c.fill();
			}
		}
	}
	if (S.lighthouse) drawLighthouse(c, w, h, hz, t, still);
	if (S.fog) drawFog(c, w, h, t, false, still);

	// The sea
	c.fillStyle = grad(c, hz, h, S.sea);
	c.fillRect(0, hz, w, h - hz);
	if (S.brand) {
		const hg = c.createLinearGradient(0, 0, w, 0);
		hg.addColorStop(0, 'rgba(232,176,74,0)');
		hg.addColorStop(0.2, 'rgba(232,176,74,0.55)');
		hg.addColorStop(0.8, 'rgba(232,176,74,0.55)');
		hg.addColorStop(1, 'rgba(232,176,74,0)');
		c.strokeStyle = hg;
		c.lineWidth = 1;
		c.beginPath();
		c.moveTo(0, hz + 0.5);
		c.lineTo(w, hz + 0.5);
		c.stroke();
	}
	// A glitter path under the sun or moon
	const glint = S.glint;
	if (glint && bodyX !== null) {
		const x0 = bodyX;
		GLINTS.forEach((g) => {
			const y = hz + 3 + Math.pow(g.d, 1.6) * (h - hz) * 0.9;
			const spread = 6 + (y - hz) * 0.55;
			const a = (still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.7 + g.p)) * (0.5 - g.d * 0.35);
			c.strokeStyle = `rgba(${glint},${a})`;
			c.lineWidth = 1 + g.d * 1.5;
			const x = x0 + g.o * spread;
			c.beginPath();
			c.moveTo(x - g.w * (0.4 + g.d), y);
			c.lineTo(x + g.w * (0.4 + g.d), y);
			c.stroke();
		});
	}

	// Where the boat is
	const sc = Math.max(0.7, Math.min(1.35, h / 760));
	const travel = w + (B.bow - B.stern) * sc * 2 + 80;
	const bx = still ? w * 0.42 : -B.bow * sc - 40 + pos * travel;
	const bob = still ? 0 : Math.sin(t * 1.25) * 2.6 * sc;
	const tilt = still ? 0 : Math.sin(t * 1.25 + 0.7) * 0.035;
	const by = hz + 12 * sc + bob;
	const flagT = still ? 0.4 : t;

	// Its reflection
	c.save();
	c.translate(bx, by + 6 * sc);
	c.scale(sc, -0.55 * sc);
	c.rotate(-tilt);
	c.globalAlpha = S.brand ? 0.12 : 0.16;
	B.draw(c, S.boat, flagT);
	c.restore();

	// Waves
	const rows = 16;
	for (let k = 0; k < rows; k++) {
		const d = k / rows;
		const y = hz + 5 + Math.pow(d, 1.7) * (h - hz) * 0.95;
		const amp = 0.6 + d * 3.4;
		const wl = 50 + d * 240;
		const sp = 5 + d * 20;
		c.strokeStyle = `rgba(${S.wave},${(S.brand ? 0.08 : 0.05) + d * (S.brand ? 0.1 : 0.07)})`;
		c.lineWidth = S.brand ? 1 : 1 + d;
		c.beginPath();
		for (let x = 0; x <= w; x += 8) {
			const yy = y + Math.sin(((x + (still ? 0 : t * sp)) / wl) * 6.283 + k * 1.7) * amp;
			if (x) c.lineTo(x, yy);
			else c.moveTo(x, yy);
		}
		if (S.brand) {
			c.setLineDash([2 + d * 30, 6 + d * 40]);
			c.lineDashOffset = still ? 0 : -t * sp;
		}
		c.stroke();
		c.setLineDash([]);
	}

	// The wake behind the stern, and a little bow wave
	const sx = bx + B.stern * sc;
	const wy = by + 2 * sc;
	const L = 300 * sc;
	const wg = c.createLinearGradient(sx, 0, sx - L, 0);
	const wc = S.brand ? '232,176,74' : '255,255,255';
	wg.addColorStop(0, `rgba(${wc},${S.brand ? 0.28 : 0.32})`);
	wg.addColorStop(1, `rgba(${wc},0)`);
	c.fillStyle = wg;
	c.beginPath();
	c.moveTo(sx + 6 * sc, wy - 1);
	c.lineTo(sx - L, wy - 9 * sc);
	c.lineTo(sx - L, wy + 15 * sc);
	c.lineTo(sx + 6 * sc, wy + 3);
	c.closePath();
	c.globalAlpha = 0.5;
	c.fill();
	c.globalAlpha = 1;
	c.strokeStyle = wg;
	c.lineWidth = 1.2;
	for (const [dir, spread] of [
		[-1, 9],
		[1, 15]
	]) {
		c.beginPath();
		for (let i = 0; i <= 40; i++) {
			const f = i / 40;
			const x = sx - f * L;
			const y = wy + dir * f * spread * sc + Math.sin(f * 18 - (still ? 0 : t * 3)) * 1.2 * f;
			if (i) c.lineTo(x, y);
			else c.moveTo(x, y);
		}
		c.stroke();
	}
	if (!S.brand) {
		c.fillStyle = 'rgba(255,255,255,0.35)';
		c.beginPath();
		c.ellipse(bx + B.bow * sc * 0.85, wy, 9 * sc, 2 * sc, 0, 0, 6.283);
		c.fill();
	}

	// The boat
	c.save();
	c.translate(bx, by);
	c.scale(sc, sc);
	c.rotate(tilt);
	B.draw(c, S.boat, flagT);
	c.restore();

	if (S.fog) drawFog(c, w, h, t, true, still);
	// A vignette
	const vg = c.createRadialGradient(
		w / 2,
		h * 0.55,
		Math.min(w, h) * 0.3,
		w / 2,
		h * 0.55,
		Math.max(w, h) * 0.75
	);
	vg.addColorStop(0, 'rgba(0,0,0,0)');
	vg.addColorStop(1, 'rgba(0,0,0,0.38)');
	c.fillStyle = vg;
	c.fillRect(0, 0, w, h);
}

/**
 * The branded scene's slowly turning ship's wheel.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {number} a
 */
function drawWheel(c, x, y, r, a) {
	c.save();
	c.translate(x, y);
	c.rotate(a);
	c.strokeStyle = 'rgba(232,176,74,0.09)';
	c.lineWidth = Math.max(1, r * 0.018);
	for (const rr of [0.78, 0.7, 0.14]) {
		c.beginPath();
		c.arc(0, 0, r * rr, 0, 6.283);
		c.stroke();
	}
	for (let i = 0; i < 8; i++) {
		const an = (i / 8) * 6.283;
		c.beginPath();
		c.moveTo(Math.cos(an) * r * 0.14, Math.sin(an) * r * 0.14);
		c.lineTo(Math.cos(an) * r * 0.98, Math.sin(an) * r * 0.98);
		c.stroke();
		c.beginPath();
		c.arc(Math.cos(an) * r, Math.sin(an) * r, r * 0.035, 0, 6.283);
		c.stroke();
	}
	c.restore();
}

/**
 * The fog scene's headland and lighthouse, with a pulsing lamp and a sweeping beam.
 * @param {CanvasRenderingContext2D} c
 * @param {number} w
 * @param {number} h
 * @param {number} hz
 * @param {number} t
 * @param {boolean} still
 */
function drawLighthouse(c, w, h, hz, t, still) {
	const x = w * 0.12;
	const base = hz;
	const th = h * 0.15;
	const tw = th * 0.16;
	c.fillStyle = 'rgba(52,60,68,0.85)';
	c.beginPath();
	c.moveTo(0, base);
	c.lineTo(0, base - th * 0.18);
	c.quadraticCurveTo(w * 0.08, base - th * 0.3, w * 0.2, base - th * 0.06);
	c.lineTo(w * 0.26, base);
	c.closePath();
	c.fill();
	const top = base - th * 0.22 - th;
	c.beginPath();
	c.moveTo(x - tw, base - th * 0.22);
	c.lineTo(x - tw * 0.65, top);
	c.lineTo(x + tw * 0.65, top);
	c.lineTo(x + tw, base - th * 0.22);
	c.closePath();
	c.fill();
	c.fillRect(x - tw * 0.8, top - tw * 0.9, tw * 1.6, tw * 0.9);
	const pulse = still ? 1 : Math.pow(Math.max(0, Math.sin(t * 0.9)), 6);
	const ly = top - tw * 0.45;
	const g = c.createRadialGradient(x, ly, 0, x, ly, th * (0.25 + pulse * 0.5));
	g.addColorStop(0, `rgba(255,236,190,${0.5 + pulse * 0.45})`);
	g.addColorStop(1, 'rgba(255,236,190,0)');
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, ly, th * (0.25 + pulse * 0.5), 0, 6.283);
	c.fill();
	if (!still) {
		const ang = Math.sin(t * 0.45) * 0.5;
		c.save();
		c.translate(x, ly);
		c.rotate(ang);
		const bg = c.createLinearGradient(0, 0, w * 0.5, 0);
		bg.addColorStop(0, 'rgba(255,236,190,0.16)');
		bg.addColorStop(1, 'rgba(255,236,190,0)');
		c.fillStyle = bg;
		c.beginPath();
		c.moveTo(0, 0);
		c.lineTo(w * 0.5, -h * 0.05);
		c.lineTo(w * 0.5, h * 0.05);
		c.closePath();
		c.fill();
		c.restore();
	}
}

/**
 * Drifting fog banks, some behind the boat and some in front.
 * @param {CanvasRenderingContext2D} c
 * @param {number} w
 * @param {number} h
 * @param {number} t
 * @param {boolean} front
 * @param {boolean} still
 */
function drawFog(c, w, h, t, front, still) {
	FOGS.forEach((f) => {
		if (f.front !== front) return;
		const fw = f.w * w;
		const fx = (((f.x + (still ? 0 : t * f.v)) % 1.4) - 0.2) * w;
		const fy = f.y * h;
		const fh = f.h * h;
		const g = c.createRadialGradient(fx, fy, 0, fx, fy, fw / 2);
		g.addColorStop(0, `rgba(214,222,228,${f.a * (front ? 1.2 : 1)})`);
		g.addColorStop(1, 'rgba(214,222,228,0)');
		c.save();
		c.translate(fx, fy);
		c.scale(1, fh / (fw / 2));
		c.translate(-fx, -fy);
		c.fillStyle = g;
		c.beginPath();
		c.arc(fx, fy, fw / 2, 0, 6.283);
		c.fill();
		c.restore();
	});
}
