import { group, place } from "./MyObject.js";
import { buildBadan } from "../badan/main.js";
import { buildKepala } from "../kepala/main.js";
import { buildTanganKanan } from "../tangan_kanan/main.js";
import { buildTanganKiri } from "../tangan_kiri/main.js";
import { buildKakiKanan } from "../kaki_kanan/main.js";
import { buildKakiKiri } from "../kaki_kiri/main.js";
import { buildGitar } from "../gitar/main.js";

export function buildBonnie({ walk = null, strum = undefined, guitar = true } = {}) {
    const bonnie = buildBadan();
    const legPose = walk
        ? { swing: t => 0.025 + 0.395 * Number(walk(t)), walkRate: 7 }   // walk(t): 0..1 (boleh boolean)
        : {};
    const rightArmPose = strum === undefined ? {} : { strum };
    bonnie.childs.push(
        place(buildKepala(), [0, 4.2, 0]),
        // Tangan kanan: pivot dimajukan ke z=0.9 (shoulderBack 0.9 di dalam pose menjaga bola bahu tetap di z=0);
        // pose dihitung untuk gitar di [-0.5, -1.3, 2.0]. Tangan kiri mengunci leher gitar.
        place(buildTanganKanan(rightArmPose), [-2.35, 1.8, 0.9]),
        place(buildTanganKiri(), [2.35, 1.8, 0.8]),
        place(buildKakiKanan(legPose), [-0.95, -3, 0]),
        place(buildKakiKiri(legPose), [0.95, -3, 0]),
    );
    if (guitar) {
        bonnie.childs.push(place(buildGitar(), [-0.5, -1.3, 2.0], [0, 0, 0.7]));
    }
    return bonnie;
}