/* limbs.js - tangan & kaki, dibangun sebagai OTOT (dipakai kiri/kanan lewat side = -1 / +1)
   side = -1 -> sisi KANAN karakter (kiri layar), side = +1 -> sisi KIRI karakter.

   Peran tiap bentuk sebagai jaringan tubuh:
   - Ellipsoid              : perut otot (deltoid dasar, bisep, trisep, paha depan/belakang, betis)
   - Hyperboloid 1 sisi     : inti / tendon yang menghubungkan otot (lengan, paha, pergelangan)
   - Hyperboloid 2 sisi     : tutup otot (deltoid cap, tempurung lutut, telapak kaki)
   - Elliptic cone          : otot yang meruncing ke tendon (lengan bawah, tendon Achilles)
   - Elliptic paraboloid    : ujung jari / buku jari                                        */
import * as B from "./builders.js";
import { node, group } from "./MyObject.js";
import { buildPiringCupcake } from "./props.js";
const C = B.COLORS;
const sin = Math.sin;
const E = (a, b, c, color = C.MUSCLE) => B.generateEllipsoidSurface({ a, b, c, color });

// Ukuran segmen (satuan model) - diambil dari foto referensi
export const ARM = { upper: 2.25, fore: 2.1 };

export function buildArm(side, { upper = -0.2, out = 0.3, fore = -0.3, inward = 0, sway = 0.03, shoulderLift = 0, shoulderWave = 0, elbowLift = 0, elbowWave = 0, phase = 0, handRotation = 0, handTilt = 0, serving = false, reach = 0 } = {}) {
    const hand = group([0, -ARM.fore, reach * 0.35], [handTilt, 0, handRotation], [
        node(B.generateHyperboloidOneSheet({ a: 0.36, b: 0.16, c: 0.36, uMax: 1, color: C.BLACK }), [0, 0.1, 0]),  // cincin pergelangan (hitam seperti di foto)
        node(E(0.78, 0.62, 0.5, C.YELLOW), [0, -0.5, 0.16]),                                                    // telapak
        ...[-0.5, -0.17, 0.17, 0.5].map((x, i) =>
            node(E(0.19, 0.34, 0.21, C.YELLOW), [x, -1.4, 0.26 + (i === 1 || i === 2 ? 0.05 : 0)])),              // 4 jari
        node(E(0.22, 0.38, 0.23, C.YELLOW), [side * 0.66, -0.4, 0.34], [0, 0, side * 0.75]),                     // ibu jari
        ...(serving ? [
            group([0, -0.88, 0.36], [1.8, 0, 0], [
                buildPiringCupcake(),
            ]),
        ] : []),
    ]);
    const elbow = group([0, -ARM.upper, reach * 0.65], [fore, 0, -side * inward], [
        node(E(0.5, 0.5, 0.5, C.YELLOW)),                                                                         // sendi siku
        node(B.generateHyperboloidOneSheet({ a: 0.4, b: 0.1, c: 0.4, uMax: 0.8, color: C.DARK }), [0, -0.38, 0]),   // garis sambungan
        node(E(0.58, 0.95, 0.54, C.YELLOW), [0, -1.2, 0.06]),                                                     // lengan bawah
        hand,
    ], { animate: t => ({ rot: [0, 0, elbowLift + elbowWave * sin(2.5 * t + phase)] }) });
    return group([0, 0, 0], [upper, 0, side * out], [
        node(E(0.8, 0.78, 0.76, C.YELLOW)),                                                                       // bahu (pauldron bulat)
        node(E(0.66, 1.12, 0.62, C.YELLOW), [0, -1.05, 0.05]),                                                    // lengan atas tebal
        elbow,
    ], { animate: t => ({ rot: [sway * sin(1.5 * t + phase), 0, side * (shoulderLift + shoulderWave * sin(2.5 * t + phase))] }) });
}

/* Kaki bersegmen: paha, sendi lutut, betis, dan sambungan pergelangan. */
export const LEG = { thigh: 1.6, shin: 1.9 };

export function buildLeg(side, { swing = 0.06, phase = 0 } = {}) {
    const orange = [0.88, 0.25, 0.035];
    const foot = group([0, -0.28, 0.12], [0, side * 0.12, 0], [
        node(B.generateEllipsoidSurface({ a: 1.0, b: 0.42, c: 0.76, color: orange }), [0, -0.04, 0.12]), // telapak elipsoid
        ...[-1, 1].map(s => group([s * 0.22, -0.02, 0.34], [0, s * 0.32, 0], [
            node(E(0.3, 0.26, 0.9, orange)),
            node(B.generateCurvedToeNailSurface({
                width: 0.3, thickness: 0.19, length: 0.86, curve: 0.23, color: C.WHITE
            }), [0, 0.08, 0.42]),
        ])),
    ]);
    const ankle = group([0, -LEG.shin, 0], [0, 0, 0], [
        foot,
    ]);
    const knee = group([0, -LEG.thigh, 0], [0, 0, 0], [
        node(B.generateCylinderSurface({ radiusX: 0.64, radiusZ: 0.62, height: 1.9, color: orange }), [0, -0.98, 0.02]), // betis silinder
        ankle,
    ], { animate: t => ({ rot: [0.1 * Math.max(0, sin(2 * t + phase)), 0, 0] }) });
    return group([0, 0, 0], [0, 0, side * 0.02], [
        node(E(0.9, 0.5, 0.82, C.YELLOW), [0, -0.05, 0]),                                                        // sendi pinggul
        node(E(0.95, 1.05, 0.9, C.YELLOW), [0, -0.72, 0]),                                                       // paha tunggal, siluet halus
        knee,
    ], { animate: t => ({ rot: [swing * sin(2 * t + phase), 0, 0] }) });
}
