// wajah/main.js (bisa dilihat sendiri: index.html?part=wajah)
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";
import { scare } from "../helpers/scare.js";

const C = B.COLORS;

/* ====== WAJAH (disesuaikan dengan foto) ======
   Atas (diam)  : moncong 2 bantalan abu-abu, hidung, mata dengan cincin hitam dan kelopak.
   Rahang bawah : group berengsel besar & lebar (ungu) dengan gigi bawah kecil, bisa membuka.
   Bentuk kuadrik: ellipsoid dan elliptic cone (gigi atas). */

// seberapa lebar mulut terbuka (radian). Di foto mulut sedikit terbuka, jadi nilai diam = 0.12.
export function mouthOpen(t) {
    const cycle = (t % 5) / 5;
    let normal = 0.14;
    if (cycle <= 0.72) {
        const s = Math.sin(cycle / 0.72 * Math.PI * 2.5);
        normal = 0.14 + 0.38 * Math.pow(Math.max(0, s), 0.8);
    }
    // saat jumpscare mulut terbuka lebar dan bergetar
    const scream = 1.2 + 0.07 * Math.sin(t * 46) + 0.03 * Math.sin(t * 71);
    return normal + (scream - normal) * scare.amount;
}

// Animasi mata: nilai 0 = terbuka, nilai 1 = tertutup saat berkedip.
function blink(t) {
    const c = t % 4.2;
    const normal = c < 0.18 ? Math.sin(c / 0.18 * Math.PI) : 0;
    // saat jumpscare tidak berkedip, mata melotot
    return normal * (1 - scare.amount) - 0.55 * scare.amount;
}

export function buildWajah() {
    const kids = [];
    const IRIS = [0.62, 0.26, 0.32];
    const PIVOT = [0, -0.95, 0.3];                       // engsel rahang (belakang-bawah moncong)

    /* ---------- BAGIAN ATAS (diam) ---------- */
    // moncong: dua bantalan abu-abu lebar dengan garis tengah, seperti di foto
    [-1, 1].forEach(s => {
        kids.push(node(B.generateEllipsoidSurface({ a: 0.64, b: 0.5, c: 0.6, color: C.MUZZLE }), [s * 0.5, -0.45, 1.14]));
    });
    kids.push(node(B.generateEllipsoidSurface({ a: 0.5, b: 0.42, c: 0.5, color: C.MUZZLE }), [0, -0.3, 1.2]));    // jembatan hidung
    // wajah bawah: ellipsoid lebar yang menyambung tengkorak bulat ke rahang (siluet mengalir)
    kids.push(node(B.generateEllipsoidSurface({ a: 1.58, b: 0.95, c: 1.0 }), [0, -0.95, -0.08]));
    // hidung hitam lebar di atas moncong
    kids.push(node(B.generateEllipsoidSurface({ a: 0.42, b: 0.17, c: 0.2, color: C.BLACK }), [0, 0.02, 1.64]));

    // rongga mulut gelap (statis) terlihat di celah antara moncong & rahang
    kids.push(node(B.generateEllipsoidSurface({ a: 1.05, b: 0.4, c: 0.55, color: C.BLACK }), [0, -1.1, 0.7]));
    // gigi atas: elliptic cone kecil, ujung ke bawah (tersembunyi di balik bibir moncong)
    for (let i = 0; i < 6; i++) {
        const x = (i - 2.5) * 0.24;
        const z = 0.95 + 0.3 * Math.sqrt(Math.max(0, 1 - (x / 1.2) ** 2));
        kids.push(node(B.generateEllipticCone({ a: 0.09, b: 0.07, height: 0.16, color: C.WHITE }), [x, -0.97, z]));
    }

    /* ---------- MATA ---------- */
    [-1, 1].forEach(s => {
        const ex = s * 0.56, ey = 0.5;
        kids.push(node(B.generateEllipsoidSurface({ a: 0.44, b: 0.41, c: 0.2, color: C.BLACK }), [ex, ey, 1.36]));            // cincin hitam rongga mata
        kids.push(node(B.generateEllipsoidSurface({ a: 0.34, b: 0.31, c: 0.22, color: C.WHITE }), [ex, ey - 0.02, 1.44]));    // bola mata
        kids.push(node(B.generateEllipsoidSurface({ a: 0.15, b: 0.15, c: 0.1, color: IRIS }), [ex - s * 0.04, ey - 0.04, 1.63])); // iris merah-cokelat
        kids.push(node(B.generateEllipsoidSurface({ a: 0.06, b: 0.06, c: 0.05, color: C.BLACK }), [ex - s * 0.04, ey - 0.04, 1.71])); // pupil
        // kelopak atas ungu menutupi sebagian mata (sayu), turun saat berkedip
        kids.push(node(B.generateEllipsoidSurface({ a: 0.42, b: 0.2, c: 0.3, color: C.PURPLE }), [ex, ey + 0.27, 1.43], [0, 0, s * 0.03], {
            animate: t => ({ pos: [0, -0.32 * blink(t), 0.03 * blink(t)] })
        }));
    });

    /* ---------- RAHANG BAWAH (berengsel) ---------- */
    // koordinat lokal = koordinat kepala - PIVOT
    const L = (x, y, z) => [x - PIVOT[0], y - PIVOT[1], z - PIVOT[2]];
    const jaw = [];
    // rahang: ellipsoid besar & lebar (hampir selebar kepala), bibir depan di sekitar y=-1.23
    jaw.push(node(B.generateEllipsoidSurface({ a: 1.4, b: 0.6, c: 1.0 }), L(0, -1.47, 0.55)));
    // bagian dalam mulut (merah gelap), ikut turun bersama rahang
    jaw.push(node(B.generateEllipsoidSurface({ a: 1.15, b: 0.34, c: 0.7, color: [0.16, 0.015, 0.04] }), L(0, -1.2, 0.6)));
    // lantai mulut hitam
    jaw.push(node(B.generateEllipsoidSurface({ a: 1.1, b: 0.1, c: 0.6, color: C.BLACK }), L(0, -1.08, 0.68)));
    // gigi bawah: ellipsoid kecil putih mengikuti lengkung bibir rahang
    for (let i = 0; i < 8; i++) {
        const x = (i - 3.5) * 0.24;
        const z = 0.55 + 1.0 * Math.sqrt(Math.max(0.02, 0.82 - (x / 1.4) ** 2)) - 0.1;
        jaw.push(node(B.generateEllipsoidSurface({ a: 0.085, b: 0.11, c: 0.07, color: C.WHITE }), L(x, -1.12, z)));
    }
    kids.push(group(PIVOT, [0, 0, 0], jaw, {
    // Animasi mulut: engsel rahang membuka-menutup seolah bernyanyi mengikuti musik.
        animate: t => {
            const o = mouthOpen(t);
            return { rot: [o, 0, 0], pos: [0, -0.1 * o, 0.06 * o] };
        }
    }));

    return group([0, 0, 0], [0, 0, 0], kids);
}
