/* =====================================================================
   builders.js  -  6 permukaan kuadrik (format vertex: x,y,z, r,g,b, nx,ny,nz)
   1. Ellipsoid                2. Hyperboloid satu sisi
   3. Hyperboloid dua sisi     4. Elliptic cone
   5. Elliptic paraboloid      6. Hyperbolic paraboloid
   Sumbu utama = sumbu Y (atas). Normal dihitung dari turunan permukaan
   dan dipakai fragment shader untuk lighting (efek 3D).
   ===================================================================== */
export const COLORS = {
    PURPLE: [0.27, 0.235, 0.41],   // ungu keabuan pada model (disesuaikan dengan foto)
    YELLOW: [1.0, 0.82, 0.05],
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
            const r = ref(p, u, v);
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

export function generateBoxSurface({ a = 1, b = 1, c = 1, color = COLORS.WHITE } = {}) {
    const vertices = [], faces = [];
    const x = a / 2, y = b / 2, z = c / 2;
    const sides = [
        { normal: [1, 0, 0], points: [[x, -y, -z], [x, y, -z], [x, y, z], [x, -y, z]] },
        { normal: [-1, 0, 0], points: [[-x, -y, z], [-x, y, z], [-x, y, -z], [-x, -y, -z]] },
        { normal: [0, 1, 0], points: [[-x, y, -z], [-x, y, z], [x, y, z], [x, y, -z]] },
        { normal: [0, -1, 0], points: [[-x, -y, z], [-x, -y, -z], [x, -y, -z], [x, -y, z]] },
        { normal: [0, 0, 1], points: [[x, -y, z], [x, y, z], [-x, y, z], [-x, -y, z]] },
        { normal: [0, 0, -1], points: [[-x, -y, -z], [-x, y, -z], [x, y, -z], [x, -y, -z]] },
    ];
    sides.forEach(({ normal, points }) => {
        const start = vertices.length / 9;
        points.forEach(p => vertices.push(...p, ...color, ...normal));
        faces.push(start, start + 1, start + 2, start, start + 2, start + 3);
    });
    return { vertices, faces };
}

export function generateCylinderSurface({ radiusX = 0.65, radiusZ = 0.65, height = 1, slices = 36, color = COLORS.PURPLE } = {}) {
    const vertices = [], faces = [];
    const halfHeight = height / 2;

    for (let i = 0; i <= 1; i++) {
        const y = i === 0 ? -halfHeight : halfHeight;
        for (let j = 0; j <= slices; j++) {
            const angle = TAU * j / slices;
            const x = radiusX * Math.cos(angle);
            const z = radiusZ * Math.sin(angle);
            const length = Math.hypot(x / (radiusX * radiusX), z / (radiusZ * radiusZ)) || 1;
            vertices.push(x, y, z, ...color, (x / (radiusX * radiusX)) / length, 0, (z / (radiusZ * radiusZ)) / length);
        }
    }

    for (let j = 0; j < slices; j++) {
        const bottom = j, nextBottom = j + 1;
        const top = slices + 1 + j, nextTop = top + 1;
        faces.push(bottom, top, nextBottom, nextBottom, top, nextTop);
    }

    const addCap = (y, normalY, reverse) => {
        const center = vertices.length / 9;
        vertices.push(0, y, 0, ...color, 0, normalY, 0);
        for (let j = 0; j <= slices; j++) {
            const angle = TAU * j / slices;
            vertices.push(radiusX * Math.cos(angle), y, radiusZ * Math.sin(angle), ...color, 0, normalY, 0);
        }
        for (let j = 0; j < slices; j++) {
            if (reverse) faces.push(center, center + j + 2, center + j + 1);
            else faces.push(center, center + j + 1, center + j + 2);
        }
    };
    addCap(-halfHeight, -1, true);
    addCap(halfHeight, 1, false);
    return { vertices, faces };
}

export function generateBeakSurface({ length = 1.6, width = 0.7, height = 0.35, baseY = 0, baseZ = 0, slope = 0.3, color = COLORS.RED } = {}) {
    const profileAt = u => (0.58 + 0.55 * Math.sin(Math.PI * u * 0.72)) * Math.pow(1 - u, 0.8);
    const centerYAt = u => baseY - slope * u;
    return grid((u, v) => {
        const angle = TAU * v;
        const profile = profileAt(u);
        return [
            width * profile * Math.cos(angle),
            centerYAt(u) + height * profile * Math.sin(angle),
            baseZ + length * u,
        ];
    }, p => {
        const u = (p[2] - baseZ) / length;
        return [p[0], p[1] - centerYAt(u), 0];
    }, 32, 40, color);
}

export function generateCurvedToeNailSurface({ width = 0.16, thickness = 0.11, length = 0.52, curve = 0.14, stacks = 24, slices = 24, color = COLORS.SOLE } = {}) {
    return grid((u, v) => {
        const angle = TAU * v;
        const profile = Math.sin(Math.PI * u) ** 0.55;
        return [
            width * profile * Math.cos(angle),
            -curve * u * u + thickness * profile * Math.sin(angle),
            length * u,
        ];
    }, p => [p[0], p[1], 0], stacks, slices, color);
}

export function generateCurvedFeatherSurface({ width = 0.32, depth = 0.08, height = 1.56, bend = 0.18, stacks = 32, slices = 24, color = COLORS.YELLOW } = {}) {
    const pointAt = u => {
        const t = u;
        const oneMinusT = 1 - t;
        return [
            3 * oneMinusT * oneMinusT * t * bend + 3 * oneMinusT * t * t * bend * 0.7 + t * t * t * bend * 0.7,
            height * (u - 0.5),
        ];
    };
    const tangentAt = u => {
        const before = pointAt(Math.max(0, u - 1e-3));
        const after = pointAt(Math.min(1, u + 1e-3));
        return norm([after[0] - before[0], after[1] - before[1], 0], [0, 1, 0]);
    };
    const profileAt = u => Math.sin(Math.PI * u) ** 0.7;

    return grid((u, v) => {
        const angle = TAU * v;
        const center = pointAt(u);
        const tangent = tangentAt(u);
        const profile = profileAt(u);
        const across = width * profile * Math.cos(angle);
        return [
            center[0] - tangent[1] * across,
            center[1] + tangent[0] * across,
            depth * profile * Math.sin(angle),
        ];
    }, (p, u) => {
        const center = pointAt(u);
        return [p[0] - center[0], p[1] - center[1], p[2]];
    }, stacks, slices, color);
}

// 2. Hyperboloid satu sisi: x²/a² + z²/c² - y²/b² = 1   (y = b sinh t, t di [-uMax,uMax])
export function generateHyperboloidOneSheet({ a = 1, b = 1, c = 1, uMax = 1, stacks = 20, slices = 36, color = COLORS.PURPLE } = {}) {
    return grid((u, v) => {
        const t = (2 * u - 1) * uMax, th = TAU * v;
        return [a * Math.cosh(t) * Math.cos(th), b * Math.sinh(t), c * Math.cosh(t) * Math.sin(th)];
    }, radial, stacks, slices, color);
}

// 3. Hyperboloid dua sisi: y²/b² - x²/a² - z²/c² = 1   (sheet: +1 atas, -1 bawah)
export function generateHyperboloidTwoSheets({ a = 1, b = 1, c = 1, uMax = 1.5, sheet = 1, stacks = 20, slices = 36, color = COLORS.PURPLE } = {}) {
    return grid((u, v) => {
        const t = u * uMax, th = TAU * v;
        return [a * Math.sinh(t) * Math.cos(th), sheet * b * Math.cosh(t), c * Math.sinh(t) * Math.sin(th)];
    }, p => p, stacks, slices, color);
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

export function generateBentEarSurface({ width = 0.4, depth = 0.22, height = 2.8, bend = 0.35, stacks = 40, slices = 40, color = COLORS.PURPLE } = {}) {
    const clamp = value => Math.max(0, Math.min(1, value));
    const smoothStep = value => {
        const t = clamp(value);
        return t * t * (3 - 2 * t);
    };
    const centerAt = u => bend * smoothStep((u - 0.48) / 0.52);
    const radiusAt = u => {
        const baseCap = Math.sqrt(Math.max(0, 1 - ((0.08 - u) / 0.08) ** 2));
        const tipCap = Math.sqrt(Math.max(0, 1 - ((u - 0.92) / 0.08) ** 2));
        return width * (0.98 - 0.08 * u) * (u < 0.08 ? baseCap : 1) * (u > 0.92 ? tipCap : 1);
    };

    return grid((u, v) => {
        const angle = TAU * v;
        const radius = radiusAt(u);
        return [
            centerAt(u) + radius * Math.cos(angle),
            height * u,
            depth * (radius / width) * Math.sin(angle),
        ];
    }, (p, u) => [p[0] - centerAt(u), 0, p[2]], stacks, slices, color);
}