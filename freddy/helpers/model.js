import { group, place } from "./MyObject.js";
import { buildBadan } from "../badan/badanMain.js";
import { buildKepala } from "../kepala/kepalaMain.js";
import { buildTanganKanan, SING_POSE, SING_MOTION } from "../tangan/tanganKananMain.js";
import { buildTanganKiri, SHOW_POSE, WAVE_MOTION } from "../tangan/tanganKiriMain.js";
import { buildKakiKanan } from "../kaki/kakiKananMain.js";
import { buildKakiKiri } from "../kaki/kakiKiriMain.js";
import { buildMikrofon } from "../mikrofon/mikrofonMain.js";

// mic = false -> Freddy tidak memegang mikrofon (dipakai jumpscare supaya wajah tidak tertutup)
export function buildFreddy({ walk = null, mic = true } = {}) {
    const freddy = buildBadan();
    freddy.childs.push(
        place(buildKepala(), [0, 4.2, 0]),
        place(buildTanganKanan({ ...SING_POSE, motion: SING_MOTION, hold: mic ? buildMikrofon() : null }), [-2.35, 1.7, 0]),
        place(buildTanganKiri({ ...SHOW_POSE, motion: WAVE_MOTION }), [2.35, 1.7, 0]),
        place(buildKakiKanan({ walk }), [-0.95, -3, 0]),
        place(buildKakiKiri({ walk }), [0.95, -3, 0])
    );
    return freddy;
}
