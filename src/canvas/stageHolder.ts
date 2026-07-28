import type Konva from 'konva';

/** Bridges the live Konva.Stage instance to non-canvas UI (export buttons). */
export const stageHolder: { stage: Konva.Stage | null } = { stage: null };
