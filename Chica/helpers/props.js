import * as B from "../helpers/builders.js";
import { node, group } from "../helpers/MyObject.js";

export function buildPiringCupcake() {
    const wrapper = [
        node(B.generateEllipsoidSurface({ a: 0.39, b: 0.35, c: 0.39, color: [0.52, 0.19, 0.07] }), [0, 0.37, 0]),
        ...Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            return node(
                B.generateEllipsoidSurface({ a: 0.024, b: 0.3, c: 0.024, color: i % 2 ? [0.82, 0.36, 0.08] : [0.68, 0.25, 0.045] }),
                [Math.cos(angle) * 0.35, 0.38, Math.sin(angle) * 0.35],
                [0, -angle, 0]
            );
        }),
    ];
    const frosting = [
        node(B.generateEllipsoidSurface({ a: 0.49, b: 0.24, c: 0.45, color: [0.84, 0.08, 0.48] }), [0, 0.7, 0]),
        ...Array.from({ length: 9 }, (_, i) => {
            const angle = (i / 9) * Math.PI * 2;
            return node(
                B.generateEllipsoidSurface({ a: 0.16, b: 0.15, c: 0.16, color: [0.84, 0.08, 0.48] }),
                [Math.cos(angle) * 0.39, 0.62, Math.sin(angle) * 0.36]
            );
        }),
    ];
    const candle = [
        node(B.generateEllipsoidSurface({ a: 0.045, b: 0.37, c: 0.045, color: [0.95, 0.84, 0.2] }), [0, 1.28, 0]),
        ...Array.from({ length: 7 }, (_, i) =>
            node(
                B.generateEllipsoidSurface({ a: 0.048, b: 0.035, c: 0.048, color: i % 2 ? [0.92, 0.92, 0.72] : [0.88, 0.68, 0.12] }),
                [0, 1.02 + i * 0.085, 0]
            )),
        // API LILIN: cone + inti api dijadikan 1 grup yang titik putarnya di ujung sumbu lilin.
        // SCALING berdenyut: api memanjang (sumbu Y) sambil menipis (sumbu X dan Z)
        group([0, 1.66, 0], [0, 0, 0], [
            node(B.generateEllipticCone({ a: 0.07, b: 0.07, height: 0.36, color: [1.0, 0.43, 0.02] })),
            node(B.generateEllipsoidSurface({ a: 0.045, b: 0.045, c: 0.045, color: [1.0, 0.78, 0.08] }), [0, 0.24, 0]),
        ], {
            animate: t => {
                const p = 0.6 * Math.sin(9 * t) + 0.4 * Math.sin(13.7 * t);   // -1..1
                return { scale: [1 - 0.25 * p, 1 + 0.55 * p, 1 - 0.25 * p] };
            }
        }),
    ];
    const cupcake = group([0, 0.08, 0], [0, 0, 0], [
        ...wrapper,
        ...frosting,
        ...candle,
    ]);

    return group([0, 0, 0], [0, 0, 0], [
        node(B.generateEllipsoidSurface({ a: 0.82, b: 0.055, c: 0.62, color: [0.96, 0.96, 0.96] })),
        node(B.generateEllipsoidSurface({ a: 0.76, b: 0.025, c: 0.56, color: [0.82, 0.83, 0.85] }), [0, 0.045, 0]),
        cupcake,
    ]);
}