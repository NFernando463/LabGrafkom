// tangan_kanan/main.js  (bisa dilihat sendiri: index.html?part=tangan_kanan)
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";
import { buildArm } from "../otot/main.js";
const C = B.COLORS;
const sin = Math.sin;

/* ====== TANGAN KANAN (sisi kanan karakter = kiri layar) ======
   ellipsoid: bahu, siku, telapak | hyperboloid 1 sisi: lengan atas & bawah
   elliptic paraboloid: jari-jari | bagian ini yang "memetik" gitar
   Pose dihitung dari posisi gitar: telapak menghadap badan gitar tepat di atas bridge,
   ayunan petik ada di pergelangan sehingga tidak menembus gitar. */
export function buildTanganKanan(pose = {}) {
    // Pose DIHITUNG (inverse kinematics) dari posisi gitar di buildBonnie():
    //   gitar di [-0.5, -1.3, 2.0] rot z 0.7  ->  telapak menghadap badan gitar, jari menjuntai di atas senar.
    // Jarak telapak ke gitar >= 0.19 unit di SEMUA frame animasi petik (sudah disimulasikan).
    // JANGAN ubah angka di bawah satu per satu; kalau gitar digeser, minta dihitung ulang.
    return buildArm(-1, {
        shoulderBack: 0.9,      // pivot lengan dimajukan 0.9 (bola bahu tetap di tempat), cara yang sama dengan tangan kiri
        upper: -0.48, out: 0.34,
        fore: -0.43, inward: 0.84,
        handRotation: 0.64,
        wristBend: -0.30,       // pergelangan menekuk
        wristTwist: 2.28,       // telapak diputar menghadap gitar
        arbitraryWristAxis: true,
        strum: 0.06, sway: 0, swayRate: 6, phase: 0,
        reach: 0, elbowBack: 0, handForward: 0, forearmForward: 0, upperForward: -0.35,
        // upperThickness dibiarkan 1 (default) supaya lengan atas kanan sama tebal dengan kiri
        ...pose
    });
}
