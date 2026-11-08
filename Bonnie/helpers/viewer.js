// viewer.js - satu-satunya tempat shader, kamera orbit, kontrol mouse/touch, dan loop render.
// Dipakai oleh bonnie/main.js dan stage/main.js (sebelumnya kode ini disalin di 10 file).
//
// Kamera memutar DUNIA lewat view matrix (bukan model matrix), jadi lampu tetap diam
// di dunia dan bayangan/kilau di tubuh Bonnie tidak ikut berputar saat di-drag.
import { LIBS } from "./libs.js";

const VERTEX = `
attribute vec3 position;
attribute vec3 color;
attribute vec3 normal;
uniform mat4 Pmatrix, Vmatrix, Mmatrix;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWorld;
void main(void) {
    vec4 w = Mmatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vColor = color;
    vNormal = (Mmatrix * vec4(normal, 0.0)).xyz;
    gl_Position = Pmatrix * Vmatrix * w;
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;     // harus sama dengan vertex shader (uniform Vmatrix dipakai di keduanya)
#else
precision mediump float;
#endif
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWorld;
uniform mat4 Vmatrix;
uniform vec3 uAmbient, uKey, uKeyDir, uFill, uFogColor, uSpotColor;
uniform vec3 uSpotPos[3];     // sampai 3 lampu sorot (panggung dengan 3 karakter)
uniform float uSpot[3];       // kekuatan tiap lampu sorot (0 = mati)
uniform float uRim, uSpec, uFog, uSpotCos;
void main(void) {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uKeyDir);
    vec3 F = normalize(vec3(-0.6, -0.2, 0.5));
    float nl = dot(N, L);
    float key = mix(max(nl, 0.0), max(nl * 0.5 + 0.5, 0.0), 0.2);      // sedikit wrap-light agar bayangan lembut
    vec3 lit = uAmbient * (1.0 + 0.43 * N.y) + uKey * key + uFill * max(dot(N, F), 0.0);

    vec3 viewPos = (Vmatrix * vec4(vWorld, 1.0)).xyz;
    vec3 vN = (Vmatrix * vec4(N, 0.0)).xyz;
    vec3 vL = (Vmatrix * vec4(L, 0.0)).xyz;
    vec3 H = normalize(vL + normalize(-viewPos));
    float rim = pow(1.0 - max(vN.z, 0.0), 3.0) * uRim;                  // rim light mengikuti kamera
    float spec = pow(max(dot(vN, H), 0.0), 28.0) * uSpec;

    // lampu sorot dari atas (arah lurus ke bawah), tepi lembut
    vec3 spot = vec3(0.0);
    for (int i = 0; i < 3; i++) {
        vec3 d = normalize(vWorld - uSpotPos[i]);
        float cone = smoothstep(uSpotCos, uSpotCos + 0.07, dot(d, vec3(0.0, -1.0, 0.0))) * uSpot[i];
        spot += uSpotColor * cone * (0.45 + 0.55 * max(N.y, 0.0));
    }

    vec3 c = vColor * (lit + spot) + vec3(rim * 0.55, rim * 0.5, rim) + vec3(spec);
    float dist = length(viewPos);
    c = mix(c, uFogColor, 1.0 - exp(-uFog * uFog * dist * dist));       // kabut jarak
    gl_FragColor = vec4(c, 1.0);
}`;

const DEFAULT_LIGHT = {
    ambient: [0.28, 0.28, 0.28], key: [0.8, 0.8, 0.8], keyDir: [0.35, 0.6, 0.75],
    fill: [0.25, 0.25, 0.25], rim: 0.18, spec: 0.12, fog: 0, fogColor: [0.02, 0.02, 0.025],
    spot: 0, spotPos: [0, 10, 3], spotColor: [1.0, 0.82, 0.6], spotCos: 0.93,
    spot2: 0, spotPos2: [0, 10, 3], spot3: 0, spotPos3: [0, 10, 3],   // lampu sorot ke-2 dan ke-3 (opsional)
};

function compile(gl, type, source, label) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(`Shader ${label} gagal: ${gl.getShaderInfoLog(shader)}`);
    return shader;
}

/**
 * startViewer({ canvas, root, bg, cam, light, autoRotate, pitchLimit, onFrame })
 *  - cam   : { dist, y, x, fov, zoom }  (boleh diubah tiap frame lewat onFrame)
 *  - light : lihat DEFAULT_LIGHT (juga boleh diubah tiap frame)
 *  - onFrame(now, dt, api) : hook animasi; api = { cam, light, view, setBackground }
 */
export function startViewer({ canvas, root, bg = [0.02, 0.02, 0.025], cam = {}, light = {}, autoRotate = 0, pitchLimit = 1.35, onFrame = null }) {
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) throw new Error("WebGL tidak dapat diinisialisasi di browser ini.");

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX, "vertex"));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT, "fragment"));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error("Link shader gagal: " + gl.getProgramInfoLog(program));
    gl.useProgram(program);

    const attr = name => { const a = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(a); return a; };
    const uni = name => gl.getUniformLocation(program, name);
    const aPos = attr("position"), aCol = attr("color"), aNor = attr("normal");
    const uP = uni("Pmatrix"), uV = uni("Vmatrix"), uM = uni("Mmatrix");
    const U = {};
    ["uAmbient", "uKey", "uKeyDir", "uFill", "uFogColor", "uSpotPos", "uSpotColor", "uRim", "uSpec", "uFog", "uSpot", "uSpotCos"].forEach(n => { U[n] = uni(n); });   // lokasi uniform di-cache sekali

    const state = { dist: 12, y: 0, x: 0, fov: 40, zoom: 1, ...cam };
    const lights = { ...DEFAULT_LIGHT, ...light };
    ["spotPos", "spotPos2", "spotPos3"].forEach(k => { lights[k] = lights[k].slice(); });   // salinan sendiri, supaya tidak mengubah DEFAULT_LIGHT
    const spotPosAll = new Float32Array(9), spotAll = new Float32Array(3);
    const view = LIBS.get_I4(), proj = LIBS.get_I4(), world = LIBS.get_I4();

    // ---------- kontrol: drag / touch (pointer events) + inersia + scroll zoom ----------
    let yaw = 0, pitch = 0, vYaw = 0, vPitch = 0, drag = false, px = 0, py = 0, idleSince = 0;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", e => {
        drag = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId);
    });
    const release = () => { drag = false; idleSince = performance.now(); };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("pointermove", e => {
        if (!drag) return;
        vYaw = (e.clientX - px) * Math.PI / Math.max(canvas.clientWidth, 1);
        vPitch = (e.clientY - py) * Math.PI / Math.max(canvas.clientHeight, 1);
        yaw += vYaw;
        pitch = clamp(pitch + vPitch, -pitchLimit, pitchLimit);
        px = e.clientX; py = e.clientY;
    });
    canvas.addEventListener("wheel", e => {
        e.preventDefault();
        userZoom = clamp(userZoom * Math.exp(e.deltaY * 0.001), 0.45, 1.8);
    }, { passive: false });
    canvas.addEventListener("dblclick", () => { yaw = pitch = vYaw = vPitch = 0; userZoom = 1; });
    let userZoom = 1;

    // ---------- ukuran canvas (tajam di layar retina, ikut resize) ----------
    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
        const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
    window.addEventListener("resize", resize);

    root.setup(gl, program, aPos, aCol, aNor, uM);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(bg[0], bg[1], bg[2], 1);

    let last = null;
    function frame(ms) {
        const now = ms * 0.001;
        const dt = last === null ? 0.016 : Math.min(now - last, 0.05);
        last = now;
        resize();

        if (!drag) {                                    // inersia setelah dilepas (tidak tergantung FPS)
            const k = dt * 60;
            yaw += vYaw * k; pitch = clamp(pitch + vPitch * k, -pitchLimit, pitchLimit);
            const decay = Math.pow(0.046, dt);
            vYaw *= decay; vPitch *= decay;
            if (autoRotate && performance.now() - idleSince > 2500) yaw += autoRotate * dt;
        }

        if (onFrame) onFrame(now, dt, {
            cam: state,
            light: lights,
            view: { get yaw() { return yaw; } },
            setBackground: color => gl.clearColor(color[0], color[1], color[2], 1),
        });

        // view = T * Rx(pitch) * Ry(yaw)   (dunia berputar di depan kamera)
        LIBS.set_I4(view);
        LIBS.rotateY(view, yaw + (state.yaw || 0));
        LIBS.rotateX(view, pitch + (state.pitch || 0));
        LIBS.set_position(view, state.x, state.y, -state.dist * userZoom * state.zoom);

        const p = LIBS.get_projection(state.fov, canvas.width / canvas.height, 1, 120);
        for (let i = 0; i < 16; i++) proj[i] = p[i];

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(uP, false, proj);
        gl.uniformMatrix4fv(uV, false, view);
        gl.uniform3fv(U.uAmbient, lights.ambient);
        gl.uniform3fv(U.uKey, lights.key);
        gl.uniform3fv(U.uKeyDir, lights.keyDir);
        gl.uniform3fv(U.uFill, lights.fill);
        gl.uniform3fv(U.uFogColor, lights.fogColor);
        spotPosAll.set(lights.spotPos, 0); spotPosAll.set(lights.spotPos2, 3); spotPosAll.set(lights.spotPos3, 6);
        spotAll[0] = lights.spot; spotAll[1] = lights.spot2; spotAll[2] = lights.spot3;
        gl.uniform3fv(U.uSpotPos, spotPosAll);
        gl.uniform3fv(U.uSpotColor, lights.spotColor);
        gl.uniform1f(U.uRim, lights.rim);
        gl.uniform1f(U.uSpec, lights.spec);
        gl.uniform1f(U.uFog, lights.fog);
        gl.uniform1fv(U.uSpot, spotAll);
        gl.uniform1f(U.uSpotCos, lights.spotCos);

        LIBS.set_I4(world);
        root.render(world, now);
        requestAnimationFrame(frame);
    }
    resize();
    requestAnimationFrame(frame);
    return { cam: state, light: lights };
}
