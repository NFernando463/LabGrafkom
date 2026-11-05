/* show.js - koreografi "Freddy tampil di panggung" (idle animation)

   Semua bagian (kepala, rahang, tangan, badan, kaki) membaca waktu dari sini, jadi
   gerakannya selalu sinkron seperti animatronik di panggung:
     - 1 siklus pertunjukan = 16 ketukan (LOOP), lalu mengulang mulus
     - ketukan 0-12  : "bernyanyi"  -> mic di depan mulut, rahang buka-tutup, kepala menyapu penonton
     - ketukan 12-14 : jeda          -> mic turun sedikit, tangan satunya menyapa penonton
     - ketukan 14-16 : siap lagi     -> mic naik lagi ke mulut
   Ubah BPM untuk mempercepat / memperlambat seluruh pertunjukan. */

export const BPM = 104;
export const BEAT = 60 / BPM;      // detik per ketukan
export const LOOP = 16;            // ketukan per siklus

export const beat = t => t / BEAT;
export const wrap = b => ((b % LOOP) + LOOP) % LOOP;
export const smooth = x => x * x * (3 - 2 * x);

// keyframe [[ketukan, nilai], ...] (ketukan pertama harus 0). Diulang tiap LOOP ketukan.
// Antar-keyframe memakai smoothstep: bergerak - tahan - bergerak, seperti servo animatronik.
export function track(keys, t) {
    const b = wrap(beat(t));
    for (let i = 0; i < keys.length; i++) {
        const [b0, v0] = keys[i];
        const [b1, v1] = i + 1 < keys.length ? keys[i + 1] : [LOOP, keys[0][1]];
        if (b >= b0 && b < b1) return v0 + (v1 - v0) * smooth((b - b0) / (b1 - b0));
    }
    return keys[0][1];
}

// denyut ketukan: 1 tepat di ketukan, 0 di tengah-tengah (halus)
export const pulse = t => 0.5 + 0.5 * Math.cos(2 * Math.PI * beat(t));
// hentakan ketukan (lebih tajam): cepat naik di ketukan, lalu turun
export const accent = t => Math.pow(pulse(t), 3);

/* ---------- lip-sync ---------- */
// 32 langkah (1 langkah = setengah ketukan). Angka = seberapa lebar mulut pada suku kata itu, 0 = diam.
const SYL = [
    1, .7, .9, .9, 1, 0, .8, 1,      // ketukan 0-4
    1, .6, .9, 1, .7, 0, 1, .9,      // ketukan 4-8
    1, 1, .6, .9, 1, 0, .8, 1,       // ketukan 8-12
    0, 0, 0, 0, .9, 1, .7, 0,        // ketukan 12-16 (jeda, lalu aba-aba pendek)
];

// 0..1 : seberapa terbuka rahang saat ini. Buka cepat, tutup lebih lambat (khas rahang animatronik).
export function mouth(t) {
    const step = wrap(beat(t)) * 2;
    const i = Math.min(SYL.length - 1, Math.floor(step)), p = step - i;
    const a = SYL[i];
    if (!a) return 0;
    const shape = p < 0.3 ? 0.1 + 0.9 * smooth(p / 0.3) : 1 - 0.9 * smooth((p - 0.3) / 0.7);
    return a * shape;
}

/* ---------- keyframe gerakan ---------- */
// arah pandang kepala (rad). + = menoleh ke kanan layar. Menyapu penonton kiri -> kanan -> tengah.
export const HEAD_YAW = [[0, -0.08], [3, 0.12], [4, 0.14], [7, -0.3], [8, -0.32], [11, 0.34], [12, 0.34], [14, 0.0], [16, -0.08]];
// mendongak (-) / menunduk (+)
export const HEAD_PITCH = [[0, 0.02], [4, -0.04], [8, -0.08], [12, 0.06], [14, 0.1], [16, 0.02]];
// kepala miring
export const HEAD_ROLL = [[0, 0], [4, -0.05], [8, 0.06], [12, -0.04], [16, 0]];

// 1 = mic tepat di depan mulut, 0 = mic diturunkan ke dada
export const MIC_LIFT = [[0, 1], [11.5, 1], [12.5, 0.35], [14, 0.35], [15.5, 1]];
// tangan bebas menyapa penonton: 0 = santai, 1 = terangkat
export const WAVE = [[0, 0], [2, 0], [3, 0.55], [4, 0.1], [5.5, 0.5], [6.5, 0], [10, 0], [12, 1], [14, 1], [15.5, 0]];
