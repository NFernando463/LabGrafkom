// bonnie/main.js - halaman model Bonnie.
//   index.html            -> seluruh Bonnie (berputar pelan saat dibiarkan)
//   index.html?part=nama  -> satu bagian saja (untuk presentasi per anggota)
import { place } from "./helpers/MyObject.js";
import { startViewer } from "./helpers/viewer.js";
import { buildBonnie } from "./helpers/model.js";
import { buildBadan } from "./badan/main.js";
import { buildKepala } from "./kepala/main.js";
import { buildWajah } from "./wajah/main.js";
import { buildTanganKanan } from "./tangan_kanan/main.js";
import { buildTanganKiri } from "./tangan_kiri/main.js";
import { buildKakiKanan } from "./kaki_kanan/main.js";
import { buildKakiKiri } from "./kaki_kiri/main.js";
import { buildGitar } from "./gitar/main.js";

// [fungsi pembuat, posisi, jarak kamera]
const PARTS = {
    badan:        [buildBadan,       [0, 0, 0],        12],
    kepala:       [buildKepala,      [0, -0.9, 0],     14],
    wajah:        [buildWajah,       [0, 0, 0],        12],
    tangan_kanan: [buildTanganKanan, [0, 2, 0],        12],
    tangan_kiri:  [buildTanganKiri,  [0, 2, 0],        12],
    kaki_kanan:   [buildKakiKanan,   [0, 2.2, 0],      12],
    kaki_kiri:    [buildKakiKiri,    [0, 2.2, 0],      12],
    gitar:        [buildGitar,       [-1.5, 0, 0],     12],
};

window.addEventListener("load", () => {
    const canvas = document.getElementById("mycanvas");
    const name = new URLSearchParams(location.search).get("part");
    if (name && !(name in PARTS)) { alert(`Bagian "${name}" tidak dikenal.`); return; }

    const [make, pos, dist] = name ? PARTS[name] : [buildBonnie, [0, 0.8, 0], 28];
    startViewer({
        canvas,
        root: place(make(), pos),
        bg: name ? [0.0, 0.5, 0.5] : [0.02, 0.02, 0.025],
        cam: { dist, y: 0.6, fov: 40 },
        light: name ? {} : { fog: 0.006, rim: 0.28 },
        autoRotate: name ? 0 : 0.25,
    });
});
