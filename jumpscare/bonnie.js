// jumpscare Bonnie  (jumpscare/bonnie.js)
// Bonnie muncul dari gelap, lari ke arah kamera sampai wajahnya memenuhi layar,
// lalu kepalanya bergetar dan mulutnya terbuka lebar.
// Dipanggil dari stage/main.js. Dua file lain: freddy.js dan chica.js (strukturnya sama).
import { group, place } from "../Bonnie/helpers/MyObject.js";
import { buildBonnie } from "../Bonnie/helpers/model.js";
import { scare } from "../Bonnie/helpers/scare.js";

const HEAD_Y = 4.2;      // tinggi kepala dari akar model Bonnie
const FACE_Z = 0.8;      // posisi akhir kepala, sedikit lebih jauh dari kamera
const START_Z = -9;      // posisi awal (jauh di belakang)
const START_X = -3;      // mulai dari sisi kiri
const LUNGE = 0.26;      // lama Bonnie berlari ke depan (detik)
const CAM_DIST = 10.2;
const REFERENCE_CAM_DIST = 8.2;

const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = v => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const easeOut = v => 1 - Math.pow(1 - clamp01(v), 3);
const lerp = (a, b, t) => a + (b - a) * t;

// 0 = Bonnie normal, 1 = mode jumpscare (mulut terbuka lebar, kepala & telinga bergetar)
export const setScare = amount => { scare.amount = amount; };

// kamera diam menghadap wajah, hanya fov dan getarannya yang berubah
export function getJumpscareCamera(time, start) {
    const e = Math.max(0, time - start);
    const p = easeOut(e / LUNGE);
    const getar = smooth((e - LUNGE) / 0.1);
    return {
        x: Math.sin(e * 53) * 0.07 * getar,
        y: 0.6 + Math.cos(e * 47) * 0.05 * getar,
        z: 0,
        scale: 1,
        yaw: 0,
        pitch: 0,
        dist: CAM_DIST,
        fov: lerp(52, 42, p),
    };
}

export function buildJumpscareScene(getTime, start, end) {
    // model Bonnie digeser ke bawah sebesar tinggi kepala,
    // jadi titik tengah group = pusat kepala (miring dan getar terlihat dari wajah)
    const bonnie = place(buildBonnie({ guitar: false }), [0, -HEAD_Y, 0], [0, 0, 0], 1);

    const wrapper = group([0, 0, 0], [0, 0, 0], [bonnie], {
        animate: () => {
            const e = Math.max(0, getTime() - start);
            const p = easeOut(e / LUNGE);                  // 0 -> 1 saat Bonnie berlari
            const getar = smooth((e - LUNGE) / 0.08);      // getaran mulai setelah sampai
            const maju = smooth(e / 2.4) * 0.45;           // pelan-pelan makin dekat

            const x = lerp(START_X, 0, p) + Math.sin(e * 52) * 0.11 * getar;
            const y = Math.sin(e * 61) * 0.07 * getar;
            const baseZ = lerp(START_Z, FACE_Z, p) + maju + Math.sin(e * 47) * 0.1 * getar;
            const angle = lerp(0.55, 0, p) + Math.sin(e * 39) * 0.06 * getar + 0.05 * getar;

            const referenceScale = 1 + 0.25 * p;
            const scale = 1 + 0.5 * p;
            const frameScale = scale / referenceScale;
            const z = CAM_DIST - scale * (REFERENCE_CAM_DIST - baseZ);
            return { pos: [x * frameScale, y * frameScale, z], rot: { axis: [0.12, 1, 0.08], angle }, scale };
        },
    });

    const tampil = () => getTime() >= start && getTime() < end;
    return group([0, 0, 0], [0, 0, 0], [wrapper], { visible: tampil });
}
