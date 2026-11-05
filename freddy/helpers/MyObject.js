// MyObject.js  -  mengikuti Pertemuan 5 / MyObject.js (milik asdos)
//
// Alur "dari mana objek ini datang":
//   builders.js  -> membuat mesh {vertices, faces} (ellipsoid, hyperboloid, dst)
//   node(mesh)   -> membungkus mesh itu jadi 1 MyObject
//   group(...)   -> MyObject kosong (tanpa mesh) yang hanya jadi induk / pivot
//   childs       -> anak-anaknya, ikut bergerak mengikuti induk
import { LIBS } from "./libs.js";

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

    childs = [];

    constructor(mesh = null, pos = [0, 0, 0], rot = [0, 0, 0], childs = [], animate = null) {
        if (mesh) {
            this.vertex = mesh.vertices; // x,y,z, r,g,b, nx,ny,nz  (9 float per titik)
            this.faces = mesh.faces;
        }
        this.childs = childs;
        this.animate = animate;          // fungsi (t) => ({ pos, rot }) atau null
        this.setPosition(pos, rot);
    }

    // isi POSITION_MATRIX: rotasi X -> Y -> Z, lalu geser ke pos
    setPosition(pos, rot = this.rot) {
        this.pos = pos;
        this.rot = rot;
        LIBS.set_I4(this.POSITION_MATRIX);
        LIBS.rotateX(this.POSITION_MATRIX, rot[0]);
        LIBS.rotateY(this.POSITION_MATRIX, rot[1]);
        LIBS.rotateZ(this.POSITION_MATRIX, rot[2]);
        LIBS.set_position(this.POSITION_MATRIX, pos[0], pos[1], pos[2]);
    }

    // isi MOVE_MATRIX dari fungsi animate (dipanggil tiap frame)
    updateMove(time) {
        var a = this.animate(time) || {};
        var p = a.pos || [0, 0, 0];
        var r = a.rot || [0, 0, 0];
        LIBS.set_I4(this.MOVE_MATRIX);
        LIBS.rotateX(this.MOVE_MATRIX, r[0]);
        LIBS.rotateY(this.MOVE_MATRIX, r[1]);
        LIBS.rotateZ(this.MOVE_MATRIX, r[2]);
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
        if (this.animate) this.updateMove(time);

        this.MODEL_MATRIX = LIBS.multiply(this.MOVE_MATRIX, this.POSITION_MATRIX);
        this.MODEL_MATRIX = LIBS.multiply(this.MODEL_MATRIX, PARENT_MATRIX);

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
    new MyObject(mesh, pos, rot, [], extra.animate);

// group : objek kosong sebagai induk / titik engsel (pivot)
export const group = (pos = [0, 0, 0], rot = [0, 0, 0], childs = [], extra = {}) =>
    new MyObject(null, pos, rot, childs, extra.animate);

// place : pindahkan posisi/rotasi objek yang sudah jadi
export const place = (object, pos, rot) => {
    object.setPosition(pos, rot || object.rot);
    return object;
};
