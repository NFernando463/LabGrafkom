// kaki_kiri/main.js  (bisa dilihat sendiri: index.html?part=kaki_kiri)
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";
import { buildLeg } from "../otot/main.js";
const C = B.COLORS;
const sin = Math.sin;

/* ====== KAKI KIRI ====== */
export function buildKakiKiri(pose = {}) {
    return buildLeg(1, { swing: 0.06, phase: Math.PI, ...pose });
}
