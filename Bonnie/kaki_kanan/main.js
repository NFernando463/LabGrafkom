// kaki_kanan/main.js  (bisa dilihat sendiri: index.html?part=kaki_kanan)
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";
import { buildLeg } from "../otot/main.js";
const C = B.COLORS;
const sin = Math.sin;

/* ====== KAKI KANAN ======
   ellipsoid: pinggul, lutut, pergelangan, jari kaki | hyperboloid 1 sisi: paha & betis
   ellipsoid: telapak kaki (kubah) */
export function buildKakiKanan(pose = {}) {
    return buildLeg(-1, { swing: 0.06, phase: 0, ...pose });
}
