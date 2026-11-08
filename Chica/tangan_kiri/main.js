// tangan_kiri/main.js  (bisa dilihat sendiri: index.html?part=tangan_kiri)
import { LIBS } from "../helpers/libs.js";
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";
import { buildArm } from "../helpers/limbs.js";
const C = B.COLORS;
const sin = Math.sin;

/* ====== TANGAN KIRI (sisi kiri karakter = kanan layar) ====== */
export function buildTanganKiri(pose = {}) {
 return buildArm(1, { upper: -0.05, out: 0.35, fore: -1.2, inward: 0.0, handRotation: -0.99, handTilt: -0.5, serving: true, sway: 0.02, phase: 1.3, ...pose });}

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
    LIBS.translateZ(VIEWMATRIX, -12);

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
    var ROOT = place(buildTanganKiri(), [0, 2, 0]);
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

// jalan sendiri kalau dibuka lewat index.html?part=tangan_kiri
if (!window.CHICA_FULL && new URLSearchParams(location.search).get("part") === "tangan_kiri") {
    if (document.readyState === "complete") main();
    else window.addEventListener("load", main);
}
