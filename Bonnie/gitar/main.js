// gitar/main.js  (bisa dilihat sendiri: index.html?part=gitar)
import * as B from "../helpers/builders.js";
import { node, group, place } from "../helpers/MyObject.js";

const C = B.COLORS;

function makeGuitarBody() {
    const points = [
        [0.5, 0.45], [0.05, 0.9], [-2.9, 1.45], [-1.15, 0],
        [-2.9, -1.45], [0.05, -0.9], [0.5, -0.45],
    ];
    const center = [-0.1, 0];
    const halfDepth = 0.38;
    const vertices = [];
    const faces = [];
    const addVertex = (x, y, z, normal) => {
        const index = vertices.length / 9;
        vertices.push(x, y, z, C.RED[0], C.RED[1], C.RED[2], ...normal);
        return index;
    };

    const front = points.map(([x, y]) => addVertex(x, y, halfDepth, [0, 0, 1]));
    const back = points.map(([x, y]) => addVertex(x, y, -halfDepth, [0, 0, -1]));
    const frontCenter = addVertex(center[0], center[1], halfDepth, [0, 0, 1]);
    const backCenter = addVertex(center[0], center[1], -halfDepth, [0, 0, -1]);

    for (let i = 0; i < points.length; i++) {
        const next = (i + 1) % points.length;
        faces.push(
            frontCenter, front[i], front[next],
            backCenter, back[next], back[i]
        );

        const [x1, y1] = points[i];
        const [x2, y2] = points[next];
        const length = Math.hypot(x2 - x1, y2 - y1);
        const normal = [(y2 - y1) / length, -(x2 - x1) / length, 0];
        const sideVertices = [
            addVertex(x1, y1, halfDepth, normal),
            addVertex(x1, y1, -halfDepth, normal),
            addVertex(x2, y2, -halfDepth, normal),
            addVertex(x2, y2, halfDepth, normal),
        ];
        faces.push(
            sideVertices[0], sideVertices[1], sideVertices[2],
            sideVertices[0], sideVertices[2], sideVertices[3]
        );
    }

    return { vertices, faces };
}

/* ====== GITAR "FLYING V" ======
   hyperboloid 1 sisi   : leher
   elliptic cone        : ujung runcing seperti mata panah
   badan poligon tebal  : siluet V yang tertutup */
export function buildGitar() {
    const H = Math.PI / 2;
    const metal = [0.62, 0.6, 0.65];
    const strings = [-0.105, -0.035, 0.035, 0.105].flatMap(y => [
        node(B.generateEllipsoidSurface({ a: 0.3, b: 0.014, c: 0.018, color: metal }), [-0.08, y, 0.45]),
        node(B.generateEllipsoidSurface({ a: 2.28, b: 0.014, c: 0.018, color: metal }), [2.48, y, 0.2]),
    ]);
    const frets = Array.from({ length: 10 }, (_, i) =>
        node(B.generateEllipsoidSurface({ a: 0.018, b: 0.15, c: 0.025, color: metal }), [0.65 + i * 0.36, 0, 0.21]));
    return group([0, 0, 0], [0, 0, 0], [
        node(B.generateHyperboloidOneSheet({ a: 0.2, b: 2.13, c: 0.2, uMax: 1, color: C.BLACK }), [2.2, 0, 0], [0, 0, -H]),
        node(B.generateEllipticCone({ a: 0.52, b: 0.16, height: 1.0, color: C.BLACK }), [5.6, 0, 0], [0, 0, H]),
        node(makeGuitarBody()),
        node(B.generateEllipsoidSurface({ a: 0.11, b: 0.48, c: 0.09, color: C.BLACK }), [-0.42, 0, 0.39]), // bridge
        node(B.generateEllipsoidSurface({ a: 0.12, b: 0.34, c: 0.08, color: C.BLACK }), [-0.85, 0, 0.39]), // pickup
        ...strings,
        ...frets,
        ...[-0.34, -0.11, 0.11, 0.34].map(y =>
            node(B.generateEllipsoidSurface({ a: 0.09, b: 0.075, c: 0.07, color: metal }), [5.62, y, 0])),
    ]);
}
