// badan/main.js  (bisa dilihat sendiri: index.html?part=badan)
import { LIBS } from "../helpers/libs.js";
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";

const C = B.COLORS;
const sin = Math.sin;
const BODY = {
    radiusX: 1.78,
    radiusZ: 1.5,
    joinY: 1.1,
    capHeight: 0.95,
    upperTaper: 1.25,
};

function torsoCrossSectionAtY(y) {
    if (y > BODY.joinY) {
        const heightRatio = Math.min(1, (y - BODY.joinY) / BODY.capHeight);
        return Math.sqrt(Math.max(0, 1 - heightRatio ** 2)) ** BODY.upperTaper;
    }
    if (y >= -BODY.joinY) return 1;

    const heightRatio = Math.min(1, (-y - BODY.joinY) / BODY.capHeight);
    return Math.sqrt(Math.max(0, 1 - heightRatio ** 2));
}

function torsoSurfaceZ(x, y) {
    const crossSection = torsoCrossSectionAtY(y);
    return BODY.radiusZ * crossSection * Math.sqrt(Math.max(0, 1 - (x / BODY.radiusX) ** 2));
}

function buildTorsoSurface() {
    const stacks = 40, slices = 56;
    const vertices = [], faces = [];
    const point = (u, v) => {
        let y, radius;
        if (u < 0.25) {
            const phi = 2 * Math.PI * u;
            y = BODY.joinY + BODY.capHeight * Math.cos(phi);
            radius = Math.sin(phi) ** BODY.upperTaper;
        } else if (u <= 0.75) {
            y = BODY.joinY - (2 * BODY.joinY * (u - 0.25)) / 0.5;
            radius = 1;
        } else {
            const phi = (Math.PI / 2) * ((u - 0.75) / 0.25);
            y = -BODY.joinY - BODY.capHeight * Math.sin(phi);
            radius = Math.cos(phi);
        }
        const theta = 2 * Math.PI * v;
        return [
            BODY.radiusX * radius * Math.cos(theta),
            y,
            BODY.radiusZ * radius * Math.sin(theta),
        ];
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
            vertices.push(p[0], p[1], p[2], ...C.YELLOW, ...normal);
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

function buildApronSurface() {
    const stacks = 32, slices = 36;
    const vertices = [], faces = [];
    const point = (u, v) => {
        const s = 2 * v - 1;
        const roundBottom = 0.14 * Math.abs(s) ** 4 * u ** 12;
        const y = 1.92 - 2.35 * u + roundBottom;
        const halfWidth = 1.1 * (0.62 + 0.34 * u + 0.17 * Math.sin(Math.PI * u));
        const x = halfWidth * s;
        const torsoRadius = torsoCrossSectionAtY(y) * Math.sqrt(Math.max(0, 1 - (x / BODY.radiusX) ** 2));
        const z = BODY.radiusZ * torsoRadius + 0.07;
        return [
            x,
            y,
            z,
        ];
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
            if (normal[0] * p[0] + normal[2] * p[2] < 0) normal = normal.map(value => -value);
            vertices.push(p[0], p[1], p[2], 0.88, 0.86, 0.79, ...normal);
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

function buildApronTextSurface() {
    const glyphs = {
        L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
        E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
        T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
        "'": ["00100", "00100", "00000", "00000", "00000", "00000", "00000"],
        S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
        A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
        "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
    };
    const cell = 0.055;
    const vertices = [], faces = [];
    const outline = new Map();
    const fill = [];

    const addLine = (text, topY) => {
        const totalColumns = text.length * 5 + text.length - 1;
        let offset = -totalColumns / 2;
        for (const character of text) {
            glyphs[character].forEach((row, rowIndex) => {
                for (let column = 0; column < row.length; column++) {
                    if (row[column] !== "1") continue;
                    const xIndex = offset + column;
                    const yIndex = rowIndex;
                    fill.push([xIndex, yIndex, topY]);
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            const key = `${xIndex + dx},${yIndex + dy},${topY}`;
                            outline.set(key, [xIndex + dx, yIndex + dy, topY]);
                        }
                    }
                }
            });
            offset += 6;
        }
    };

    addLine("LET'S", 0.87);
    addLine("EAT!!!", 0.27);

    const addBox = (x, y, z, width, height, depth, color) => {
        const x0 = x - width / 2, x1 = x + width / 2;
        const y0 = y - height / 2, y1 = y + height / 2;
        const z0 = z - depth / 2, z1 = z + depth / 2;
        const sides = [
            { normal: [1, 0, 0], points: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]] },
            { normal: [-1, 0, 0], points: [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]] },
            { normal: [0, 1, 0], points: [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]] },
            { normal: [0, -1, 0], points: [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]] },
            { normal: [0, 0, 1], points: [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]] },
            { normal: [0, 0, -1], points: [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]] },
        ];
        sides.forEach(({ normal, points }) => {
            const start = vertices.length / 9;
            points.forEach(point => vertices.push(...point, ...color, ...normal));
            faces.push(start, start + 1, start + 2, start, start + 2, start + 3);
        });
    };
    const addPixel = ([column, row, topY], scale, zOffset, color) => {
        const x = column * cell + 0.04, y = topY - (row + 0.5) * cell;
        addBox(x, y, torsoSurfaceZ(x, y) + 0.07 + zOffset, cell * scale, cell * scale, 0.025, color);
    };

    outline.forEach(pixel => addPixel(pixel, 1.12, 0.035, [0.28, 0.08, 0.55]));
    fill.forEach(pixel => addPixel(pixel, 0.9, 0.055, [1.0, 0.82, 0.05]));
    return { vertices, faces };
}

/* ====== BADAN ======
   Torso pendek dan lebar dengan bahu, leher, dan pinggul.
   ellipsoid            : torso, bahu, pinggul, leher
   hyperboloid 1 sisi   : sambungan pinggang (cincin)
   elliptic cone        : (dipakai di dasi/tangan)
   elliptic paraboloid  : trapezius (kubah di pangkal leher)
   apron surface: panel depan torso */
export function buildBadan() {
    const kids = [
        node(buildTorsoSurface()),                                                                                       // torso dasar
        node(B.generateEllipsoidSurface({ a: 2.05, b: 0.56, c: 0.85, color: C.YELLOW }), [0, 1.55, -0.02]),          // garis bahu
        node(B.generateEllipsoidSurface({ a: 0.86, b: 0.4, c: 0.68, color: C.YELLOW }), [0, 2.1, 0]),                 // leher pendek
        node(B.generateEllipticParaboloid({ a: 1.1, b: 0.75, height: 0.5, color: C.YELLOW }), [0, 1.95, -0.1], [Math.PI, 0, 0]), // trapezius (kubah)
        node(B.generateEllipsoidSurface({ a: 1.55, b: 0.14, c: 0.88, color: C.DARK }), [0, -2.02, 0]),                 // celah gelap perut-pinggul
        node(B.generateEllipsoidSurface({ a: 1.7, b: 0.62, c: 0.96, color: C.YELLOW }), [0, -2.55, 0]),               // pinggul (pita lebar)
        node(buildApronSurface()),
        node(buildApronTextSurface()),
    ];
    return group([0, 0, 0], [0, 0, 0], kids,
        { animate: t => ({ pos: [0, 0.05 * sin(2 * t), 0], rot: [0, 0.08 * sin(t), 0] }) });
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
if (!window.CHICA_FULL && new URLSearchParams(location.search).get("part") === "badan") {
    if (document.readyState === "complete") main();
    else window.addEventListener("load", main);
}
