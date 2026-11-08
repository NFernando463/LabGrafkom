// tangan_kiri/main.js  (bisa dilihat sendiri: index.html?part=tangan_kiri)
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";
import { buildArm } from "../otot/main.js";
const C = B.COLORS;
const sin = Math.sin;

/* ====== TANGAN KIRI (sisi kiri karakter = kanan layar) - memegang leher gitar ====== */
export function buildTanganKiri(pose = {}) {
    return buildArm(1, { upper: -0.1, out: 0.05, fore: -2.15, inward: -0.10, strum: 0, sway: 0.02, phase: 1.3, upperForward: -0.45, shoulderBack: 0.8, grip: true, ...pose });
}
