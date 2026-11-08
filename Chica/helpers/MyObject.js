// MyObject.js  -  mengikuti Pertemuan 5 / MyObject.js (milik asdos)
//
// Alur "dari mana objek ini datang":
//   builders.js  -> membuat mesh {vertices, faces} (ellipsoid, hyperboloid, dst)
//   node(mesh)   -> membungkus mesh itu jadi 1 MyObject
//   group(...)   -> MyObject kosong (tanpa mesh) yang hanya jadi induk / pivot
//   childs       -> anak-anaknya, ikut bergerak mengikuti induk
import { LIBS } from "./libs.js";

// kali dua matriks 4x4 (column-major, sama seperti yang dibaca WebGL): hasil = a * b
function mul4(a, b) {
    var o = new Array(16).fill(0);
    for (var c = 0; c < 4; c++)
        for (var r = 0; r < 4; r++)
            for (var k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
}

// ROTASI SUMBU BEBAS (rumus Rodrigues): putar sebesar `angle` mengelilingi sumbu [x,y,z] sembarang.
// R = cos(a)*I + sin(a)*[k]x + (1-cos(a)) * k k^T   dengan k = sumbu yang sudah dinormalisasi
function rotateAxis(axis, angle) {
    var len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
    var x = axis[0] / len, y = axis[1] / len, z = axis[2] / len;
    var c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
    return [
        t * x * x + c,     t * x * y + s * z, t * x * z - s * y, 0,   // kolom 0
        t * x * y - s * z, t * y * y + c,     t * y * z + s * x, 0,   // kolom 1
        t * x * z + s * y, t * y * z - s * x, t * z * z + c,     0,   // kolom 2
        0, 0, 0, 1,
    ];
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
    // animate(t) boleh mengembalikan: pos [x,y,z], rot [rx,ry,rz],
    //   axis [x,y,z] + angle (rotasi sumbu bebas), scale [sx,sy,sz]
    // urutan: MOVE = Translate * RotasiSumbuBebas * RotasiXYZ * Scale
    updateMove(time) {
        var a = this.animate(time) || {};
        var p = a.pos || [0, 0, 0];
        var r = a.rot || [0, 0, 0];
        LIBS.set_I4(this.MOVE_MATRIX);
        LIBS.rotateX(this.MOVE_MATRIX, r[0]);
        LIBS.rotateY(this.MOVE_MATRIX, r[1]);
        LIBS.rotateZ(this.MOVE_MATRIX, r[2]);

        // rotasi mengelilingi sumbu sembarang
        if (a.axis && a.angle) {
            this.MOVE_MATRIX = mul4(rotateAxis(a.axis, a.angle), this.MOVE_MATRIX);
        }

        // scaling: kolom ke-j matriks dikali skala sumbu ke-j
        if (a.scale) {
            for (var j = 0; j < 3; j++)
                for (var i = 0; i < 3; i++) this.MOVE_MATRIX[j * 4 + i] *= a.scale[j];
        }

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
