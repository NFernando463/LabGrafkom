/* limbs.js - tangan & kaki, dibangun sebagai OTOT (dipakai kiri/kanan lewat side = -1 / +1)
   side = -1 -> sisi KANAN karakter (kiri layar), side = +1 -> sisi KIRI karakter.

   Peran tiap bentuk sebagai jaringan tubuh:
   - Ellipsoid              : perut otot (deltoid dasar, bisep, trisep, paha depan/belakang, betis)
   - Hyperboloid 1 sisi     : inti / tendon yang menghubungkan otot (lengan, paha, pergelangan)
   - Ellipsoid              : tutup otot dan tempurung lutut
   - Elliptic cone          : otot yang meruncing ke tendon (lengan bawah, tendon Achilles)
   - Elliptic paraboloid    : ujung jari / buku jari                                        */
import * as B from "../helpers/builders.js";
import { node, group } from "../helpers/MyObject.js";
const C = B.COLORS;
const sin = Math.sin;
const E = (a, b, c, color = C.MUSCLE) => B.generateEllipsoidSurface({ a, b, c, color });

function toAxisAngle([x, y, z]) {
    const cx = Math.cos(x / 2), sx = Math.sin(x / 2);
    const cy = Math.cos(y / 2), sy = Math.sin(y / 2);
    const cz = Math.cos(z / 2), sz = Math.sin(z / 2);
    const qx = cz * cy * sx - sz * sy * cx;
    const qy = cz * sy * cx + sz * cy * sx;
    const qz = sz * cy * cx - cz * sy * sx;
    const qw = cz * cy * cx + sz * sy * sx;
    const sinHalfAngle = Math.hypot(qx, qy, qz);

    return sinHalfAngle < 1e-8
        ? { axis: [1, 0, 0], angle: 0 }
        : { axis: [qx / sinHalfAngle, qy / sinHalfAngle, qz / sinHalfAngle], angle: 2 * Math.atan2(sinHalfAngle, qw) };
}

// Ukuran segmen (satuan model) - diambil dari foto referensi
export const ARM = { upper: 2.25, fore: 2.1 };

export function buildArm(side, { upper = -0.2, out = 0.3, fore = -0.3, inward = 0, sway = 0.03, swayRate = 1.5, strum = 0, phase = 0, handRotation = 0, reach = 0, elbowBack = 0, handForward = 0, forearmForward = 0, upperForward = 0.05, shoulderBack = 0, grip = false, upperThickness = 1, wristBend = 0, wristTwist = 0, arbitraryWristAxis = false } = {}) {
    const strumAt = t => typeof strum === "function" ? strum(t) : strum;
    const elbowDepth = reach * 0.65 - elbowBack;
    const upperSegmentAngle = Math.asin(-elbowDepth / ARM.upper);
    const fingerPositions = [-0.5, -0.17, 0.17, 0.5];
    const handParts = [
        node(B.generateHyperboloidOneSheet({ a: 0.36, b: 0.16, c: 0.36, uMax: 1, color: C.BLACK }), [0, 0.1, 0]),
        node(E(grip ? 0.62 : 0.78, grip ? 0.48 : 0.62, grip ? 0.42 : 0.5, C.PURPLE), [0, grip ? 0.06 : -0.5, 0.06]),
    ];
    if (grip) {
        [-0.3, -0.1, 0.1, 0.3].forEach((x, i) => {
            const z = 0.2 + (i === 1 || i === 2 ? 0.04 : 0);
            handParts.push(
                node(E(0.14, 0.21, 0.16, C.PURPLE), [x, -0.75, z]),
                node(E(0.13, 0.14, 0.15, C.PURPLE), [x * 0.9, -0.86, z + 0.12], [0.55, 0, 0.45])
            );
        });
    } else {
        fingerPositions.forEach((x, i) => {
            handParts.push(node(E(0.19, 0.34, 0.21, C.PURPLE), [x, -1.12, 0.26 + (i === 1 || i === 2 ? 0.05 : 0)]));
        });
    }

    handParts.push(node(E(0.2, 0.34, 0.2, C.PURPLE), [side * (grip ? 0.54 : 0.66), grip ? -0.48 : -0.4, grip ? 0.36 : 0.34], [0, 0, side * 0.75]));

    // rot pergelangan: x = menekuk (wristBend), y = memutar telapak (wristTwist), z = miring (handRotation)
    const wristRotation = [wristBend, wristTwist, handRotation];
    const hand = group([0, -ARM.fore, reach * 0.35 + handForward], arbitraryWristAxis ? toAxisAngle(wristRotation) : wristRotation, [
        ...handParts,
    ], {
        // Petikan: pergelangan berayun di bidang gitar dan sedikit menekuk ke depan.
        // rot x selalu <= 0 (maju), jadi tangan tidak pernah mundur ke arah badan gitar.
        animate: strum ? t => {
            const s = sin(10 * t + phase);
            const amount = strumAt(t);
            const intensity = Math.max(0, Math.min(1, amount / 0.06));
            const rotation = [-0.06 * (1 + s) * 0.5 * intensity, 0, 0.22 * s * intensity];
            return { rot: arbitraryWristAxis ? toAxisAngle(rotation) : rotation };
        } : null,
    });
    const elbow = group([0, -ARM.upper, reach * 0.65 - elbowBack], [fore, 0, -side * inward], [
        node(E(0.5, 0.5, 0.5, C.PURPLE)),                                                                         // sendi siku
        node(B.generateHyperboloidOneSheet({ a: 0.4, b: 0.1, c: 0.4, uMax: 0.8, color: C.DARK }), [0, -0.38, 0]),   // garis sambungan
        node(E(0.54, 0.95, 0.54, C.PURPLE), [0, -1.2, 0.06 + forearmForward]),                                  // lengan bawah
        hand,
    ], {
        // Siku: ayunan kecil dan selalu condong ke depan (rot x negatif = maju).
        animate: t => {
            const s = sin(8 * t + phase);
            const amount = strumAt(t);
            return { rot: [amount ? -0.04 * (1 + s) : 0, 0, amount * s] };
        },
    });
    // Lengan (berputar di bahu): lengan atas + siku + tangan
    const arm = group([0, 0, 0], [upper, 0, side * out], [
        node(E(0.66 * upperThickness, 1.18, 0.62 * upperThickness, C.PURPLE), [0, -ARM.upper / 2, elbowDepth / 2 + upperForward], [upperSegmentAngle, 0, 0]), // lengan atas
        elbow,
    ], {
        // Animasi bahu: gerak kecil menjaga pose bermain tetap hidup.
        animate: t => ({ rot: [0, 0, sway * sin(swayRate * t + phase)] }),
    });
    // Bola bahu TIDAK ikut berputar: posisinya tetap (0, 0, -shoulderBack) dari pivot,
    // sehingga bahu kiri dan kanan selalu simetris walau sudut lengannya berbeda.
    return group([0, 0, 0], [0, 0, 0], [
        node(E(0.8, 0.78, 0.76, C.PURPLE), [0, 0, -shoulderBack]),                                                 // bahu (pauldron bulat)
        arm,
    ]);
}

/* Kaki bersegmen seperti foto: paha (tabung bulat), cincin lutut tipis, betis,
   lalu telapak lebar dengan 3 jari besar dan alas abu-abu. */
export const LEG = { thigh: 1.6, shin: 1.9 };

export function buildLeg(side, { swing = 0.06, phase = 0, walkRate = 2 } = {}) {
    const toe = (x, z, width = 0.48, height = 0.34, depth = 0.5) =>
        node(E(width, height, depth, C.PURPLE), [x, -0.5, z]);
    const foot = group([side * 0.4, 0, 0.0], [0, side * 0.28, 0], [
        node(E(1.02, 0.4, 0.82, C.PURPLE), [0, -0.34, 0.28]),                                                    // massa telapak utama
        toe(-0.62, 0.92, 0.46, 0.32, 0.48),
        toe(0, 1.02, 0.5, 0.35, 0.52),
        toe(0.62, 0.92, 0.46, 0.32, 0.48),
        node(E(0.96, 0.12, 0.76, C.DARK), [0, -0.67, 0.3]),                                                      // alas gelap
    ]);
    const ankle = group([0, -LEG.shin, 0], [0, 0, 0], [
        node(B.generateHyperboloidOneSheet({ a: 0.5, b: 0.14, c: 0.48, uMax: 0.8, color: C.DARK }), [0, 0.02, 0]), // garis sambungan
        foot,
    ]);
    const knee = group([0, -LEG.thigh, 0], [0, 0, 0], [
        node(E(0.72, 0.32, 0.7, C.PURPLE), [0, -0.08, 0]),                                                       // sendi lutut
        node(E(0.3, 0.1, 0.28, C.MUSCLE), [0, -0.08, 0.52], [Math.PI / 2, 0, 0]), // pelindung lutut
        node(E(0.88, 0.96, 0.82, C.PURPLE), [0, -0.98, 0.02]),                                                   // betis tunggal, meruncing ke pergelangan
        ankle,
    ], {
        // Animasi lutut: tekukan ringan bergantian mengikuti irama.
        animate: t => {
            const gait = typeof swing === "function" ? swing(t) / 0.42 : 1;
            return { rot: [0.1 * gait * Math.max(0, sin(walkRate * t + phase)), 0, 0] };
        },
    });
    return group([0, 0, 0], [0, 0, side * 0.02], [
        node(E(0.9, 0.5, 0.82, C.PURPLE), [0, -0.05, 0]),                                                        // sendi pinggul
        node(E(0.95, 1.05, 0.9, C.PURPLE), [0, -0.72, 0]),                                                       // paha tunggal, siluet halus
        knee,
    ], {
        // Animasi pinggul: ayunan kaki kecil untuk memberi kesan badan mengikuti musik.
        animate: t => ({
            rot: [(typeof swing === "function" ? swing(t) : swing) * sin(walkRate * t + phase), 0, 0],
        }),
    });
}