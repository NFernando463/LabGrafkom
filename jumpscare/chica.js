// jumpscare Chica  (jumpscare/chica.js)
// Chica muncul dari gelap, menerjang dari atas-kiri ke arah kamera sampai wajahnya memenuhi layar,
// lalu kepalanya bergetar, paruh bawahnya terbuka lebar dan jengger bulunya ikut berguncang.
// Dipanggil dari stage/main.js. File lain: bonnie.js dan freddy.js (strukturnya sama).
import { group, place } from "../Bonnie/helpers/MyObject.js";
import { buildChica } from "../chica/chica/helpers/model.js";
import { scare } from "../chica/chica/helpers/scare.js";

const HEAD_Y = 3.8;      // tinggi kepala dari akar model Chica
const FACE_Z = 1.1;      // posisi akhir kepala (paruhnya menjorok ke depan, jadi tidak sedekat yang lain)
const START_Z = -9;      // posisi awal (jauh di belakang)
const START_X = -2.6;    // mulai dari sisi kiri
const START_Y = 1.6;     // mulai dari atas, lalu menukik turun
const LUNGE = 0.22;      // lama Chica menerjang (detik), paling cepat dari ketiganya
const CAM_DIST = 7.6;

const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = v => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const easeOut = v => 1 - Math.pow(1 - clamp01(v), 3);
const lerp = (a, b, t) => a + (b - a) * t;

// 0 = Chica normal, 1 = mode jumpscare (paruh terbuka lebar, kepala bergetar)
export const setScare = amount => { scare.amount = amount; };

// kamera diam menghadap wajah, hanya fov dan getarannya yang berubah
export function getJumpscareCamera(time, start) {
    const e = Math.max(0, time - start);
    const p = easeOut(e / LUNGE);
    const getar = smooth((e - LUNGE) / 0.1);
    return {
        x: Math.sin(e * 53) * 0.07 * getar,
        y: 0.0 + Math.cos(e * 47) * 0.05 * getar,
        z: 0,
        scale: 1,
        yaw: 0,
        pitch: 0,
        dist: CAM_DIST,
        fov: lerp(56, 46, p),
    };
}

export function buildJumpscareScene(getTime, start, end) {
    // model Chica digeser ke bawah sebesar tinggi kepala,
    // jadi titik tengah group = pusat kepala (miring dan getar terlihat dari wajah)
    const chica = group([0, -HEAD_Y, 0], [0, 0, 0], [buildChica()]);

    const wrapper = group([0, 0, 0], [0, 0, 0], [chica], {
        animate: () => {
            const e = Math.max(0, getTime() - start);
            const p = easeOut(e / LUNGE);                  // 0 -> 1 saat Chica menerjang
            const getar = smooth((e - LUNGE) / 0.08);      // getaran mulai setelah sampai
            const maju = smooth(e / 2.4) * 0.4;            // pelan-pelan makin dekat

            const x = lerp(START_X, 0, p) + Math.sin(e * 52) * 0.11 * getar;
            const y = lerp(START_Y, 0, p) + Math.sin(e * 61) * 0.07 * getar;     // menukik dari atas
            const z = lerp(START_Z, FACE_Z, p) + maju + Math.sin(e * 47) * 0.1 * getar;
            const yaw = lerp(0.45, 0, p) + Math.sin(e * 39) * 0.06 * getar;
            const roll = 0.06 * getar;

            return { pos: [x, y, z], rot: [0, yaw, roll] };
        },
    });

    const tampil = () => getTime() >= start && getTime() < end;
    return group([0, 0, 0], [0, 0, 0], [wrapper], { visible: tampil });
}
