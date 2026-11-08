/* transform.js - matriks 4x4 column-major (sesuai uniformMatrix4fv) */
export const I4 = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

// hasil = a * b
export function mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++) {
            let s = 0;
            for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
            o[c * 4 + r] = s;
        }
    return o;
}
export const rotX = t => { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); };
export const rotY = t => { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); };
export const rotZ = t => { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); };
export const translate = (x, y, z) => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);

// T * Rz * Ry * Rx
export function compose(pos, rot) {
    return mul(translate(pos[0], pos[1], pos[2]), mul(rotZ(rot[2]), mul(rotY(rot[1]), rotX(rot[0]))));
}
