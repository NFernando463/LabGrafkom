// main.js  -  mengikuti pola Pertemuan 5 / mainOOP.js (milik asdos)
import { LIBS } from "./helpers/libs.js";
import { place } from "./helpers/MyObject.js";
import { buildFreddy } from "./helpers/model.js";
import { buildBadan } from "./badan/badanMain.js";
import { buildKepala } from "./kepala/kepalaMain.js";
import { buildWajah } from "./kepala/wajahMain.js";
import { buildTanganKanan } from "./tangan/tanganKananMain.js";
import { buildTanganKiri } from "./tangan/tanganKiriMain.js";
import { buildKakiKanan } from "./kaki/kakiKananMain.js";
import { buildKakiKiri } from "./kaki/kakiKiriMain.js";
import { buildMikrofon } from "./mikrofon/mikrofonMain.js";

// index.html?part=nama  -> lihat 1 bagian saja (untuk presentasi per anggota)
const PARTS = {
    badan: () => place(buildBadan(), [0, 0, 0]),
    kepala: () => place(buildKepala(), [0, -0.9, 0]),
    wajah: () => place(buildWajah(), [0, 0, 0]),
    tangan_kanan: () => place(buildTanganKanan(), [0, 2, 0]),
    tangan_kiri: () => place(buildTanganKiri(), [0, 2, 0]),
    kaki_kanan: () => place(buildKakiKanan(), [0, 2.2, 0]),
    kaki_kiri: () => place(buildKakiKiri(), [0, 2.2, 0]),
    mikrofon: () => place(buildMikrofon(), [-1.5, 0, 0]),
};

function main() {
    var CANVAS = document.getElementById("mycanvas");
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    /*===================== GET WEBGL CONTEXT ===================== */
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

    var shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    var shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);
    GL.linkProgram(SHADER_PROGRAM);

    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    GL.enableVertexAttribArray(_position);

    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    GL.enableVertexAttribArray(_color);

    var _normal = GL.getAttribLocation(SHADER_PROGRAM, "normal");
    GL.enableVertexAttribArray(_normal);

    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");

    GL.useProgram(SHADER_PROGRAM);

    /*======================== THE OBJECTS ======================== */
    // seluruh Freddy = 1 objek induk (badan) yang punya anak: kepala, tangan, kaki, mikrofon
    var part = new URLSearchParams(window.location.search).get("part");
    var ROOT;
    if (part) {
        if (!Object.prototype.hasOwnProperty.call(PARTS, part)) {
            alert('Unknown Freddy part "' + part + '"');
            return false;
        }
        ROOT = PARTS[part]();
    } else {
        // Pusatkan Freddy di layar agar model tidak terlihat terlalu rendah
        ROOT = place(buildFreddy(), [0, 0.8, 0]);
    }

    // Inisialisasi matriks transformasi
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var VIEWMATRIX = LIBS.get_I4();
    var CAM_Y = 0.6;
    var MOVEMATRIX = LIBS.get_I4();

    // Geser kamera ke belakang agar objek terlihat
    // ZOOM: jarak kamera, diubah lewat scroll mouse / pinch / tombol + -
    var BASE_DIST = part ? (part === "kepala" ? 14 : 12) : 22;
    var DIST = BASE_DIST, MIN_DIST = 5, MAX_DIST = 60;
    var setView = function () {
        LIBS.set_I4(VIEWMATRIX);
        LIBS.translateZ(VIEWMATRIX, -DIST);
        LIBS.translateY(VIEWMATRIX, 0.6);
    };
    var zoomBy = function (f) { DIST = Math.min(MAX_DIST, Math.max(MIN_DIST, DIST * f)); };
    setView();

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

    CANVAS.addEventListener("wheel", function (e) {
        e.preventDefault();
        zoomBy(Math.exp(e.deltaY * 0.001));
    }, { passive: false });
    window.addEventListener("keydown", function (e) {
        if (e.key === "+" || e.key === "=") zoomBy(0.9);
        else if (e.key === "-" || e.key === "_") zoomBy(1.1);
        else if (e.key === "0") DIST = BASE_DIST;
    });
    // pinch di layar sentuh
    var pinch = 0;
    CANVAS.addEventListener("touchstart", function (e) {
        if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    }, { passive: true });
    CANVAS.addEventListener("touchmove", function (e) {
        if (e.touches.length === 2 && pinch) {
            var d = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            zoomBy(pinch / d); pinch = d; e.preventDefault();
        }
    }, { passive: false });

    /*========================= DRAWING ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearDepth(1.0);

    if (part) GL.clearColor(0.0, 0.5, 0.5, 1.0);
    else GL.clearColor(0.02, 0.02, 0.025, 1.0);

    ROOT.setup(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix);

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
        setView();
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);

        ROOT.render(MOVEMATRIX, time * 0.001);   // waktu dalam detik, dipakai animasi

        GL.flush();
        window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
}

window.addEventListener("load", main);
