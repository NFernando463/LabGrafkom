// kepala/main.js  (bisa dilihat sendiri: index.html?part=kepala)
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";
import { buildWajah } from "../wajah/main.js";
import { scare } from "../helpers/scare.js";

const C = B.COLORS;
const sin = Math.sin;

/* ====== KEPALA (disesuaikan dengan foto) ======
   Tengkorak bulat + telinga kotak tebal yang menempel lewat tangkai logam pendek.
   Detail wajah (moncong, mata, rahang yang bisa membuka) ada di ../wajah/main.js. */
export function buildKepala() {
    const kids = [];
    kids.push(node(B.generateEllipsoidSurface({ a: 1.72, b: 1.72, c: 1.6 })));                                   // tengkorak bulat
    kids.push(buildWajah());

    [-1, 1].forEach(s => {
        const ex = s * 0.78;
        // tangkai logam abu-abu: hyperboloid 1 sisi tipis (mirip silinder)
        kids.push(node(B.generateHyperboloidOneSheet({ a: 0.14, b: 0.28, c: 0.14, uMax: 0.5, color: [0.68, 0.68, 0.72] }), [ex, 1.72, -0.05]));
        // telinga: pivot di pangkal, miring sedikit keluar dan bisa bergoyang
        const tilt = -s * 0.1;
        kids.push(group([ex, 1.82, -0.05], [0, 0, tilt], [
            node(B.generateBentEarSurface({ width: 0.64, depth: 0.46, height: 1.75, bend: s * 0.1, stacks: 40, slices: 40 })),                    // badan telinga
            node(B.generateEllipsoidSurface({ a: 0.7, b: 0.18, c: 0.5, color: C.MUSCLE }), [s * 0.1, 1.72, 0]),                                 // tutup atas (lebih lebar)
            node(B.generateEllipsoidSurface({ a: 0.38, b: 0.68, c: 0.1, color: [0.27, 0.25, 0.36] }), [s * 0.04, 0.92, 0.42]),                    // panel dalam abu-abu
            node(B.generateEllipsoidSurface({ a: 0.5, b: 0.2, c: 0.4, color: C.DARK }), [0, 0.12, 0.05]),                                        // bayangan pangkal
        ], {
            // Animasi telinga: goyangan halus dengan jeda berbeda di kiri dan kanan.
            animate: t => ({ rot: [0, 0, s * 0.06 * sin(2 * t + (s > 0 ? 0 : 1.5)) + s * 0.3 * scare.amount * sin(t * 44 + (s > 0 ? 0 : 2))] }),
        }));
    });

    return group([0, 0, 0], [0, 0, 0], kids, {
        // Animasi kepala: anggukan dan lirik kecil agar ekspresi Bonnie lebih hidup.
        animate: t => {
            const a = scare.amount;
            // saat jumpscare kepala miring dan bergetar ke kiri-kanan
            return { rot: [
                (0.06 * sin(1.8 * t)) * (1 - a) + a * (0.1 + 0.07 * sin(t * 33)),
                (0.22 * sin(0.9 * t)) * (1 - a) + a * 0.2 * sin(t * 41),
                (0.025 * sin(1.2 * t)) * (1 - a) + a * (0.2 + 0.08 * sin(t * 37)),
            ] };
        }
    });
}
