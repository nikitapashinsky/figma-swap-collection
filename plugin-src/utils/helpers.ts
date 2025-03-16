import { PaintableNode } from "../types";

export function hasBoundVariables(node: any) {
  return node.boundVariables["fills"] !== undefined;
}

export function isContainerNode(
  node: SceneNode,
): node is SceneNode & ChildrenMixin {
  return "findAll" in node && typeof (node as any).findAll === "function";
}

export function isPaintableNode(node: SceneNode): node is PaintableNode {
  return "fills" in node && "strokes" in node;
}
