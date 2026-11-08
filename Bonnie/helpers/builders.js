export const COLORS = {
    PURPLE: [0.27, 0.235, 0.41],   // ungu keabuan khas Bonnie (disesuaikan dengan foto)
    MUSCLE: [0.31, 0.27, 0.46],   // sedikit lebih terang
    DARK:   [0.17, 0.14, 0.27],
    PINK:   [0.58, 0.38, 0.62],
    GRAY:   [0.55, 0.53, 0.61],   // perut abu-abu lavender
    MUZZLE: [0.43, 0.41, 0.48],   // bantalan moncong
    SOLE:   [0.55, 0.55, 0.60],   // alas kaki
    RED:    [0.78, 0.08, 0.10],
    WHITE:  [0.96, 0.96, 0.96],
    BLACK:  [0.05, 0.05, 0.07],
};

const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const norm = (p, fb = [0, 1, 0]) => { const l = Math.hypot(...p); return l < 1e-9 ? fb : p.map(v => v / l); };

// fn(u,v) -> [x,y,z] dengan u,v di [0,1]; ref(p) -> arah "luar" permukaan
function grid(fn, ref, stacks, slices, color) {
    const vertices = [], faces = [], e = 1e-3;
    for (let i = 0; i <= stacks; i++) {
        for (let j = 0; j <= slices; j++) {
            const u = i / stacks, v = j / slices;
            const p = fn(u, v);
            const pu = sub(fn(Math.min(u + e, 1), v), fn(Math.max(u - e, 0), v));
            const pv = sub(fn(u, Math.min(v + e, 1)), fn(u, Math.max(v - e, 0)));
            const r = ref(p);
            let n = norm(cross(pu, pv), norm(r));
            if (dot(n, r) < 0) n = n.map(x => -x);
            vertices.push(p[0], p[1], p[2], color[0], color[1], color[2], n[0], n[1], n[2]);
        }
    }
    for (let i = 0; i < stacks; i++) {
        for (let j = 0; j < slices; j++) {
            const a = i * (slices + 1) + j, b = a + slices + 1;
            faces.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }
    return { vertices, faces };
}

const TAU = 2 * Math.PI;
const radial = p => [p[0], 0, p[2]];

// 1. Ellipsoid: x²/a² + y²/b² + z²/c² = 1
export function generateEllipsoidSurface({ a = 1, b = 1, c = 1, stacks = 28, slices = 40, color = COLORS.PURPLE } = {}) {
    return grid((u, v) => {
        const ph = Math.PI * u, th = TAU * v;
        return [a * Math.sin(ph) * Math.cos(th), b * Math.cos(ph), c * Math.sin(ph) * Math.sin(th)];
    }, p => p, stacks, slices, color);
}

// 2. Hyperboloid satu sisi: x²/a² + z²/c² - y²/b² = 1   (y = b sinh t, t di [-uMax,uMax])
export function generateHyperboloidOneSheet({ a = 1, b = 1, c = 1, uMax = 1, stacks = 20, slices = 36, color = COLORS.PURPLE } = {}) {
    return grid((u, v) => {
        const t = (2 * u - 1) * uMax, th = TAU * v;
        return [a * Math.cosh(t) * Math.cos(th), b * Math.sinh(t), c * Math.cosh(t) * Math.sin(th)];
    }, radial, stacks, slices, color);
}

// 4. Elliptic cone: x²/a² + z²/b² = (y/height)²   (puncak di y=0, melebar ke +y)
export function generateEllipticCone({ a = 1, b = 1, height, c = 1, stacks = 12, slices = 36, color = COLORS.PURPLE } = {}) {
    const h = height ?? c;
    return grid((u, v) => {
        const th = TAU * v;
        return [a * u * Math.cos(th), h * u, b * u * Math.sin(th)];
    }, radial, stacks, slices, color);
}

// 5. Elliptic paraboloid: y = height * (x²/a² + z²/b²)   (puncak di y=0, terbuka ke +y)
export function generateEllipticParaboloid({ a = 1, b = 1, height, c = 1, stacks = 16, slices = 36, color = COLORS.PURPLE } = {}) {
    const h = height ?? c;
    return grid((u, v) => {
        const th = TAU * v;
        return [a * u * Math.cos(th), h * u * u, b * u * Math.sin(th)];
    }, radial, stacks, slices, color);
}

// 6. Hyperbolic paraboloid (pelana): y = c * (x²/a² - z²/b²)
export function generateHyperbolicParaboloid({ a = 1, b = 1, c = 0.5, stacks = 16, slices = 16, color = COLORS.PURPLE } = {}) {
    return grid((u, v) => {
        const U = 2 * u - 1, V = 2 * v - 1;
        return [a * U, c * (U * U - V * V), b * V];
    }, () => [0, 1, 0], stacks, slices, color);
}

// 7. Bent ear surface: telinga Bonnie yang melengkung ke samping, dengan penampang membulat di atas dan bawah
export function generateBentEarSurface({ width = 0.4, depth = 0.22, height = 2.8, bend = 0.35, stacks = 40, slices = 40, color = COLORS.PURPLE } = {}) {
    const clamp = value => Math.max(0, Math.min(1, value));
    const smoothStep = value => {
        const t = clamp(value);
        return t * t * (3 - 2 * t);
    };
    // KURVA SUMBU TELINGA: lurus di bagian bawah, lalu melengkung halus ke samping
    const centerAt = u => bend * smoothStep((u - 0.48) / 0.52);
    // KURVA PROFIL: radius penampang di tiap ketinggian (ujung bawah & atas membulat)
    const radiusAt = u => {
        const baseCap = Math.sqrt(Math.max(0, 1 - ((0.08 - u) / 0.08) ** 2));
        const tipCap = Math.sqrt(Math.max(0, 1 - ((u - 0.92) / 0.08) ** 2));
        return width * (0.98 - 0.08 * u) * (u < 0.08 ? baseCap : 1) * (u > 0.92 ? tipCap : 1);
    };

    return grid((u, v) => {
        const angle = TAU * v;
        const radius = radiusAt(u);
        return [
            centerAt(u) + radius * Math.cos(angle),   // x ikut bergeser mengikuti kurva sumbu
            height * u,
            depth * (radius / width) * Math.sin(angle),
        ];
    }, (p, u) => [p[0] - centerAt(u), 0, p[2]], stacks, slices, color);
}