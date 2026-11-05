// badan/main.js  (bisa dilihat sendiri: index.html?part=badan)
import { LIBS } from "../helpers/libs.js";
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";
import { track, beat, pulse, HEAD_YAW } from "../helpers/show.js";

const C = B.COLORS;
const sin = Math.sin;

function buildTorsoSurface() {
    const a = 1.9, b = 2.15, c = 1.5;
    const stacks = 40, slices = 56;
    const vertices = [], faces = [];
    const point = (u, v) => {
        const phi = Math.PI * u, theta = 2 * Math.PI * v;
        const x = a * Math.sin(phi) * Math.cos(theta);
        const y = b * Math.cos(phi);
        const z = c * Math.sin(phi) * Math.sin(theta);
        return [x, y, z];
    };
    const subtract = (p, q) => p.map((value, i) => value - q[i]);
    const cross = (p, q) => [
        p[1] * q[2] - p[2] * q[1],
        p[2] * q[0] - p[0] * q[2],
        p[0] * q[1] - p[1] * q[0],
    ];

    for (let i = 0; i <= stacks; i++) {
        for (let j = 0; j <= slices; j++) {
            const u = i / stacks, v = j / slices, p = point(u, v);
            const e = 1e-3;
            const pu = subtract(point(Math.min(u + e, 1), v), point(Math.max(u - e, 0), v));
            const pv = subtract(point(u, Math.min(v + e, 1)), point(u, Math.max(v - e, 0)));
            let normal = cross(pu, pv);
            const length = Math.hypot(normal[0], normal[1], normal[2]) || 1;
            normal = normal.map(value => value / length);
            if (normal[0] * p[0] + normal[1] * p[1] + normal[2] * p[2] < 0)
                normal = normal.map(value => -value);
            vertices.push(p[0], p[1], p[2], ...C.PURPLE, ...normal);
        }
    }
    for (let i = 0; i < stacks; i++) {
        for (let j = 0; j < slices; j++) {
            const current = i * (slices + 1) + j, next = current + slices + 1;
            faces.push(current, next, current + 1, next, next + 1, current + 1);
        }
    }
    return { vertices, faces };
}

/* ====== BADAN (disesuaikan dengan foto referensi) ======
   Proporsi dari foto: torso pendek & lebar, perut abu-abu besar berbentuk oval,
   dasi kupu-kupu merah tepat di bawah dagu, pinggul berupa pita lebar yang terpisah garis gelap.
   ellipsoid            : torso, perut, bahu, pinggul, leher
   hyperboloid 1 sisi   : sambungan pinggang (cincin)
   elliptic cone        : (dipakai di dasi/tangan)
   elliptic paraboloid  : trapezius (kubah di pangkal leher)
   hyperbolic paraboloid: lipatan pelana di punggung */
export function buildBadan() {
    const dasi = group([0, 1.66, 0.8], [0, 0, 0], [
        node(B.generateEllipsoidSurface({ a: 0.24, b: 0.22, c: 0.2, color: C.BLACK }), [0, 0, 0.05]),
        node(B.generateEllipsoidSurface({ a: 0.52, b: 0.3, c: 0.17, color: C.BLACK }), [0.5, 0, 0], [0, 0, -0.22]),
        node(B.generateEllipsoidSurface({ a: 0.52, b: 0.3, c: 0.17, color: C.BLACK }), [-0.5, 0, 0], [0, 0, 0.22]),
    ]);
    const kids = [
        node(buildTorsoSurface()),                                                                                       // torso dasar
        node(B.generateEllipsoidSurface({ a: 1.34, b: 1.48, c: 0.9, color: C.GRAY }), [0, -0.22, 0.9]),              // perut bulat dan menonjol di depan torso
        node(B.generateEllipsoidSurface({ a: 1.75, b: 0.56, c: 0.85, color: C.MUSCLE }), [0, 1.55, -0.02]),            // garis bahu
        node(B.generateEllipsoidSurface({ a: 0.86, b: 0.4, c: 0.68, color: C.DARK }), [0, 2.1, 0]),                     // leher pendek
        node(B.generateEllipticParaboloid({ a: 1.1, b: 0.75, height: 0.5, color: C.MUSCLE }), [0, 1.95, -0.1], [Math.PI, 0, 0]), // trapezius (kubah)
        node(B.generateEllipsoidSurface({ a: 1.55, b: 0.14, c: 0.88, color: C.DARK }), [0, -2.02, 0]),                 // celah gelap perut-pinggul
        node(B.generateEllipsoidSurface({ a: 1.7, b: 0.62, c: 0.96 }), [0, -2.55, 0]),                                // pinggul (pita lebar)
        // node(B.generateHyperbolicParaboloid({ a: 1.0, b: 0.7, c: 0.12, color: C.MUSCLE }), [0, 0.6, -1.05], [Math.PI / 2, 0, 0]), // lipatan punggung
        dasi,
    ];
    return group([0, 0, 0], [0, 0, 0], kids,
        {
            // pertunjukan: badan ikut menoleh sedikit, bergoyang miring per 4 ketukan, naik-turun halus tiap ketukan
            animate: t => ({
                pos: [0.07 * sin(Math.PI * beat(t) / 2), 0.04 * (1 - pulse(t)), 0],
                rot: [0, 0.3 * track(HEAD_YAW, t), 0.022 * sin(Math.PI * beat(t) / 2 + 1.2)],
            })
        });
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
    LIBS.translateZ(VIEWMATRIX, -13);

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
    var ROOT = place(buildBadan(), [0, 0.3, 0]);
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

// jalan sendiri kalau dibuka lewat index.html?part=badan
if (!window.FREDDY_FULL && new URLSearchParams(location.search).get("part") === "badan") {
    if (document.readyState === "complete") main();
    else window.addEventListener("load", main);
}
