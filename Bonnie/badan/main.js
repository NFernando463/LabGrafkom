// badan/main.js  (bisa dilihat sendiri: index.html?part=badan)
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";

const C = B.COLORS;
const sin = Math.sin;

/* ====== BADAN (disesuaikan dengan foto referensi) ======
   Proporsi dari foto: torso pendek & lebar, perut abu-abu besar berbentuk oval,
   dasi kupu-kupu merah tepat di bawah dagu, dan pinggul berupa pita lebar.
   Semua komponen badan dibuat menggunakan permukaan ellipsoid. */
export function buildBadan() {
    const dasi = group([0, 1.66, 0.8], [0, 0, 0], [
        node(B.generateEllipsoidSurface({ a: 0.24, b: 0.22, c: 0.2, color: C.RED }), [0, 0, 0.05]),
        node(B.generateEllipsoidSurface({ a: 0.52, b: 0.3, c: 0.17, color: C.RED }), [0.5, 0, 0], [0, 0, -0.22]),
        node(B.generateEllipsoidSurface({ a: 0.52, b: 0.3, c: 0.17, color: C.RED }), [-0.5, 0, 0], [0, 0, 0.22]),
    ]);
    const kids = [
        node(B.generateEllipsoidSurface({ a: 1.78, b: 2.05, c: 1.5, stacks: 40, slices: 56, color: C.PURPLE })),       // torso dasar
        node(B.generateEllipsoidSurface({ a: 1.34, b: 1.48, c: 0.9, color: C.GRAY }), [0, -0.22, 1.06]),              // perut bulat dan menonjol di depan torso
        node(B.generateEllipsoidSurface({ a: 2.05, b: 0.56, c: 0.85, color: C.MUSCLE }), [0, 1.55, -0.02]),            // garis bahu
        node(B.generateEllipsoidSurface({ a: 0.86, b: 0.4, c: 0.68, color: C.DARK }), [0, 2.1, 0]),                     // leher pendek
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
