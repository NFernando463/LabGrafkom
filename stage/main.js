// stage/main.js - Show Stage + Dining Area ala Five Nights at Freddy's 1, dengan Freddy, Chica & Bonnie sebagai pemeran.
import { group, node, place } from "../bonnie/helpers/MyObject.js";
import { startViewer } from "../bonnie/helpers/viewer.js";
import { generateEllipsoidSurface, generateEllipticCone } from "../bonnie/helpers/builders.js";
import { buildBonnie } from "../bonnie/helpers/model.js";
import { buildFreddy } from "../freddy fnaf/helpers/model.js";
import { buildChica } from "../chica/chica/helpers/model.js";
import * as jumpscareBonnie from "../jumpscare/bonnie.js";
import * as jumpscareFreddy from "../jumpscare/freddy.js";
import * as jumpscareChica from "../jumpscare/chica.js";

/* ============================ UKURAN (1 unit ≈ 0,5 ft) ============================
   Hasil pengukuran bounding box (tinggi telapak kaki di bawah titik akar model):
   Bonnie 7,29 | Freddy 7,30 | Chica 7,22.  Ketiganya diskalakan 0,5  ->  tinggi sekitar 7,5,
   sekitar 65% tinggi dinding (11,8), mirip proporsi di FNAF 1. */
const S = 0.5;
const ROOM_Y_OFFSET = 4.2;
const FLOOR_Y = -0.8;            // lantai Dining Area
const STAGE_Y = 0;               // permukaan panggung berada tepat di Y=0
const FLOOR_LOCAL_Y = FLOOR_Y - ROOM_Y_OFFSET;
const STAGE_LOCAL_Y = STAGE_Y - ROOM_Y_OFFSET;
const WALL_Z = -5.4;              // sedikit lebih dalam dari panggung semula
const HALF = 24;                 // setengah lebar ruangan (melebihi bingkai kamera, karakter masuk dari luar layar)

const COLORS = {
    wall: [0.27, 0.23, 0.33], wallLow: [0.15, 0.12, 0.2], wallTop: [0.12, 0.1, 0.17], red: [0.5, 0.07, 0.11],
    checkLight: [0.74, 0.72, 0.76], checkDark: [0.05, 0.05, 0.07],
    stage: [0.2, 0.12, 0.18], stageTop: [0.2, 0.13, 0.19], stageLine: [0.12, 0.07, 0.11],
    floorDark: [0.04, 0.04, 0.06], floorLight: [0.62, 0.6, 0.64],
    star: [0.72, 0.58, 0.36], cloud: [0.78, 0.6, 0.72], cloudEdge: [0.26, 0.13, 0.26],
    curtain: [0.27, 0.07, 0.34], curtainLight: [0.43, 0.13, 0.5], curtainDark: [0.12, 0.03, 0.18],
    gold: [0.72, 0.5, 0.2], marquee: [0.09, 0.04, 0.12], bulb: [1.0, 0.72, 0.34],
    cloth: [0.78, 0.76, 0.8], clothRed: [0.55, 0.1, 0.17], tableTop: [0.7, 0.68, 0.74],
    metal: [0.2, 0.2, 0.25], lampGlass: [1.0, 0.86, 0.55],
    flags: [[0.55, 0.12, 0.45], [0.2, 0.45, 0.62], [0.82, 0.62, 0.18], [0.35, 0.2, 0.55], [0.7, 0.14, 0.25]],
    hats: [[0.7, 0.16, 0.3], [0.2, 0.45, 0.7], [0.85, 0.68, 0.2], [0.3, 0.6, 0.4]],
};


/* ============================== PEMERAN & POSISI ==============================
   Posisi di panggung dilihat dari penonton:  Bonnie di KIRI, Freddy di TENGAH, Chica di KANAN.
   slot  : posisi x karakter saat berdiri di panggung
   z     : kedalaman berdiri (Chica agak ke belakang karena piring cupcake-nya menjorok jauh ke depan)
   foot  : jarak telapak kaki ke titik akar model (supaya telapak pas menyentuh panggung)
   lane  : (hanya Bonnie) jalur belakang. Bonnie masuk paling akhir tapi berdiri paling kiri,
           jadi ia lewat di belakang Chica dan Freddy, lalu maju ke posisinya.                  */
const BACK_LANE_Z = -4.8;
const CAST = {
    freddy: { label: "Freddy", slot: 0,    z: -2.0, foot: 7.30, jumpscare: jumpscareFreddy, phase: 0.0 },
    chica:  { label: "Chica",  slot: 5.6,  z: -2.4, foot: 7.22, jumpscare: jumpscareChica,  phase: 1.7 },
    bonnie: { label: "Bonnie", slot: -5.6, z: -2.0, foot: 7.29, jumpscare: jumpscareBonnie, phase: 3.1, lane: BACK_LANE_Z },
};
const ENTRY_ORDER = ["freddy", "chica", "bonnie"];     // urutan masuk saat ending (satu per satu)
const SCARE_ORDER = ["freddy", "chica", "bonnie"];     // urutan tampil solo (masuk -> jumpscare -> keluar)
const NAMES = Object.keys(CAST);

/* ===================== TIMELINE PERTUNJUKAN (detik) =====================
   0 - 6,5      tirai terbuka, ketiganya bermain bersama di panggung (band pembuka)
   6,5 - 8,2    tirai menutup; ketiganya pindah ke sisi kanan di balik tirai; lalu tirai terbuka lagi
   solo         tampil SATU per satu (Freddy -> Chica -> Bonnie), tidak pernah bertiga di panggung:
                masuk dari kanan -> berdiri di tengah -> kamera mendekat -> jumpscare -> keluar ke kiri
   ending       ketiganya masuk dari kanan satu per satu ke posisinya (Bonnie kiri, Freddy tengah, Chica kanan),
                lalu band bertiga lagi seperti di awal, terakhir tirai menutup                              */
const BAND_LENGTH = 6.5;                      // lama band (pembuka dan penutup)
const T_BAND = [0, BAND_LENGTH];
const T_FIRST_CLOSE = [T_BAND[1], T_BAND[1] + 1.7];
const T_MOVE = [T_BAND[1] + 1.8, T_BAND[1] + 3.1];     // pindah ke kanan saat tirai sudah tertutup
const T_REOPEN = [T_BAND[1] + 3.7, T_BAND[1] + 5.4];
const X_PARK = 13;                            // tempat menunggu di balik dinding kanan (tidak terlihat)
const SOLO_X = 0;                             // posisi berdiri saat tampil sendirian (tengah panggung)
const WALK_SPEED = 3.0;                       // kecepatan jalan saat masuk (unit/detik)
const WALK_YAW = -Math.PI / 2;                // yaw -90° = menghadap sumbu -x (kiri layar)
const DECEL_K = 1 / (0.75 + 0.25 / 2);        // faktor kecepatan fungsi decel() (lihat di bawah)

const SCARE_CLOSEUP = 1.0;                    // kamera mendekat ke karakter
const SCARE_FLICKER = 0.7;                    // lampu berkedip
const SCARE_BLACKOUT = 0.3;                   // lampu mati sesaat sebelum jumpscare
const SCARE_LENGTH = 3.36;                    // lama jumpscare
const SCARE_RECOVER = 1.54;                   // kamera kembali ke panggung + bintik CCTV

let timelineTime = 0;   // waktu animasi (detik), diisi tiap frame oleh onFrame
let clockTime = 0;      // waktu jam dinding (sama dengan waktu animasi kaki/badan), dipakai untuk goyangan badan

const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = v => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const ramp = (t, a, b) => smooth((t - a) / (b - a));
const window_ = (t, a, b, c, d) => ramp(t, a, b) * (1 - ramp(t, c, d));

// kecepatan tetap lalu melambat sampai berhenti di 25% terakhir (u: 0..1 -> jarak 0..1)
function decel(u) {
    u = clamp01(u);
    const u0 = 0.75, c = 1 / (u0 + (1 - u0) / 2), k = u - u0;
    return u < u0 ? c * u : c * (u0 + k - k * k / (2 * (1 - u0)));
}

// ---- jalan keluar ke kiri: makin lama makin cepat ----
const EXIT_ACCEL = 1.5, EXIT_VMAX = 3.2, X_GONE = -10.6;
const exitDistance = tau => {                          // jarak yang sudah ditempuh sejak mulai jalan
    if (tau <= 0) return 0;
    const tA = EXIT_VMAX / EXIT_ACCEL;
    return tau < tA ? 0.5 * EXIT_ACCEL * tau * tau : 0.5 * EXIT_VMAX * tA + EXIT_VMAX * (tau - tA);
};
const exitTime = dist => {                              // kebalikan exitDistance
    const tA = EXIT_VMAX / EXIT_ACCEL, dA = 0.5 * EXIT_VMAX * tA;
    return dist < dA ? Math.sqrt(2 * dist / EXIT_ACCEL) : tA + (dist - dA) / EXIT_VMAX;
};

// ---- jadwal SOLO: tiap karakter masuk -> berdiri -> jumpscare -> keluar, baru karakter berikutnya masuk ----
const ENTRY = {}, SCARE = {}, EXIT = {};
{
    let cursor = T_REOPEN[1] - 0.3;
    SCARE_ORDER.forEach(name => {
        const dur = (X_PARK - SOLO_X) * DECEL_K / WALK_SPEED;
        ENTRY[name] = [cursor, cursor + dur];

        const c0 = ENTRY[name][1] + 0.9;       // jeda sebentar sebelum kamera mendekat
        const T = c0 + SCARE_CLOSEUP + SCARE_FLICKER + SCARE_BLACKOUT;
        const recover = [T + SCARE_LENGTH, T + SCARE_LENGTH + SCARE_RECOVER];
        SCARE[name] = { closeup: [c0, c0 + SCARE_CLOSEUP], T, recover };

        const start = recover[1] + 0.3;
        EXIT[name] = [start, start + exitTime(SOLO_X - X_GONE)];

        // karakter berikutnya baru mulai berjalan setelah karakter ini benar-benar hilang dari layar
        cursor = EXIT[name][0] + 4.2;
    });
}

// ---- jadwal ENDING: masuk satu per satu ke posisi masing-masing, karakter berikutnya mulai saat yang sebelumnya hampir berhenti ----
const FINAL_ENTRY = {};
{
    let cursor = EXIT[SCARE_ORDER[SCARE_ORDER.length - 1]][0] + 4.2;
    ENTRY_ORDER.forEach(name => {
        const dur = (X_PARK - CAST[name].slot) * DECEL_K / WALK_SPEED;
        FINAL_ENTRY[name] = [cursor, cursor + dur];
        cursor += dur - 0.8;
    });
}
const T_ALL_READY = Math.max(...NAMES.map(n => FINAL_ENTRY[n][1]));
const T_BAND2 = [T_ALL_READY + 0.4, T_ALL_READY + 0.4 + BAND_LENGTH];   // band bertiga lagi
const T_FINAL_CLOSE = [T_BAND2[1] + 0.2, T_BAND2[1] + 2.0];
const DURATION = T_FINAL_CLOSE[1] + 0.3;

// ---- gerakan tiap karakter ----
const bandAmount = t => Math.max(                       // 1 saat band bermain (band pembuka dan band penutup)
    window_(t, T_BAND[0] - 0.1, T_BAND[0] + 0.6, T_BAND[1] - 0.6, T_BAND[1]),
    window_(t, T_BAND2[0] - 0.1, T_BAND2[0] + 0.6, T_BAND2[1] - 0.6, T_BAND2[1])
);
const strumAmount = t => 0.06 * bandAmount(t);           // petikan gitar Bonnie
const xPlay = (s, ph) => Math.sin(s * 0.7 + ph) * 0.12;
const yawPlay = (s, ph) => Math.sin(s * 0.55 + ph) * 0.035;

const walkAmount = (name, t) => {
    const [e0, e1] = ENTRY[name], [x0, x1] = EXIT[name], [f0, f1] = FINAL_ENTRY[name];
    return Math.max(
        window_(t, T_MOVE[0], T_MOVE[0] + 0.2, T_MOVE[1] - 0.3, T_MOVE[1]),
        window_(t, e0 - 0.2, e0 + 0.2, e1 - 0.6, e1),
        window_(t, x0 - 0.2, x0 + 0.35, x1 - 0.8, x1),
        window_(t, f0 - 0.2, f0 + 0.2, f1 - 0.6, f1)
    );
};

function actorAt(name, t) {
    const c = CAST[name];
    const laneZ = c.lane ?? c.z;
    const park = { x: X_PARK, yaw: WALK_YAW, z: laneZ };
    const [e0, e1] = ENTRY[name], [x0, x1] = EXIT[name], [f0, f1] = FINAL_ENTRY[name];

    // band pembuka: berdiri di posisinya sambil bergoyang pelan, sampai tirai benar-benar tertutup
    if (t < T_MOVE[0]) return { x: c.slot + xPlay(t, c.phase), yaw: yawPlay(t, c.phase), z: c.z };

    // setelah tirai tertutup, pindah ke sisi kanan (tidak terlihat penonton)
    if (t < T_MOVE[1]) {
        const geser = ramp(t, T_MOVE[0], T_MOVE[1]);
        return { x: (c.slot + xPlay(T_MOVE[0], c.phase)) + (X_PARK - c.slot) * geser, yaw: -WALK_YAW * geser, z: c.z };
    }

    // menunggu giliran solo di balik dinding kanan
    if (t < e0) return park;

    // SOLO: masuk dari kanan, berhenti di tengah, lalu menoleh ke penonton
    if (t < e1) {
        const x = X_PARK + (SOLO_X - X_PARK) * decel((t - e0) / (e1 - e0));
        return { x, yaw: WALK_YAW * (1 - ramp(t, e1 - 1.0, e1)), z: c.z };
    }

    // SOLO: berdiri menghadap penonton (kamera close-up dan jumpscare terjadi di sini)
    if (t < x0 - 0.35) return { x: SOLO_X, yaw: 0, z: c.z };

    // SOLO: keluar ke kiri
    if (t < x1) {
        const turnOut = ramp(t, x0 - 0.35, x0 + 0.55);
        return { x: SOLO_X - exitDistance(t - x0), yaw: WALK_YAW * turnOut, z: c.z };
    }

    // sudah keluar; menunggu giliran masuk lagi untuk ending (di balik dinding kanan)
    if (t < f0) return park;

    // ENDING: masuk dari kanan, berhenti di posisinya, lalu menoleh ke penonton
    if (t < f1) {
        const x = X_PARK + (c.slot - X_PARK) * decel((t - f0) / (f1 - f0));
        // jalur belakang (Bonnie): tetap di belakang sampai melewati Freddy (x = -1,5), lalu maju pelan-pelan ke posisinya
        const z = c.lane === undefined ? c.z : c.lane + (c.z - c.lane) * smooth((-1.5 - x) / (-1.5 - c.slot));
        return { x, yaw: WALK_YAW * (1 - ramp(t, f1 - 1.0, f1)), z };
    }

    // band penutup: berdiri di posisinya sambil bergoyang pelan
    return { x: c.slot + xPlay(t, c.phase), yaw: yawPlay(t, c.phase), z: c.z };
}

function curtainOpenAmount(t) {
    if (t < T_FIRST_CLOSE[0]) return 1;
    if (t < T_FIRST_CLOSE[1]) return 1 - ramp(t, T_FIRST_CLOSE[0], T_FIRST_CLOSE[1]);
    if (t < T_REOPEN[0]) return 0;
    if (t < T_REOPEN[1]) return ramp(t, T_REOPEN[0], T_REOPEN[1]);
    if (t < T_FINAL_CLOSE[0]) return 1;
    return 1 - ramp(t, T_FINAL_CLOSE[0], T_FINAL_CLOSE[1]);
}

// karakter yang sedang jumpscare pada waktu t (null kalau tidak ada)
function activeScare(t) {
    for (const name of SCARE_ORDER) if (t >= SCARE[name].T && t < SCARE[name].recover[0]) return name;
    return null;
}
// karakter yang sedang dalam fase "kamera mendekat / lampu berkedip" sebelum jumpscare
function pendingScare(t) {
    for (const name of SCARE_ORDER) if (t >= SCARE[name].closeup[0] && t < SCARE[name].T) return name;
    return null;
}

/* ================================ MESH ================================ */
const createMesh = () => ({ vertices: [], faces: [] });

function addQuad(mesh, corners, color, normal) {
    const start = mesh.vertices.length / 9;
    corners.forEach(([x, y, z]) => mesh.vertices.push(x, y, z, ...color, ...normal));
    mesh.faces.push(start, start + 1, start + 2, start, start + 2, start + 3);
}

function addBox(mesh, [x, y, z], [w, h, d], color) {
    const x0 = x - w / 2, x1 = x + w / 2, y0 = y - h / 2, y1 = y + h / 2, z0 = z - d / 2, z1 = z + d / 2;
    addQuad(mesh, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], color, [0, 0, 1]);
    addQuad(mesh, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], color, [0, 0, -1]);
    addQuad(mesh, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], color, [1, 0, 0]);
    addQuad(mesh, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], color, [-1, 0, 0]);
    addQuad(mesh, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], color, [0, 1, 0]);
    addQuad(mesh, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], color, [0, -1, 0]);
}

// ubin datar menghadap atas (lantai) / menghadap depan (dinding)
const addFloorTile = (mesh, x0, x1, z0, z1, y, color) =>
    addQuad(mesh, [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], color, [0, 1, 0]);
const addWallTile = (mesh, x0, x1, y0, y1, z, color) =>
    addQuad(mesh, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], color, [0, 0, 1]);

// gabungkan mesh lain (hanya digeser; flip = balik sumbu y, untuk kerucut topi pesta)
function mergeMesh(dst, src, [dx, dy, dz], flip = false) {
    const start = dst.vertices.length / 9;
    for (let i = 0; i < src.vertices.length; i += 9) {
        const v = src.vertices, s = flip ? -1 : 1;
        dst.vertices.push(v[i] + dx, v[i + 1] * s + dy, v[i + 2] + dz, v[i + 3], v[i + 4], v[i + 5], v[i + 6], v[i + 7] * s, v[i + 8]);
    }
    src.faces.forEach(f => dst.faces.push(f + start));
}

function addStar(mesh, x, y, z, radius, color) {
    const start = mesh.vertices.length / 9, pts = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 === 0 ? radius : radius * 0.43;
        pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r, z]);
    }
    for (let i = 0; i < 10; i++) {
        [[x, y, z], pts[i], pts[(i + 1) % 10]].forEach(p => mesh.vertices.push(...p, ...color, 0, 0, 1));
        mesh.faces.push(start + i * 3, start + i * 3 + 1, start + i * 3 + 2);
    }
}

function addCloud(scene, x, y, z, scale = 1) {
    const puffs = [[-0.92, -0.03, 0.48], [-0.47, 0.31, 0.66], [0.12, 0.43, 0.74], [0.72, 0.23, 0.61], [0.91, -0.18, 0.48], [0.18, -0.28, 0.57], [-0.48, -0.26, 0.54]];
    puffs.forEach(([px, py, r]) => {
        const size = r * scale;
        scene.childs.push(node(generateEllipsoidSurface({ a: size, b: size, c: 0.16, stacks: 10, slices: 16, color: COLORS.cloudEdge }), [x + px * scale, y + py * scale, z]));
        scene.childs.push(node(generateEllipsoidSurface({ a: size * 0.87, b: size * 0.87, c: 0.18, stacks: 10, slices: 16, color: COLORS.cloud }), [x + px * scale - 0.035, y + py * scale + 0.035, z + 0.22]));
    });
}

/* ================================ RUANGAN ================================ */
function buildRoom() {
    const scene = group();

    // dinding belakang abu-mauve + wainscot gelap
    const wall = createMesh();
    addBox(wall, [0, 0.9, WALL_Z - 0.24], [HALF * 2, 11.8, 0.48], COLORS.wall);
    addBox(wall, [0, -3.2, WALL_Z + 0.05], [HALF * 2, 3.6, 0.1], COLORS.wallLow);
    // bagian atas dinding lebih gelap (cahaya tidak sampai ke langit-langit), seperti di kamera Show Stage
    addBox(wall, [0, 11.2, WALL_Z - 0.24], [HALF * 2, 8.8, 0.48], COLORS.wallTop);
    addBox(wall, [0, 6.95, WALL_Z + 0.12], [HALF * 2, 0.55, 0.34], COLORS.marquee);
    addBox(wall, [0, 6.62, WALL_Z + 0.22], [HALF * 2, 0.08, 0.1], COLORS.gold);
    // strip hitam-putih berkotak, dibingkai garis merah (ciri khas dinding FNAF 1)
    const SY = -0.5, CH = 0.5, CW = 0.5, zS = WALL_Z + 0.13;
    addBox(wall, [0, SY, WALL_Z + 0.06], [HALF * 2, CH * 2, 0.12], COLORS.checkDark);
    for (let i = 0; i < (HALF * 2) / CW; i++)
        for (let r = 0; r < 2; r++)
            if ((i + r) % 2 === 0) addWallTile(wall, -HALF + i * CW, -HALF + (i + 1) * CW, SY - CH + r * CH, SY - CH + (r + 1) * CH, zS, COLORS.checkLight);
    addBox(wall, [0, SY + CH + 0.06, WALL_Z + 0.08], [HALF * 2, 0.12, 0.16], COLORS.red);
    addBox(wall, [0, SY - CH - 0.06, WALL_Z + 0.08], [HALF * 2, 0.12, 0.16], COLORS.red);

    // dinding di kiri & kanan bukaan tirai (di tepi depan panggung)
    const FACE_Z = 1.2;      // posisi muka dinding
    const OPEN_X = 8.75;     // lebar bukaan tirai (dari tengah), sedikit menutupi ujung tirai yang tertutup
    const TOP_Y = 7.3;       // tinggi langit-langit
    const ZEND = 21;         // ujung belakang ruang makan
    const wallY = (STAGE_LOCAL_Y + TOP_Y) / 2;
    const wallH = TOP_Y - STAGE_LOCAL_Y;

    // kotak tipis yang menghadap sumbu x, dipakai untuk strip kotak-kotak di dinding samping
    const addSideTile = (mesh, x, y0, y1, za, zb, nx, color) => {
        if (nx > 0) addQuad(mesh, [[x, y0, zb], [x, y0, za], [x, y1, za], [x, y1, zb]], color, [nx, 0, 0]);
        else addQuad(mesh, [[x, y0, za], [x, y0, zb], [x, y1, zb], [x, y1, za]], color, [nx, 0, 0]);
    };

    [-1, 1].forEach(sg => {
        // --- dinding depan kiri / kanan bukaan ---
        const w = HALF - OPEN_X;
        const cx = sg * (OPEN_X + HALF) / 2;
        addBox(wall, [cx, wallY, FACE_Z - 0.25], [w, wallH, 0.5], COLORS.wall);
        addBox(wall, [cx, (STAGE_LOCAL_Y - 1.4) / 2, FACE_Z + 0.04], [w, -1.4 - STAGE_LOCAL_Y, 0.1], COLORS.wallLow);
        addBox(wall, [cx, 6.55, FACE_Z + 0.03], [w, 1.5, 0.06], COLORS.wallTop);

        // strip hitam-putih (sama seperti dinding belakang)
        addBox(wall, [cx, SY, FACE_Z + 0.06], [w, CH * 2, 0.12], COLORS.checkDark);
        const kiri = sg < 0 ? -HALF : OPEN_X;
        const kanan = sg < 0 ? -OPEN_X : HALF;
        for (let i = 0; kiri + i * CW < kanan; i++) {
            for (let r = 0; r < 2; r++) {
                if ((i + r) % 2 === 0) {
                    const x0 = kiri + i * CW;
                    const x1 = Math.min(x0 + CW, kanan);
                    addWallTile(wall, x0, x1, SY - CH + r * CH, SY - CH + (r + 1) * CH, FACE_Z + 0.13, COLORS.checkLight);
                }
            }
        }
        addBox(wall, [cx, SY + CH + 0.06, FACE_Z + 0.08], [w, 0.12, 0.16], COLORS.red);
        addBox(wall, [cx, SY - CH - 0.06, FACE_Z + 0.08], [w, 0.12, 0.16], COLORS.red);
        addBox(wall, [cx, 6.95, FACE_Z + 0.12], [w, 0.55, 0.34], COLORS.marquee);
        addBox(wall, [cx, 6.62, FACE_Z + 0.22], [w, 0.08, 0.1], COLORS.gold);

        // --- dinding samping ruang makan ---
        const bawah = FLOOR_LOCAL_Y - 0.3;
        const tinggi = TOP_Y + 0.5 - bawah;
        const zTengah = (WALL_Z + ZEND) / 2;
        const panjang = ZEND - WALL_Z;
        const xDalam = sg * (HALF - 0.02);
        addBox(wall, [sg * (HALF + 0.25), bawah + tinggi / 2, zTengah], [0.5, tinggi, panjang], COLORS.wall);
        addBox(wall, [sg * (HALF + 0.05), (bawah - 1.4) / 2, zTengah], [0.1, -1.4 - bawah, panjang], COLORS.wallLow);
        addBox(wall, [xDalam, SY, zTengah], [0.06, CH * 2, panjang], COLORS.checkDark);
        for (let i = 0; WALL_Z + i * CW < ZEND; i++) {
            for (let r = 0; r < 2; r++) {
                if ((i + r) % 2 === 0) addSideTile(wall, xDalam - sg * 0.04, SY - CH + r * CH, SY - CH + (r + 1) * CH, WALL_Z + i * CW, WALL_Z + (i + 1) * CW, -sg, COLORS.checkLight);
            }
        }
        addBox(wall, [xDalam, SY + CH + 0.06, zTengah], [0.12, 0.12, panjang], COLORS.red);
        addBox(wall, [xDalam, SY - CH - 0.06, zTengah], [0.12, 0.12, panjang], COLORS.red);
    });

    // langit-langit dan dinding depan (di belakang kamera)
    addBox(wall, [0, TOP_Y + 0.25, (WALL_Z + ZEND) / 2], [HALF * 2 + 1, 0.5, ZEND - WALL_Z + 0.5], COLORS.wallTop);
    addBox(wall, [0, wallY, ZEND + 0.25], [HALF * 2 + 1, wallH + 1, 0.5], COLORS.wall);
    scene.childs.push(node(wall));

    // panggung ditinggikan (depan = tepi ke arah penonton)
    const stage = createMesh();
    const depth = 1.4 - WALL_Z, zc = (1.4 + WALL_Z) / 2;
    addBox(stage, [0, (FLOOR_LOCAL_Y + STAGE_LOCAL_Y) / 2, zc], [HALF * 2, STAGE_LOCAL_Y - FLOOR_LOCAL_Y, depth], COLORS.stage);
    addFloorTile(stage, -HALF, HALF, WALL_Z, 1.4, STAGE_LOCAL_Y + 0.003, COLORS.stageTop);
    for (let z = WALL_Z + 0.7; z < 1.4; z += 0.7) addBox(stage, [0, STAGE_LOCAL_Y + 0.006, z], [HALF * 2, 0.01, 0.03], COLORS.stageLine);
    addBox(stage, [0, STAGE_LOCAL_Y - 0.12, 1.42], [HALF * 2, 0.1, 0.06], COLORS.red);      // list merah di tepi panggung
    addBox(stage, [0, STAGE_LOCAL_Y - 0.43, 1.43], [18.5, 0.68, 0.12], COLORS.marquee);
    addBox(stage, [0, STAGE_LOCAL_Y - 0.12, 1.51], [18.8, 0.1, 0.1], COLORS.gold);
    for (let i = 0; i < 13; i++)
        addBox(stage, [-8.1 + i * 1.35, STAGE_LOCAL_Y - 0.45, 1.51], [0.72, 0.38, 0.08], i % 2 ? COLORS.curtainLight : COLORS.gold);
    // Dua undakan rendah memberi panggung siluet yang lebih tegas dari area penonton.
    addBox(stage, [0, FLOOR_LOCAL_Y + 0.27, 1.95], [5.8, 0.54, 0.78], COLORS.stage);
    addBox(stage, [0, FLOOR_LOCAL_Y + 0.15, 2.64], [7, 0.3, 0.78], COLORS.stageTop);
    addBox(stage, [0, FLOOR_LOCAL_Y + 0.55, 1.98], [5.9, 0.08, 0.82], COLORS.gold);
    addBox(stage, [0, FLOOR_LOCAL_Y + 0.31, 2.65], [7.1, 0.07, 0.82], COLORS.gold);
    scene.childs.push(node(stage));

    // Dining Area: lantai kotak-kotak hitam-putih
    const dining = createMesh(), T = 1.6, rows = 13;
    addBox(dining, [0, FLOOR_LOCAL_Y - 0.15, 1.4 + rows * T / 2], [HALF * 2, 0.3, rows * T], COLORS.floorDark);
    for (let i = 0; i < (HALF * 2) / T; i++)
        for (let j = 0; j < rows; j++)
            if ((i + j) % 2 === 0) addFloorTile(dining, -HALF + i * T, -HALF + (i + 1) * T, 1.4 + j * T, 1.4 + (j + 1) * T, FLOOR_LOCAL_Y + 0.004, COLORS.floorLight);
    scene.childs.push(node(dining));

    // hiasan "awan & bintang" di dinding belakang
    const stars = createMesh();
    [[-15, 3.7, 0.34], [-12.4, 4.9, 0.26], [-9.6, 3.4, 0.3], [-6.5, 5.1, 0.24], [-3.2, 4.0, 0.3], [-0.4, 5.3, 0.26], [3, 3.6, 0.3],
     [6.2, 5.0, 0.25], [9.4, 3.7, 0.32], [12.5, 5.0, 0.26], [15.3, 3.5, 0.3], [-17.5, 4.8, 0.26], [17.8, 4.7, 0.28]]
        .forEach(([x, y, r]) => addStar(stars, x, y, WALL_Z + 0.16, r, COLORS.star));
    scene.childs.push(node(stars));
    [[-11.2, 5.3, 0.78], [-1.8, 4.6, 0.7], [7.4, 5.4, 0.8], [15.8, 5.2, 0.7], [-17.6, 3.7, 0.68]].forEach(([x, y, s]) => addCloud(scene, x, y, WALL_Z + 0.34, s));

    // Tirai merah berlipit dan bingkai panggung bergaya teater.
    const theater = createMesh();

    // Layered front valance with curved swags and fine gold piping.
    addBox(theater, [0, 4.82, -3.68], [19.4, 0.42, 0.42], COLORS.curtainDark);
    for (let swag = 0; swag < 7; swag++) {
        const x0 = -9 + swag * (18 / 7), x1 = x0 + 18 / 7, swagMesh = createMesh(), piping = createMesh();
        for (let i = 0; i <= 16; i++) {
            const u = i / 16, x = x0 + (x1 - x0) * u;
            const y = 4.85 - 0.82 * 4 * u * (1 - u);
            mergeMesh(swagMesh, generateEllipsoidSurface({
                a: 0.22, b: 0.2, c: 0.16, stacks: 8, slices: 10,
                color: i % 3 === 0 ? COLORS.curtainLight : COLORS.curtain,
            }), [x, y, 0.56]);
            if (i % 2 === 0)
                mergeMesh(piping, generateEllipsoidSurface({
                    a: 0.055, b: 0.055, c: 0.045, stacks: 6, slices: 8, color: COLORS.gold,
                }), [x, y - 0.13, 0.74]);
        }
        mergeMesh(theater, swagMesh, [0, 0, 0]);
        mergeMesh(theater, piping, [0, 0, 0]);
    }
    addBox(theater, [0, 5.12, 0.4], [20.4, 0.12, 0.2], COLORS.gold);
    addBox(theater, [0, 5.72, -3.9], [8.2, 1.12, 0.4], COLORS.gold);
    addBox(theater, [0, 5.72, -3.66], [7.85, 0.82, 0.14], COLORS.marquee);
    const marqueeStars = createMesh();
    [-2.7, 0, 2.7].forEach((x, i) => addStar(marqueeStars, x, 5.72, -3.56, i === 1 ? 0.46 : 0.3, COLORS.bulb));
    mergeMesh(theater, marqueeStars, [0, 0, 0]);

    for (let i = 0; i < 19; i++)
        mergeMesh(theater, generateEllipsoidSurface({ a: 0.12, b: 0.12, c: 0.1, stacks: 8, slices: 10, color: COLORS.bulb }), [-8.7 + i * 0.97, 5.13, -3.48]);

    // bendera segitiga pesta
    const bunting = createMesh();
    const addTri = (mesh, a, b, c, color, normal = [0, 0, 1]) => {
        const start = mesh.vertices.length / 9;
        [a, b, c].forEach(([x, y, z]) => mesh.vertices.push(x, y, z, ...color, ...normal));
        mesh.faces.push(start, start + 1, start + 2);
    };

    // di dinding depan kiri dan kanan bukaan tirai
    [[-23.6, -(OPEN_X + 0.6)], [OPEN_X + 0.6, 23.6]].forEach(([x0, x1], side) => {
        const jumlah = 14, z = FACE_Z + 0.14;
        for (let i = 0; i < jumlah; i++) {
            const u = (i + 0.5) / jumlah;
            const x = x0 + (x1 - x0) * u;
            const y = 6.0 - 4 * u * (1 - u);          // tali melengkung ke bawah
            addTri(bunting, [x - 0.36, y, z], [x + 0.36, y, z], [x, y - 0.85, z], COLORS.flags[(i + side) % COLORS.flags.length]);
            if (i % 2 === 0) addBox(bunting, [x, y + 0.04, z - 0.02], [(x1 - x0) / jumlah * 1.05, 0.05, 0.04], COLORS.marquee);
        }
    });

    // di dinding samping ruang makan
    [-1, 1].forEach(sg => {
        const jumlah = 20, z0 = -3.4, z1 = 20;
        const x = sg * (HALF - 0.1);
        for (let i = 0; i < jumlah; i++) {
            const u = (i + 0.5) / jumlah;
            const z = z0 + (z1 - z0) * u;
            const y = 6.0 - 5.2 * u * (1 - u);
            addTri(bunting, [x, y, z - 0.38], [x, y, z + 0.38], [x, y - 0.85, z], COLORS.flags[(i + 1) % COLORS.flags.length], [-sg, 0, 0]);
        }
    });
    scene.childs.push(node(bunting));

    // lampu sorot di atas panggung
    const rig = createMesh();
    addBox(rig, [0, 6.25, 0.85], [15.2, 0.2, 0.22], COLORS.metal);
    [-6, -3, 0, 3, 6].forEach((x, i) => {
        addBox(rig, [x, 6.0, 0.85], [0.1, 0.4, 0.1], COLORS.metal);
        addBox(rig, [x, 5.55, 0.85], [0.78, 0.62, 0.78], COLORS.marquee);
        mergeMesh(rig, generateEllipsoidSurface({ a: 0.3, b: 0.12, c: 0.3, stacks: 8, slices: 12, color: i === 2 ? COLORS.lampGlass : [0.6, 0.5, 0.34] }), [x, 5.2, 0.85]);
    });
    scene.childs.push(node(rig));

    // Framed party posters fill the wall on either side of the stage.
    [-15, 15].forEach((x, i) => {
        addBox(theater, [x, 2.2, FACE_Z + 0.02], [2.8, 3.4, 0.16], COLORS.gold);
        addBox(theater, [x, 2.2, FACE_Z + 0.13], [2.52, 3.12, 0.12], i ? COLORS.curtain : COLORS.marquee);
        addStar(theater, x, 2.45, FACE_Z + 0.21, 0.78, i ? COLORS.bulb : COLORS.cloud);
        addBox(theater, [x, 0.92, FACE_Z + 0.21], [1.45, 0.12, 0.08], COLORS.gold);
        addBox(theater, [x, 0.68, FACE_Z + 0.21], [1.05, 0.1, 0.08], COLORS.gold);
    });
    scene.childs.push(node(theater));

    // Overlapping panels on the front plane leave no slit when the curtain is closed.
    [-1, 1].forEach(side => {
        const panel = createMesh();
        addBox(panel, [0, 0.2, 0.08], [9.3, 8.95, 0.16], COLORS.curtain);
        for (let i = 0; i <= 32; i++) {
            const x = -4.45 + i * 0.278;
            const shade = i % 3 === 0 ? COLORS.curtainDark : i % 2 === 0 ? COLORS.curtainLight : COLORS.curtain;
            mergeMesh(panel, generateEllipsoidSurface({ a: 0.2, b: 4.4, c: 0.14, stacks: 10, slices: 12, color: shade }), [x, 0.2, 0.19]);
        }
        addBox(panel, [side * 4.48, 0.2, 0.38], [0.12, 8.7, 0.06], COLORS.gold);
        addBox(panel, [0, -4.2, 0.38], [9.25, 0.14, 0.06], COLORS.curtainDark);
        addBox(panel, [0, -4.27, 0.42], [9.25, 0.045, 0.06], COLORS.gold);
        scene.childs.push(group([0, 0, 0], [0, 0, 0], [node(panel)], {
            animate: () => ({ pos: [side * (4.3 + 8.1 * curtainOpenAmount(timelineTime)), 0, 0] }),
        }));
    });

    // meja pesta (taplak putih-merah) dengan topi pesta; dijaga rendah agar tidak menutupi panggung
    const tables = createMesh(), chairs = createMesh();
    [[-7.5, 9.5], [7.5, 9.5], [-13.5, 8.5], [13.5, 8.5], [-19, 9.5], [19, 9.5]].forEach(([x, z], n) => {
        addBox(tables, [x, -3.95, z], [3.1, 2.1, 1.9], COLORS.cloth);
        addBox(tables, [x, -4.1, z], [3.16, 0.35, 1.96], COLORS.clothRed);
        addBox(tables, [x, -2.88, z], [3.4, 0.12, 2.15], COLORS.tableTop);
        addBox(tables, [x, -2.79, z], [3.35, 0.04, 0.12], n % 2 ? COLORS.curtainLight : COLORS.gold);
        [-1, 1].forEach(side => {
            const chairZ = z + side * 1.48;
            addBox(chairs, [x, -3.48, chairZ], [1.08, 0.18, 0.78], n % 2 ? COLORS.curtainLight : COLORS.red);
            addBox(chairs, [x, -3.02, chairZ + side * 0.34], [1.08, 0.82, 0.16], COLORS.curtain);
            [-0.42, 0.42].forEach(legX => [-0.27, 0.27].forEach(legZ =>
                addBox(chairs, [x + legX, -4.2, chairZ + legZ], [0.12, 1.4, 0.12], COLORS.marquee)));
        });
        for (let h = 0; h < 3; h++) {
            const m = generateEllipticCone({ a: 0.2, b: 0.2, height: 0.62, stacks: 3, slices: 12, color: COLORS.hats[(n + h) % 4] });
            mergeMesh(tables, m, [x - 0.9 + h * 0.9, -2.82 + 0.62, z + (h % 2 ? 0.25 : -0.25)], true);
        }
    });
    scene.childs.push(node(tables));
    scene.childs.push(node(chairs));
    return scene;
}

function buildStage() {
    const scene = group();
    // saat jumpscare, ruangan dan para pemeran disingkirkan (jumpscare memakai koordinat dan kamera sendiri)
    const sembunyi = () => ({ pos: [0, 0, activeScare(timelineTime) ? -200 : 0] });
    const room = group([0, ROOM_Y_OFFSET, 0], [0, 0, 0], [buildRoom()], { animate: sembunyi });
    const actors = group([0, ROOM_Y_OFFSET, 0], [0, 0, 0], [], { animate: sembunyi });
    // Jumpscare memakai koordinat sendiri (kepala karakter di origin, kamera menghadap wajah), tanpa offset ruangan.
    // Tiap karakter punya file sendiri: jumpscare/freddy.js, chica.js, bonnie.js
    const jumpscare = group([0, 0, 0], [0, 0, 0], SCARE_ORDER.map(name =>
        CAST[name].jumpscare.buildJumpscareScene(() => timelineTime, SCARE[name].T, SCARE[name].recover[0])
    ));
    scene.childs.push(room, actors, jumpscare);

    const walkOf = name => () => walkAmount(name, timelineTime);
    const models = {
        freddy: buildFreddy({ walk: walkOf("freddy") }),
        chica: buildChica({ walk: walkOf("chica") }),
        bonnie: buildBonnie({ walk: walkOf("bonnie"), strum: () => strumAmount(timelineTime) }),
    };

    NAMES.forEach(name => {
        const c = CAST[name];

        // bayangan lembut di panggung, ikut bergerak bersama karakter
        actors.childs.push(group([0, 0, 0], [0, 0, 0], [
            node(generateEllipsoidSurface({ a: 1.7, b: 0.012, c: 0.95, stacks: 6, slices: 24, color: [0.05, 0.03, 0.05] }), [0, 0, 0]),
        ], { animate: () => { const a = actorAt(name, timelineTime); return { pos: [a.x, STAGE_LOCAL_Y + 0.02, a.z], rot: [0, 0, 0] }; } }));

        // model Freddy & Chica memakai MyObject sendiri yang belum punya skala, jadi dibungkus group berskala S
        const tubuh = place(group([0, 0, 0], [0, 0, 0], [models[name]]), [0, 0, 0], [0, 0, 0], S);
        actors.childs.push(group([0, 0, 0], [0, 0, 0], [tubuh], {
            animate: () => {
                const t = timelineTime;
                const { x, z, yaw } = actorAt(name, t);
                const walk = walkAmount(name, t), play = bandAmount(t);
                const bob = (walk * Math.abs(Math.sin(clockTime * 7)) * 0.045 + play * Math.sin(clockTime * 3.5 + c.phase) * 0.055) * S * 2;
                return { pos: [x, STAGE_LOCAL_Y + c.foot * S + bob, z], rot: [0, yaw, walk * Math.sin(clockTime * 7) * 0.018] };
            },
        }));
    });
    return scene;
}

/* ============================== PENCAHAYAAN ============================== */
const STAGE_LIGHT = {
    ambient: [0.3, 0.27, 0.36], key: [0.34, 0.31, 0.42], keyDir: [0.25, 0.7, 0.8],
    fill: [0.05, 0.04, 0.09], rim: 0.1, spec: 0.04, fog: 0.024, fogColor: [0.06, 0.035, 0.09],
};
// saat jumpscare: wajah karakter disinari dari depan, latar hampir hitam
const SCARE_LIGHT = {
    ambient: [0.33, 0.29, 0.4], key: [1.0, 0.94, 1.05], keyDir: [0.12, 0.4, 0.92],
    fill: [0.3, 0.2, 0.36], rim: 0.5, spec: 0.16, fog: 0, fogColor: [0, 0, 0],
};
const BG_STAGE = [0.03, 0.02, 0.045];
const BG_SCARE = [0.01, 0.004, 0.012];

// kamera panggung: lebar (semua karakter terlihat) dan close-up (mendekat ke satu karakter sebelum jumpscare)
const CAM_WIDE = { dist: 18, fov: 47, y: -4.5 };
const CAM_CLOSE = { dist: 13.8, fov: 42, y: -5.55 };

// teks status di pojok kiri bawah
function statusText(e) {
    const scareNow = activeScare(e), pending = pendingScare(e);
    if (scareNow) return "JUMPSCARE! " + CAST[scareNow].label;
    if (pending) return CAST[pending].label + " menatap penonton...";
    if (e < T_BAND[1]) return "Freddy, Chica & Bonnie membuka pertunjukan bersama";
    if (e < T_FIRST_CLOSE[1]) return "Tirai menutup setelah pertunjukan pembuka";
    if (e < T_REOPEN[0]) return "Tirai tertutup, ketiganya menunggu di sisi kanan panggung";
    if (e < ENTRY[SCARE_ORDER[0]][0]) return "Tirai terbuka kembali";

    // bagian solo: satu karakter saja di panggung
    for (const name of SCARE_ORDER) {
        if (e < ENTRY[name][1]) return CAST[name].label + " masuk dari sisi kanan panggung";
        if (e < SCARE[name].closeup[0]) return CAST[name].label + " tampil sendirian di panggung";
        if (e < EXIT[name][0]) return CAST[name].label + " kembali ke panggung";
        if (e < EXIT[name][1]) return CAST[name].label + " berjalan keluar ke kiri panggung";
    }

    // ending: masuk satu per satu lalu band bertiga lagi
    for (const name of ENTRY_ORDER) if (e < FINAL_ENTRY[name][1]) return "Ending: " + CAST[name].label + " masuk dari sisi kanan panggung";
    if (e < T_BAND2[1]) return "Ending: Freddy, Chica & Bonnie band bersama lagi";
    if (e < T_FINAL_CLOSE[1]) return "Tirai menutup, pertunjukan selesai";
    return "Pertunjukan selesai";
}

window.addEventListener("load", () => {
    const canvas = document.getElementById("mycanvas");
    const status = document.getElementById("scene-status");
    const barFill = document.getElementById("bar-fill");
    const scareFlash = document.getElementById("scare-flash");
    const noiseCanvas = document.getElementById("noise");
    const noiseCtx = noiseCanvas.getContext("2d");

    // kanvas kecil berisi bintik acak (efek kamera CCTV)
    const NW = 192, NH = 108;
    noiseCanvas.width = NW;
    noiseCanvas.height = NH;
    const noiseImg = noiseCtx.createImageData(NW, NH);

    let start = null;
    let lastStatus = "";
    let frameKe = 0;
    // stage/index.html?t=19 -> animasi mulai dari detik ke-19 (untuk mencoba jumpscare)
    let seek = Number(new URLSearchParams(location.search).get("t")) || 0;

    document.getElementById("replay").addEventListener("click", () => {
        start = null;
        seek = 0;
    });

    startViewer({
        canvas,
        root: buildStage(),
        bg: BG_STAGE,
        cam: { dist: 21, y: -4.5, fov: 47 },
        pitchLimit: 0.35,
        light: { ...STAGE_LIGHT, spotColor: [1.0, 0.78, 0.5], spotCos: 0.94 },
        onFrame(now, dt, { cam, light, setBackground }) {
            if (start === null) start = now;
            const e = Math.min(now - start + seek, DURATION + 2);   // waktu animasi (detik)
            timelineTime = e;
            clockTime = now;
            const et = Math.min(e, DURATION);
            const pos = {};
            NAMES.forEach(n => { pos[n] = actorAt(n, et); });

            const scareName = activeScare(e);
            const jumpscare = scareName !== null;
            document.body.classList.toggle("jumpscare-active", jumpscare);
            setBackground(jumpscare ? BG_SCARE : BG_STAGE);

            // scare.amount dibaca oleh model karakter (mulut terbuka & kepala bergetar), hanya untuk yang sedang jumpscare
            NAMES.forEach(n => {
                const s = SCARE[n];
                CAST[n].jumpscare.setScare(n === scareName ? ramp(e, s.T, s.T + 0.1) : 0);
            });

            // ---- kamera ----
            // wide: ikut sedikit ke karakter yang sedang berjalan; close-up: bergeser ke karakter yang akan jumpscare
            let walkSum = 0, walkX = 0, closeup = 0, closeX = 0;
            NAMES.forEach(n => {
                const w = walkAmount(n, et);
                walkSum += w;
                walkX += w * pos[n].x;
                const s = SCARE[n];
                const a = ramp(e, s.closeup[0], s.closeup[1]) * (1 - ramp(e, s.recover[0], s.recover[1]));
                closeup += a;
                closeX += -0.8 * pos[n].x * a;
            });
            closeup = Math.min(1, closeup);
            const follow = walkSum > 0.01 ? -0.15 * (walkX / Math.max(walkSum, 1)) * Math.min(1, walkSum) : 0;
            if (jumpscare) {
                const jc = CAST[scareName].jumpscare.getJumpscareCamera(e, SCARE[scareName].T);
                cam.dist = jc.dist;
                cam.fov = jc.fov;
                cam.x = jc.x;
                cam.y = jc.y;
            } else {
                cam.dist = CAM_WIDE.dist + (CAM_CLOSE.dist - CAM_WIDE.dist) * closeup;
                cam.fov = CAM_WIDE.fov + (CAM_CLOSE.fov - CAM_WIDE.fov) * closeup;
                cam.x = follow * (1 - closeup) + closeX;
                cam.y = CAM_WIDE.y + (CAM_CLOSE.y - CAM_WIDE.y) * closeup;
            }
            cam.yaw = 0;
            cam.pitch = 0;

            // ---- lampu ----
            const L = jumpscare ? SCARE_LIGHT : STAGE_LIGHT;
            const pending = pendingScare(e);
            const sebelumJumpscare = pending !== null && e > SCARE[pending].closeup[1] && e < SCARE[pending].T - SCARE_BLACKOUT;
            const blackout = pending !== null && e >= SCARE[pending].T - SCARE_BLACKOUT;      // lampu mati sesaat sebelum jumpscare

            let kedip = 1;
            if (sebelumJumpscare) {
                if (Math.sin(e * 31) * Math.sin(e * 17 + 1) > 0.25) kedip = 0.2;     // berkedip cepat
            } else if (Math.sin(e * 23.1) * Math.sin(e * 9.7) > 0.96) {
                kedip = 0.6;                                                          // kedip kecil acak
            }
            const terang = blackout ? 0.06 : kedip;
            const redup = jumpscare ? 1 : 1 - 0.18 * ramp(e, 0, 0.5);

            light.ambient = L.ambient.map(v => v * terang * redup);
            light.key = L.key.map(v => v * terang);
            light.keyDir = L.keyDir;
            light.fill = L.fill;
            light.rim = L.rim;
            light.spec = L.spec;
            light.fog = L.fog;
            light.fogColor = L.fogColor;

            // tiga lampu sorot: satu untuk tiap karakter, mengikuti posisinya (mati kalau karakternya di luar panggung)
            const spotOn = ramp(e, -0.1, 0.5);
            const beat = 0.1 * Math.sin(e * 3.5) * bandAmount(e);          // lampu berdenyut saat band bermain
            const spots = [["spot", "spotPos", "freddy"], ["spot2", "spotPos2", "chica"], ["spot3", "spotPos3", "bonnie"]];
            spots.forEach(([amountKey, posKey, name]) => {
                const hadir = 1 - ramp(Math.abs(pos[name].x), 8.6, 10.6);
                light[amountKey] = jumpscare || blackout ? 0 : spotOn * hadir * (1.0 + beat) * kedip;
                light[posKey][0] = pos[name].x;
                light[posKey][1] = 9 + ROOM_Y_OFFSET;
                light[posKey][2] = pos[name].z + 2;
            });

            // ---- teks status ----
            const text = statusText(e);
            if (text !== lastStatus) {
                status.textContent = text;
                lastStatus = text;
            }

            // kilat putih sebentar saat jumpscare mulai
            let flash = 0;
            NAMES.forEach(n => { if (e >= SCARE[n].T) flash = Math.max(flash, clamp01(1 - (e - SCARE[n].T) / 0.1)); });
            scareFlash.style.opacity = (0.4 * flash).toFixed(2);
            barFill.style.width = (Math.min(e / DURATION, 1) * 100).toFixed(1) + "%";

            // ---- bintik CCTV: tipis di panggung, tebal di akhir tiap jumpscare ----
            let tebal = 0;
            NAMES.forEach(n => {
                const rec = SCARE[n].recover[0];
                if (e >= rec - 1.0 && e < rec) tebal = Math.max(tebal, ramp(e, rec - 1.0, rec - 0.15));
                if (e >= rec) tebal = Math.max(tebal, 1 - ramp(e, rec, rec + 0.45));
            });
            let dasar = 0.09;
            if (jumpscare) dasar = 0.03;
            else if (sebelumJumpscare) dasar = 0.19;
            noiseCanvas.style.opacity = Math.max(dasar, 0.95 * tebal).toFixed(2);

            // gambar ulang bintik tiap 2 frame
            frameKe++;
            if (frameKe % 2 === 0) {
                const px = noiseImg.data;
                for (let i = 0; i < px.length; i += 4) {
                    const v = Math.random() * 255;
                    px[i] = v;
                    px[i + 1] = v;
                    px[i + 2] = v;
                    px[i + 3] = 255;
                }
                noiseCtx.putImageData(noiseImg, 0, 0);
            }
        },
    });
});

export { actorAt, walkAmount, strumAmount, DURATION, ENTRY, EXIT, FINAL_ENTRY, SCARE, CAST, T_BAND, T_BAND2 };
