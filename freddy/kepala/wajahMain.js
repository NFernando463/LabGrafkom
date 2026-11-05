// wajah/main.js (bisa dilihat sendiri: index.html?part=wajah)
import { LIBS } from "../helpers/libs.js";
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";
import { mouth } from "../helpers/show.js";

const C = B.COLORS;

/* ====== WAJAH (disesuaikan dengan foto) ======
   Atas (diam)  : moncong 2 bantalan abu-abu, hidung, mata dengan cincin hitam, kelopak, alis
   Rahang bawah : group berengsel besar & lebar (ungu) dengan gigi bawah kecil, bisa membuka
   Bentuk kuadrik: ellipsoid, elliptic cone (gigi atas), hyperbolic paraboloid (alis),
   hyperboloid 2 sisi (rongga mulut). */

// seberapa lebar mulut terbuka (radian) - lip-sync mengikuti lagu di helpers/show.js
export function mouthOpen(t) {
    return 0.03 + 0.42 * mouth(t);
}

// kedipan: 0 = terbuka (sayu), 1 = tertutup
function blink(t) {
    const c = t % 4.2;
    return c < 0.18 ? Math.sin(c / 0.18 * Math.PI) : 0;
}

export function buildWajah() {
    const kids = [];
    const IRIS = C.BLUE;
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
        kids.push(node(B.generateEllipsoidSurface({ a: 0.15, b: 0.15, c: 0.1, color: IRIS }), [ex - s * 0.04, ey - 0.04, 1.63])); // iris biru
        kids.push(node(B.generateEllipsoidSurface({ a: 0.06, b: 0.06, c: 0.05, color: C.BLACK }), [ex - s * 0.04, ey - 0.04, 1.71])); // pupil
        // kelopak atas ungu menutupi sebagian mata (sayu), turun saat berkedip
        kids.push(node(B.generateEllipsoidSurface({ a: 0.42, b: 0.2, c: 0.3, color: C.PURPLE }), [ex, ey + 0.27, 1.43], [0, 0, s * 0.03], {
            animate: t => ({ pos: [0, -0.32 * blink(t), 0.03 * blink(t)] })
        }));
        // alis tebal: hyperbolic paraboloid (pelana) sedikit miring
        kids.push(node(B.generateHyperbolicParaboloid({ a: 0.5, b: 0.16, c: 0.12, color: C.DARK }), [ex, 1.02, 1.3], [Math.PI / 2 - 0.3, 0, -s * 0.07]));
    });

    /* ---------- RAHANG BAWAH (berengsel) ---------- */
    // koordinat lokal = koordinat kepala - PIVOT
    const L = (x, y, z) => [x - PIVOT[0], y - PIVOT[1], z - PIVOT[2]];
    const jaw = [];
    // rahang: ellipsoid besar & lebar (hampir selebar kepala), bibir depan di sekitar y=-1.23
    jaw.push(node(B.generateEllipsoidSurface({ a: 1.4, b: 0.6, c: 1.0 }), L(0, -1.47, 0.55)));
    // lantai mulut hitam
    jaw.push(node(B.generateEllipsoidSurface({ a: 1.1, b: 0.1, c: 0.6, color: C.BLACK }), L(0, -1.08, 0.68)));
    // gigi bawah: ellipsoid kecil putih mengikuti lengkung bibir rahang
    for (let i = 0; i < 8; i++) {
        const x = (i - 3.5) * 0.24;
        const z = 0.55 + 1.0 * Math.sqrt(Math.max(0.02, 0.82 - (x / 1.4) ** 2)) - 0.1;
        jaw.push(node(B.generateEllipsoidSurface({ a: 0.085, b: 0.11, c: 0.07, color: C.WHITE }), L(x, -1.12, z)));
    }
    kids.push(group(PIVOT, [0, 0, 0], jaw, {
        // + = ujung depan rahang turun; sedikit geser bawah-depan agar terasa animatronik
        animate: t => {
            const o = mouthOpen(t);
            return { rot: [o, 0, 0], pos: [0, -0.1 * o, 0.06 * o] };
        }
    }));

    return group([0, 0, 0], [0, 0, 0], kids);
}

function main() {
    var CANVAS = document.getElementById("mycanvas");

    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    // inisialisasi GL
    const GL = CANVAS.getContext("webgl", { antialias: true });

    if (!GL) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    /*========================= SHADERS ========================= */
    var shader_vertex_source = `
        attribute vec3 position;
        attribute vec3 color;
        attribute vec3 normal;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;

        varying vec3 vColor;
        varying vec3 vNormal;

        void main(void) {
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
            vColor = color;
            vNormal = (Mmatrix * vec4(normal, 0.)).xyz;   // normal ikut berputar
        }`;

    var shader_fragment_source = `
        precision mediump float;
        varying vec3 vColor;
        varying vec3 vNormal;

        void main(void) {
            vec3 N = normalize(vNormal);
            vec3 L = normalize(vec3(0.35, 0.6, 0.75));          // cahaya utama
            vec3 Fill = normalize(vec3(-0.6, -0.2, 0.5));       // cahaya pengisi
            float diff = max(dot(N, L), 0.0);
            float fill = max(dot(N, Fill), 0.0) * 0.25;
            float amb = 0.28 + 0.12 * N.y;                      // ambient langit
            float rim = pow(1.0 - max(N.z, 0.0), 3.0) * 0.18;   // rim light tipis
            vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
            float spec = pow(max(dot(N, H), 0.0), 28.0) * 0.12; // kilau halus
            vec3 c = vColor * (amb + 0.8 * diff + fill) + vec3(rim * 0.5, rim * 0.5, rim) + vec3(spec);
            gl_FragColor = vec4(c, 1.);
        }`;

    var compile_shader = function (source, type, typeString) {
        var shader = GL.createShader(type);
        GL.shaderSource(shader, source);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
            return false;
        }
        return shader;
    };

    // Shader Program
    var shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    var shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);
    GL.linkProgram(SHADER_PROGRAM);

    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    GL.enableVertexAttribArray(_position);
    GL.useProgram(SHADER_PROGRAM);

    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    GL.enableVertexAttribArray(_color);

    var _normal = GL.getAttribLocation(SHADER_PROGRAM, "normal");
    GL.enableVertexAttribArray(_normal);

    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");

    // Inisialisasi matriks transformasi
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var VIEWMATRIX = LIBS.get_I4();
    var MOVEMATRIX = LIBS.get_I4();

    // Geser kamera ke belakang agar objek terlihat
    LIBS.translateZ(VIEWMATRIX, -7);

    /*====================== MOUSE CONTROLS ====================== */
    var THETA = 0, PHI = 0;
    var drag = false;
    var x_prev, y_prev;

    var FRICTION = 0.05;
    var dX = 0, dY = 0;

    var mouseDown = function (e) {
        drag = true;
        x_prev = e.pageX;
        y_prev = e.pageY;
        e.preventDefault();
        return false;
    };

    var mouseUp = function (e) {
        drag = false;
    };

    var mouseMove = function (e) {
        if (!drag) return false;

        dX = (e.pageX - x_prev) * 2 * Math.PI / CANVAS.width;
        dY = (e.pageY - y_prev) * 2 * Math.PI / CANVAS.height;

        THETA += dX;
        PHI += dY;

        x_prev = e.pageX;
        y_prev = e.pageY;
        e.preventDefault();
    };

    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", mouseMove, false);

    /*======================== THE SHAPES ======================== */
    var ROOT = place(buildWajah(), [0, 0, 0]);
    ROOT.setup(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix);

    /*========================= DRAWING ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearDepth(1.0);

    GL.clearColor(0.0, 0.5, 0.5, 1.0);

    var animate = function (time) {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        // efek friction saat kursor tidak sedang di-drag
        if (!drag) {
            dX *= (1 - FRICTION);
            dY *= (1 - FRICTION);
            THETA += dX;
            PHI += dY;
        }

        // terapkan hasil drag mouse ke MOVEMATRIX (induk dari seluruh objek)
        LIBS.set_I4(MOVEMATRIX);
        LIBS.rotateY(MOVEMATRIX, THETA);
        LIBS.rotateX(MOVEMATRIX, PHI);

        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);

        ROOT.render(MOVEMATRIX, time * 0.001);   // waktu dalam detik, dipakai animasi

        GL.flush();
        window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
}

// jalan sendiri kalau dibuka lewat index.html?part=wajah
if (!window.FREDDY_FULL && new URLSearchParams(location.search).get("part") === "wajah") {
    if (document.readyState === "complete") main();
    else window.addEventListener("load", main);
}
