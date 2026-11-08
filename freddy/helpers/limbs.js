/* limbs.js - tangan & kaki, dibangun sebagai OTOT (dipakai kiri/kanan lewat side = -1 / +1)
   side = -1 -> sisi KANAN karakter (kiri layar), side = +1 -> sisi KIRI karakter.

   Peran tiap bentuk sebagai jaringan tubuh:
   - Ellipsoid              : perut otot (deltoid dasar, bisep, trisep, paha depan/belakang, betis)
   - Hyperboloid 1 sisi     : inti / tendon yang menghubungkan otot (lengan, paha, pergelangan)
   - Hyperboloid 2 sisi     : tutup otot (deltoid cap, tempurung lutut, telapak kaki)
   - Elliptic cone          : otot yang meruncing ke tendon (lengan bawah, tendon Achilles)
   - Elliptic paraboloid    : ujung jari / buku jari                                        */
import * as B from "./builders.js";
import { node, group, place } from "./MyObject.js";
import { beat, pulse } from "./show.js";
const C = B.COLORS;
const sin = Math.sin;
const E = (a, b, c, color = C.MUSCLE) => B.generateEllipsoidSurface({ a, b, c, color });

// Ukuran segmen (satuan model) - diambil dari foto referensi
export const ARM = { upper: 2.25, fore: 2.1 };

/* ---------- GENGGAMAN ----------
   Sumbu gagang mic sejajar sumbu X tangan (melintang telapak), di depan telapak.
   Jari-jari (4 ruas) melingkari gagang dari bawah -> depan -> atas, ibu jari menutup di atasnya. */
export const FIST = { y: -0.55, z: 0.62, r: 0.34, along: -0.15 };

// ellipsoid memanjang dari titik p ke q (sumbu panjang = y lokal)
function limb(p, q, w, th, color = C.PURPLE, extra = 0.07) {
    const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], len = Math.hypot(...d);
    const u = d.map(v => v / len);
    const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
    return node(B.generateEllipsoidSurface({ a: w, b: len / 2 + extra, c: th, stacks: 14, slices: 22, color }),
        mid, [Math.asin(u[2]), 0, Math.atan2(-u[0], u[1])]);
}

function buildFist(side, hold) {
    const kids = [
        node(B.generateHyperboloidOneSheet({ a: 0.36, b: 0.16, c: 0.36, uMax: 1, color: C.BLACK }), [0, 0.1, 0]),  // cincin pergelangan
        node(E(0.78, 0.62, 0.5, C.PURPLE), [0, -0.5, 0.06]),                                                      // telapak
    ];
    // titik pada lingkaran di sekeliling gagang: g = 0 di bawah, 90 di depan, 180 di atas
    const ring = (x, g, R = FIST.r) => {
        const a = g * Math.PI / 180;
        return [x, FIST.y - R * Math.cos(a), FIST.z + R * Math.sin(a)];
    };
    const GAMMA = [-22, 30, 85, 138, 176];
    // 4 jari: telunjuk paling dekat ibu jari (side * 0.5), kelingking paling jauh
    [[1.0, 1.0], [1.05, 1.0], [1.0, 0.97], [0.86, 0.88]].forEach(([len, thick], i) => {
        const x = side * (0.5 - 0.335 * i);
        for (let k = 0; k < GAMMA.length - 1; k++) {
            const R = FIST.r * (len < 1 && k > 1 ? 0.93 : 1);          // kelingking sedikit lebih pendek
            kids.push(limb(ring(x, GAMMA[k], R), ring(x, GAMMA[k + 1], R), 0.175 * thick, 0.165 * thick));
        }
    });
    // ibu jari: dari pangkal di sisi telapak, melintang di atas telunjuk
    const tx = side * 0.6;
    const thumb = [[tx, -0.1, 0.45], [side * 0.58, -0.15, 0.95], ring(side * 0.5, 100, FIST.r + 0.3), ring(side * 0.46, 128, FIST.r + 0.3)];
    for (let k = 0; k < thumb.length - 1; k++) kids.push(limb(thumb[k], thumb[k + 1], 0.2 - k * 0.012, 0.2 - k * 0.012));
    // gagang mic: kepala mic mengarah ke sisi ibu jari
    kids.push(place(hold, [side * -FIST.along, FIST.y, FIST.z], [0, 0, -side * Math.PI / 2]));
    return kids;
}

function buildHand(side, { reach, handRotation, handRoll, hold, wrist }) {
    const kids = hold ? buildFist(side, hold) : [
        node(B.generateHyperboloidOneSheet({ a: 0.36, b: 0.16, c: 0.36, uMax: 1, color: C.BLACK }), [0, 0.1, 0]),  // cincin pergelangan (hitam seperti di foto)
        node(E(0.78, 0.62, 0.5, C.PURPLE), [0, -0.5, 0.06]),                                                    // telapak
        ...[-0.5, -0.17, 0.17, 0.5].map((x, i) =>
            node(E(0.19, 0.34, 0.21, C.PURPLE), [x, -1.12, 0.26 + (i === 1 || i === 2 ? 0.05 : 0)])),             // 4 jari
        node(E(0.22, 0.38, 0.23, C.PURPLE), [side * 0.66, -0.4, 0.34], [0, 0, side * 0.75]),                     // ibu jari
    ];
    return group([0, -ARM.fore, reach * 0.35], [0, handRoll, handRotation], kids,
        wrist ? { animate: t => ({ rot: wrist(t) }) } : {});
}

/* motion = { shoulder(t), elbow(t), wrist(t) } -> rotasi tambahan [x,y,z] (rad) di atas pose dasar,
   dipakai untuk koreografi pertunjukan (lihat helpers/show.js).
   handRoll = putaran lengan bawah (pronasi) di sekitar sumbu lengan. */
export function buildArm(side, { upper = -0.2, out = 0.3, fore = -0.3, inward = 0, sway = 0.03, strum = 0, phase = 0, handRotation = 0, handRoll = 0, reach = 0, hold = null, motion = null } = {}) {
    const m = motion || {};
    const add = (f, t) => (f ? f(t) : [0, 0, 0]);
    const hand = buildHand(side, { reach, handRotation, handRoll, hold, wrist: m.wrist });
    const elbow = group([0, -ARM.upper, reach * 0.65], [fore, 0, -side * inward], [
        node(E(0.5, 0.5, 0.5, C.PURPLE)),                                                                         // sendi siku
        node(B.generateHyperboloidOneSheet({ a: 0.4, b: 0.1, c: 0.4, uMax: 0.8, color: C.DARK }), [0, -0.38, 0]),   // garis sambungan
        node(E(0.58, 0.95, 0.54, C.PURPLE), [0, -1.2, 0.06]),                                                     // lengan bawah
        hand,
    ], { animate: t => { const e = add(m.elbow, t); return { rot: [strum * sin(6 * t + phase) + e[0], e[1], e[2]] }; } });
    return group([0, 0, 0], [upper, 0, side * out], [
        node(E(0.8, 0.78, 0.76, C.PURPLE)),                                                                       // bahu (pauldron bulat)
        node(E(0.66, 1.12, 0.62, C.PURPLE), [0, -1.05, 0.05]),                                                    // lengan atas tebal
        elbow,
    ], { animate: t => { const s = add(m.shoulder, t); return { rot: [sway * sin(1.5 * t + phase) + s[0], s[1], s[2]] }; } });
}

/* Kaki bersegmen seperti foto: paha (tabung bulat), cincin lutut tipis, betis,
   lalu telapak lebar dengan 3 jari besar dan alas abu-abu. */
export const LEG = { thigh: 1.6, shin: 1.9 };

// walk(t) : 0..1 -> seberapa besar kaki melangkah (0 = berdiri di panggung, 1 = berjalan). Dipakai stage/main.js.
export function buildLeg(side, { swing = 0.012, phase = 0, walk = null, walkRate = 7 } = {}) {
    const gait = t => (walk ? Math.max(0, Math.min(1, Number(walk(t)))) : 0);
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
        node(B.generateHyperboloidTwoSheets({ a: 0.3, b: 0.1, c: 0.28, uMax: 0.9, sheet: 1, color: C.MUSCLE }), [0, -0.08, 0.52], [Math.PI / 2, 0, 0]), // pelindung lutut
        node(E(0.88, 0.96, 0.82, C.PURPLE), [0, -0.98, 0.02]),                                                   // betis tunggal, meruncing ke pergelangan
        ankle,
    ], { animate: t => {
        // lutut menekuk halus tiap ketukan; saat berjalan menekuk tiap langkah
        const g = gait(t);
        return { rot: [0.05 * (1 - pulse(t)) * (side < 0 ? 1 : 0.8) * (1 - g) + 0.1 * g * Math.max(0, sin(walkRate * t + phase)), 0, 0] };
    } });
    return group([0, 0, 0], [0, 0, side * 0.02], [
        node(E(0.9, 0.5, 0.82, C.PURPLE), [0, -0.05, 0]),                                                        // sendi pinggul
        node(E(0.95, 1.05, 0.9, C.PURPLE), [0, -0.72, 0]),                                                       // paha tunggal, siluet halus
        knee,
    ], { animate: t => {
        // berat badan bergeser pelan saat diam; saat berjalan kaki mengayun bergantian
        const g = gait(t);
        return { rot: [swing * sin(Math.PI * beat(t) / 2 + phase) * (1 - g) + 0.42 * g * sin(walkRate * t + phase), 0, 0] };
    } });
}
