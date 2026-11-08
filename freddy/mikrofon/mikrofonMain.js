// mikrofon/main.js  (bisa dilihat sendiri: index.html?part=mikrofon)
import { LIBS } from "../helpers/libs.js";
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";

const C = B.COLORS;
const sin = Math.sin;


// kabel mikrofon berbentuk tabung mengikuti kurva bezier 3d
function generateMicrophoneCable() {
    const start = [0, -0.88, 0];
    const control1 = [-0.08, -1.22, 0.04];
    const control2 = [-0.62, -1.32, 0.24];
    const end = [-0.72, -1.82, 0.38];
    const segments = 48;
    const sides = 12;
    const radius = 0.045;
    const cableColor = [0.035, 0.035, 0.045];
    const vertices = [];
    const faces = [];
    const rings = [];

    const cross = (a, b) => [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
    const normalize = (v) => {
        const length = Math.hypot(v[0], v[1], v[2]);
        return length > 1e-8 ? v.map(value => value / length) : [0, 1, 0];
    };

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const s = 1 - t;
        const point = [0, 1, 2].map(axis =>
            s ** 3 * start[axis] +
            3 * s ** 2 * t * control1[axis] +
            3 * s * t ** 2 * control2[axis] +
            t ** 3 * end[axis]
        );
        const tangent = normalize([0, 1, 2].map(axis =>
            3 * s ** 2 * (control1[axis] - start[axis]) +
            6 * s * t * (control2[axis] - control1[axis]) +
            3 * t ** 2 * (end[axis] - control2[axis])
        ));

        // pilih sumbu acuan yang tidak sejajar dengan arah kabel
        const reference = Math.abs(tangent[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1];
        const normal = normalize(cross(tangent, reference));
        const binormal = normalize(cross(tangent, normal));
        const ringStart = vertices.length / 9;
        rings.push(ringStart);

        for (let j = 0; j <= sides; j++) {
            const angle = (2 * Math.PI * j) / sides;
            const cosAngle = Math.cos(angle);
            const sinAngle = Math.sin(angle);
            const nx = normal[0] * cosAngle + binormal[0] * sinAngle;
            const ny = normal[1] * cosAngle + binormal[1] * sinAngle;
            const nz = normal[2] * cosAngle + binormal[2] * sinAngle;

            vertices.push(
                point[0] + radius * nx,
                point[1] + radius * ny,
                point[2] + radius * nz,
                cableColor[0], cableColor[1], cableColor[2],
                nx, ny, nz
            );
        }
    }

    // hubungkan setiap cincin menjadi tabung
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < sides; j++) {
            const a = rings[i] + j;
            const b = rings[i + 1] + j;
            faces.push(a, b, a + 1, b, b + 1, a + 1);
        }
    }

    // tutup kedua ujung tabung agar tidak terlihat berlubang
    const addCap = (ringStart, point, normal) => {
        const centerIndex = vertices.length / 9;
        vertices.push(
            point[0], point[1], point[2],
            cableColor[0], cableColor[1], cableColor[2],
            normal[0], normal[1], normal[2]
        );
        for (let j = 0; j < sides; j++) {
            const current = ringStart + j;
            const next = ringStart + j + 1;
            faces.push(centerIndex, current, next);
        }
    };

    addCap(rings[0], start, [0, 1, 0]);
    addCap(rings[rings.length - 1], end, [0, -1, 0]);

    return { vertices, faces };
}

/* ====== MIKROFON FREDDY ======
   Dibangun sepanjang sumbu Y (kepala mic di atas, gagang di bawah).
   ellipsoid           : kepala mic, tombol, ujung gagang
   hyperboloid 1 sisi  : gagang (sedikit melangsing di tengah) & cincin
   elliptic cone       : penyangga kepala mic
   hyperboloid 2 sisi  : tutup kepala mic (kubah) */
export function buildMikrofon() {
    const metal = C.METAL;
    const grid = [];
    // jaring kepala mic: cincin tipis horizontal
    [-0.18, 0, 0.18].forEach(y =>
        grid.push(node(B.generateHyperboloidOneSheet({ a: 0.5, b: 0.02, c: 0.5, uMax: 0.5, color: metal }), [0, 1.55 + y, 0])));
    return group([0, 0, 0], [0, 0, 0], [
        node(B.generateHyperboloidOneSheet({ a: 0.2, b: 0.9, c: 0.2, uMax: 1, color: C.BLACK }), [0, 0, 0]),   // gagang
        node(B.generateEllipsoidSurface({ a: 0.24, b: 0.14, c: 0.24, color: C.DARK }), [0, -0.92, 0]),        // ujung gagang
        node(generateMicrophoneCable(), [0, 0, 0]), // kabel melengkung di ujung mikrofon
        node(B.generateHyperboloidOneSheet({ a: 0.26, b: 0.05, c: 0.26, uMax: 0.8, color: metal }), [0, 0.6, 0]), // cincin logam
        node(B.generateEllipsoidSurface({ a: 0.1, b: 0.06, c: 0.05, color: C.RED }), [0, 0.38, 0.2]),         // tombol on/off (tepat di atas genggaman)
        node(B.generateEllipticCone({ a: 0.6, b: 0.6, height: -0.15, color: metal }), [0, 1.05, 0], [Math.PI, 0, 0]), // penyangga
        node(B.generateEllipsoidSurface({ a: 0.5, b: 0.55, c: 0.5, color: [0.35, 0.35, 0.4] }), [0, 1.55, 0]), // kepala mic
        ...grid,
        node(B.generateHyperboloidTwoSheets({ a: 0.12, b: 0.05, c: 0.12, uMax: 0.8, sheet: 1, color: metal }), [0, 1.98, 0]), // tutup atas
    ]);   // kaku: tidak punya animasi sendiri, ikut gerakan tangan yang memegangnya
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
    LIBS.translateZ(VIEWMATRIX, -14);

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
    var ROOT = place(buildMikrofon(), [-1.5, 0, 0]);
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

// jalan sendiri kalau dibuka lewat index.html?part=mikrofon
if (!window.FREDDY_FULL && new URLSearchParams(location.search).get("part") === "mikrofon") {
    if (document.readyState === "complete") main();
    else window.addEventListener("load", main);
}
