// MyObject.js  -  mengikuti Pertemuan 5 / MyObject.js (milik asdos)
//
// Alur "dari mana objek ini datang":
//   builders.js  -> membuat mesh {vertices, faces} (ellipsoid, hyperboloid, dst)
//   node(mesh)   -> membungkus mesh itu jadi 1 MyObject
//   group(...)   -> MyObject kosong (tanpa mesh) yang hanya jadi induk / pivot
//   childs       -> anak-anaknya, ikut bergerak mengikuti induk
import { LIBS } from "./libs.js";

function applyRotation(matrix, rotation) {
    if (Array.isArray(rotation)) {
        LIBS.rotateX(matrix, rotation[0]);
        LIBS.rotateY(matrix, rotation[1]);
        LIBS.rotateZ(matrix, rotation[2]);
        return;
    }
    if (rotation && typeof rotation === "object" && "axis" in rotation && "angle" in rotation) {
        LIBS.rotateArbitraryAxis(matrix, rotation.axis, rotation.angle);
        return;
    }
    throw new TypeError("Rotasi harus berupa [x, y, z] atau { axis, angle }.");
}

export class MyObject {
    GL = null;
    SHADER_PROGRAM = null;

    _position = null;
    _color = null;
    _normal = null;
    _MMatrix = null;

    OBJECT_VERTEX = null;
    OBJECT_FACES = null;

    vertex = [];
    faces = [];

    POSITION_MATRIX = LIBS.get_I4(); // Mpos  : posisi + rotasi awal (diam)
    MOVE_MATRIX = LIBS.get_I4();     // Mmove : gerakan animasi (diisi tiap frame)
    MODEL_MATRIX = LIBS.get_I4();    // hasil akhir = parent * Mpos * Mmove
    _tmp = LIBS.get_I4();            // buffer sementara untuk perkalian matriks

    childs = [];

    constructor(mesh = null, pos = [0, 0, 0], rot = [0, 0, 0], childs = [], animate = null, visible = null) {
        if (mesh) {
            this.vertex = mesh.vertices; // x,y,z, r,g,b, nx,ny,nz  (9 float per titik)
            this.faces = mesh.faces;
        }
        this.childs = childs;
        this.animate = animate;          // fungsi (t) => ({ pos, rot, scale }) atau null
        this.visible = visible;
        this.setPosition(pos, rot);
    }

    // Rotasi dapat berupa [x, y, z] atau { axis: [x, y, z], angle }.
    setPosition(pos, rot = this.rot, scale = this.scale ?? 1) {
        this.pos = pos;
        this.rot = rot;
        this.scale = scale;
        LIBS.set_I4(this.POSITION_MATRIX);
        applyRotation(this.POSITION_MATRIX, rot);
        if (scale !== 1) for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) this.POSITION_MATRIX[i] *= scale;   // skala seragam
        LIBS.set_position(this.POSITION_MATRIX, pos[0], pos[1], pos[2]);
    }

    // isi MOVE_MATRIX dari fungsi animate (dipanggil tiap frame)
    updateMove(time) {
        var a = this.animate(time) || {};
        var p = a.pos || [0, 0, 0];
        var r = a.rot === undefined ? [0, 0, 0] : a.rot;
        var scale = a.scale === undefined ? 1 : a.scale;
        if (!Number.isFinite(scale) || scale <= 0)
            throw new RangeError("Skala animasi harus berupa angka positif.");
        LIBS.set_I4(this.MOVE_MATRIX);
        applyRotation(this.MOVE_MATRIX, r);
        if (scale !== 1) for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) this.MOVE_MATRIX[i] *= scale;
        LIBS.set_position(this.MOVE_MATRIX, p[0], p[1], p[2]);
    }

    setup(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix) {
        this.GL = GL;
        this.SHADER_PROGRAM = SHADER_PROGRAM;
        this._position = _position;
        this._color = _color;
        this._normal = _normal;
        this._MMatrix = _Mmatrix;

        // group (tanpa mesh) tidak punya buffer
        if (this.vertex.length && this.faces.length) {
            this.OBJECT_VERTEX = this.GL.createBuffer();
            this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
            this.GL.bufferData(this.GL.ARRAY_BUFFER, new Float32Array(this.vertex), this.GL.STATIC_DRAW);

            this.OBJECT_FACES = this.GL.createBuffer();
            this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
            this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), this.GL.STATIC_DRAW);
        }

        this.childs.forEach(child => child.setup(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix));
    }

    render(PARENT_MATRIX, time = 0) {
        if (this.visible && !this.visible(time)) return;
        if (this.animate) this.updateMove(time);

        // Mmodel = Mmove * Mpos * Mparent (memakai buffer sementara, tidak ada array baru per frame)
        LIBS.multiplyInto(this._tmp, this.MOVE_MATRIX, this.POSITION_MATRIX);
        LIBS.multiplyInto(this.MODEL_MATRIX, this._tmp, PARENT_MATRIX);

        if (this.OBJECT_VERTEX) {
            this.GL.useProgram(this.SHADER_PROGRAM);
            this.GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);

            // 9 float per titik = 36 byte: posisi (0), warna (12), normal (24)
            this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
            this.GL.vertexAttribPointer(this._position, 3, this.GL.FLOAT, false, 4 * 9, 0);
            this.GL.vertexAttribPointer(this._color, 3, this.GL.FLOAT, false, 4 * 9, 4 * 3);
            this.GL.vertexAttribPointer(this._normal, 3, this.GL.FLOAT, false, 4 * 9, 4 * 6);

            this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
            this.GL.drawElements(this.GL.TRIANGLES, this.faces.length, this.GL.UNSIGNED_SHORT, 0);
        }

        this.childs.forEach(child => child.render(this.MODEL_MATRIX, time));
    }
}

// ---- pembantu singkat supaya pembuatan model tidak panjang ----
// node  : objek yang punya mesh (dari builders.js)
export const node = (mesh, pos = [0, 0, 0], rot = [0, 0, 0], extra = {}) =>
    new MyObject(mesh, pos, rot, [], extra.animate, extra.visible);

// group : objek kosong sebagai induk / titik engsel (pivot)
export const group = (pos = [0, 0, 0], rot = [0, 0, 0], childs = [], extra = {}) =>
    new MyObject(null, pos, rot, childs, extra.animate, extra.visible);

// place : pindahkan posisi/rotasi objek yang sudah jadi
export const place = (object, pos, rot, scale) => {
    object.setPosition(pos, rot || object.rot, scale);
    return object;
};
