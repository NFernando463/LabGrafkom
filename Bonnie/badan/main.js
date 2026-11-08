// badan/main.js  (bisa dilihat sendiri: index.html?part=badan)
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";

const C = B.COLORS;
const sin = Math.sin;

function buildTorsoSurface() {
    const a = 1.78, b = 2.05, c = 1.5;
    const stacks = 40, slices = 56;
    const vertices = [], faces = [];
    const point = (u, v) => {
        const phi = Math.PI * u, theta = 2 * Math.PI * v;
        const x = a * Math.sin(phi) * Math.cos(theta);
        const y = b * Math.cos(phi);
        const z = c * Math.sin(phi) * Math.sin(theta);
        return [x, y, z];
    };
    const subtract = (p, q) => p.map((value, i) => value - q[i]);
    const cross = (p, q) => [
        p[1] * q[2] - p[2] * q[1],
        p[2] * q[0] - p[0] * q[2],
        p[0] * q[1] - p[1] * q[0],
    ];

    for (let i = 0; i <= stacks; i++) {
        for (let j = 0; j <= slices; j++) {
            const u = i / stacks, v = j / slices, p = point(u, v);
            const e = 1e-3;
            const pu = subtract(point(Math.min(u + e, 1), v), point(Math.max(u - e, 0), v));
            const pv = subtract(point(u, Math.min(v + e, 1)), point(u, Math.max(v - e, 0)));
            let normal = cross(pu, pv);
            const length = Math.hypot(normal[0], normal[1], normal[2]) || 1;
            normal = normal.map(value => value / length);
            if (normal[0] * p[0] + normal[1] * p[1] + normal[2] * p[2] < 0)
                normal = normal.map(value => -value);
            vertices.push(p[0], p[1], p[2], ...C.PURPLE, ...normal);
        }
    }
    for (let i = 0; i < stacks; i++) {
        for (let j = 0; j < slices; j++) {
            const current = i * (slices + 1) + j, next = current + slices + 1;
            faces.push(current, next, current + 1, next, next + 1, current + 1);
        }
    }
    return { vertices, faces };
}

/* ====== BADAN (disesuaikan dengan foto referensi) ======
   Proporsi dari foto: torso pendek & lebar, perut abu-abu besar berbentuk oval,
   dasi kupu-kupu merah tepat di bawah dagu, pinggul berupa pita lebar yang terpisah garis gelap.
   ellipsoid            : torso, perut, bahu, pinggul, leher
   hyperboloid 1 sisi   : sambungan pinggang (cincin)
   elliptic cone        : (dipakai di dasi/tangan)
   elliptic paraboloid  : trapezius (kubah di pangkal leher) */
export function buildBadan() {
    const dasi = group([0, 1.66, 0.8], [0, 0, 0], [
        node(B.generateEllipsoidSurface({ a: 0.24, b: 0.22, c: 0.2, color: C.RED }), [0, 0, 0.05]),
        node(B.generateEllipsoidSurface({ a: 0.52, b: 0.3, c: 0.17, color: C.RED }), [0.5, 0, 0], [0, 0, -0.22]),
        node(B.generateEllipsoidSurface({ a: 0.52, b: 0.3, c: 0.17, color: C.RED }), [-0.5, 0, 0], [0, 0, 0.22]),
    ]);
    const kids = [
        node(buildTorsoSurface()),                                                                                       // torso dasar
        node(B.generateEllipsoidSurface({ a: 1.34, b: 1.48, c: 0.9, color: C.GRAY }), [0, -0.22, 1.06]),              // perut bulat dan menonjol di depan torso
        node(B.generateEllipsoidSurface({ a: 2.05, b: 0.56, c: 0.85, color: C.MUSCLE }), [0, 1.55, -0.02]),            // garis bahu
        node(B.generateEllipsoidSurface({ a: 0.86, b: 0.4, c: 0.68, color: C.DARK }), [0, 2.1, 0]),                     // leher pendek
        node(B.generateEllipticParaboloid({ a: 1.1, b: 0.75, height: 0.5, color: C.MUSCLE }), [0, 1.95, -0.1], [Math.PI, 0, 0]), // trapezius (kubah)
        node(B.generateEllipsoidSurface({ a: 1.55, b: 0.14, c: 0.88, color: C.DARK }), [0, -2.02, 0]),                 // celah gelap perut-pinggul
        node(B.generateEllipsoidSurface({ a: 1.7, b: 0.62, c: 0.96 }), [0, -2.55, 0]),                                // pinggul (pita lebar)
        dasi,
    ];
    return group([0, 0, 0], [0, 0, 0], kids,
        {
            // Animasi badan: gerak naik-turun dan goyangan kecil mengikuti irama.
            animate: t => ({ pos: [0, 0.08 * sin(2 * t), 0], rot: [0, 0.12 * sin(t), 0] }),
        });
}
