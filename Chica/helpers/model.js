import { group, place } from "./MyObject.js";
import { buildBadan } from "../badan/main.js";
import { buildKepala } from "../kepala/main.js";
import { buildTanganKanan } from "../tangan_kanan/main.js";
import { buildTanganKiri } from "../tangan_kiri/main.js";
import { buildKakiKanan } from "../kaki_kanan/main.js";
import { buildKakiKiri } from "../kaki_kiri/main.js";

export function buildChica() {
    const chica = buildBadan();
    chica.childs.push(
        place(buildKepala(), [0, 3.8, 0]),
        place(buildTanganKanan({ reach: 0.2 }), [-2.1, 0.9, 0]),
        place(buildTanganKiri({ reach: 1.2 }), [2.35, 1.3, 0]),
        place(buildKakiKanan(), [-0.95, -3, 0]),
        place(buildKakiKiri(), [0.95, -3, 0])
    );
    return chica;
}
