// libs.js  -  sama dengan Pertemuan 4 / Pertemuan 5 (libs.js milik asdos)
// kasih "export" kalau live server (module), hapus "export" kalau pakai f5
export var LIBS = {
    degToRad: function (angle) {
        return (angle * Math.PI / 180);
    },


    get_projection: function (angle, a, zMin, zMax) {
        var tan = Math.tan(LIBS.degToRad(0.5 * angle)),
            A = -(zMax + zMin) / (zMax - zMin),
            B = (-2 * zMax * zMin) / (zMax - zMin);


        return [
            0.5 / tan, 0, 0, 0,
            0, 0.5 * a / tan, 0, 0,
            0, 0, A, -1,
            0, 0, B, 0
        ];
    },


    get_I4: function () {
        return [1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1];
    },


    set_I4: function (m) {
        m[0] = 1, m[1] = 0, m[2] = 0, m[3] = 0,
            m[4] = 0, m[5] = 1, m[6] = 0, m[7] = 0,
            m[8] = 0, m[9] = 0, m[10] = 1, m[11] = 0,
            m[12] = 0, m[13] = 0, m[14] = 0, m[15] = 1;
    },


    rotateX: function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var mv1 = m[1], mv5 = m[5], mv9 = m[9];
        m[1] = m[1] * c - m[2] * s;
        m[5] = m[5] * c - m[6] * s;
        m[9] = m[9] * c - m[10] * s;


        m[2] = m[2] * c + mv1 * s;
        m[6] = m[6] * c + mv5 * s;
        m[10] = m[10] * c + mv9 * s;
    },


    rotateY: function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var mv0 = m[0], mv4 = m[4], mv8 = m[8];
        m[0] = c * m[0] + s * m[2];
        m[4] = c * m[4] + s * m[6];
        m[8] = c * m[8] + s * m[10];


        m[2] = c * m[2] - s * mv0;
        m[6] = c * m[6] - s * mv4;
        m[10] = c * m[10] - s * mv8;
    },


    rotateZ: function (m, angle) {
        var c = Math.cos(angle);
        var s = Math.sin(angle);
        var mv0 = m[0], mv4 = m[4], mv8 = m[8];
        m[0] = c * m[0] - s * m[1];
        m[4] = c * m[4] - s * m[5];
        m[8] = c * m[8] - s * m[9];


        m[1] = c * m[1] + s * mv0;
        m[5] = c * m[5] + s * mv4;
        m[9] = c * m[9] + s * mv8;
    },

    rotateArbitraryAxis: function (m, axis, angle) {
        if ((!Array.isArray(axis) && !ArrayBuffer.isView(axis)) || axis.length !== 3 ||
            !Array.from(axis).every(Number.isFinite) || !Number.isFinite(angle))
            throw new TypeError("Sumbu rotasi harus berisi tiga angka dan sudut harus berupa angka.");

        var length = Math.hypot(axis[0], axis[1], axis[2]);
        if (length === 0) throw new RangeError("Sumbu rotasi tidak boleh berupa vektor nol.");

        var x = axis[0] / length, y = axis[1] / length, z = axis[2] / length;
        var c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
        var r00 = t * x * x + c, r01 = t * x * y - s * z, r02 = t * x * z + s * y;
        var r10 = t * x * y + s * z, r11 = t * y * y + c, r12 = t * y * z - s * x;
        var r20 = t * x * z - s * y, r21 = t * y * z + s * x, r22 = t * z * z + c;

        for (var row = 0; row < 3; row++) {
            var i = row, j = 4 + row, k = 8 + row;
            var a = m[i], b = m[j], d = m[k];
            m[i] = a * r00 + b * r10 + d * r20;
            m[j] = a * r01 + b * r11 + d * r21;
            m[k] = a * r02 + b * r12 + d * r22;
        }
        return m;
    },

    translateZ: function (m, t) {
        m[14] += t;
    },
    translateX: function (m, t) {
        m[12] += t;
    },
    translateY: function (m, t) {
        m[13] += t;
    },


    set_position: function (m, x, y, z) {
        m[12] = x, m[13] = y, m[14] = z;
    },

    // ----- tambahan dari Pertemuan 5 (untuk hierarki objek / OOP) -----
    scaleX: function (m, t) {
        m[0] *= t;
    },
    scaleY: function (m, t) {
        m[5] *= t;
    },
    scaleZ: function (m, t) {
        m[10] *= t;
    },

    // hasil = m1 * m2 ditulis ke `out` (tanpa alokasi array baru; out tidak boleh sama dengan m1/m2)
    multiplyInto: function (out, m1, m2) {
        for (var i = 0; i < 4; i++)
            for (var j = 0; j < 4; j++)
                out[i * 4 + j] = m1[i * 4] * m2[j] + m1[i * 4 + 1] * m2[4 + j] +
                                 m1[i * 4 + 2] * m2[8 + j] + m1[i * 4 + 3] * m2[12 + j];
        return out;
    },

    multiply: function (m1, m2) {
        var rm = this.get_I4();
        var N = 4;
        for (var i = 0; i < N; i++) {
            for (var j = 0; j < N; j++) {
                rm[i * N + j] = 0;
                for (var k = 0; k < N; k++)
                    rm[i * N + j] += m1[i * N + k] * m2[k * N + j];
            }
        }
        return rm;
    }
};
