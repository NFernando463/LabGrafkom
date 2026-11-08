/* scene.js - node hierarki (mesh + posisi + rotasi + animasi + anak) */
import * as T from "./transform.js";

export class MyObject {
    constructor(mesh = null, pos = [0, 0, 0], rot = [0, 0, 0], children = [], extra = {}) {
        this.GL = null;
        this.SHADER_PROGRAM = null;
        this._position = null;
        this._color = null;
        this._normal = null;
        this._MMatrix = null;
        this.OBJECT_VERTEX = null;
        this.OBJECT_FACES = null;
        this.vertex = mesh ? mesh.vertices : [];
        this.faces = mesh ? mesh.faces : [];
        this.POSITION_MATRIX = T.compose(pos, rot);
        this.MOVE_MATRIX = T.I4();
        this.MODEL_MATRIX = T.I4();
        this.childs = children;
        this.mesh = mesh;
        this.pos = pos;
        this.rot = rot;
        this.animate = extra.animate;
        this.buf = null;
    }

    get children() {
        return this.childs;
    }

    set children(value) {
        this.childs = value;
    }

    setup(GL, SHADER_PROGRAM, locations) {
        this.GL = GL;
        this.SHADER_PROGRAM = SHADER_PROGRAM;
        this._position = locations.position;
        this._color = locations.color;
        this._normal = locations.normal;
        this._MMatrix = locations.Mmatrix;

        if (this.vertex.length && this.faces.length) {
            this.OBJECT_VERTEX = GL.createBuffer();
            GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
            GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(this.vertex), GL.STATIC_DRAW);
            this.OBJECT_FACES = GL.createBuffer();
            GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
            GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.faces), GL.STATIC_DRAW);
            this.buf = { vb: this.OBJECT_VERTEX, fb: this.OBJECT_FACES, count: this.faces.length };
        }
        this.childs.forEach(child => child.setup(GL, SHADER_PROGRAM, locations));
    }

    render(PARENT_MATRIX, time = 0) {
        const animation = this.animate ? this.animate(time) : null;
        const position = this.pos || [0, 0, 0];
        const rotation = this.rot || [0, 0, 0];
        const offsetPosition = (animation && animation.pos) || [0, 0, 0];
        const offsetRotation = (animation && animation.rot) || [0, 0, 0];
        const local = T.compose(
            [
                position[0] + offsetPosition[0],
                position[1] + offsetPosition[1],
                position[2] + offsetPosition[2],
            ],
            [
                rotation[0] + offsetRotation[0],
                rotation[1] + offsetRotation[1],
                rotation[2] + offsetRotation[2],
            ]
        );
        this.MODEL_MATRIX = T.mul(PARENT_MATRIX, T.mul(this.MOVE_MATRIX, local));

        if (this.OBJECT_VERTEX) {
            const GL = this.GL;
            GL.useProgram(this.SHADER_PROGRAM);
            GL.bindBuffer(GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
            GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 4 * 9, 0);
            GL.vertexAttribPointer(this._color, 3, GL.FLOAT, false, 4 * 9, 4 * 3);
            GL.vertexAttribPointer(this._normal, 3, GL.FLOAT, false, 4 * 9, 4 * 6);
            GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
            GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);
            GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);
        }

        this.childs.forEach(child => child.render(this.MODEL_MATRIX, time));
    }

    setPosition(pos, rot = this.rot) {
        this.pos = pos;
        this.rot = rot;
        this.POSITION_MATRIX = T.compose(pos, rot);
    }
}

export const node = (mesh, pos = [0, 0, 0], rot = [0, 0, 0], extra = {}) =>
    new MyObject(mesh, pos, rot, [], extra);

export const group = (pos = [0, 0, 0], rot = [0, 0, 0], children = [], extra = {}) =>
    new MyObject(null, pos, rot, children, extra);

export const place = (object, pos, rot) => {
    object.setPosition(pos, rot || object.rot);
    return object;
};