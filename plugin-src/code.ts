import { clone } from "./clone";

async function main() {
  try {
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();

    const targetCollection = collections[1];

    const selectionColors = figma.getSelectionColors();
    if (selectionColors) {
      const paintsArray = selectionColors.paints;
      const targetVariables = [];

      for (const paint of paintsArray) {
        if (paint.type === "SOLID" && paint.boundVariables?.color) {
          console.log(paint);
          const sourceVariableId = paint.boundVariables.color.id;
          const sourceVariable =
            await figma.variables.getVariableByIdAsync(sourceVariableId);
          const sourceCollectionId = sourceVariable?.variableCollectionId;
          const sourceCollection =
            await figma.variables.getVariableCollectionByIdAsync(
              sourceCollectionId!,
            );

          const sourceVariableIndex = sourceCollection?.variableIds.findIndex(
            (id) => {
              return id === sourceVariableId;
            },
          );

          const targetCollectionIds = targetCollection.variableIds;
          const targetVariableId = targetCollectionIds[sourceVariableIndex!];
          const targetVariable =
            await figma.variables.getVariableByIdAsync(targetVariableId);

          if (targetVariable) {
            targetVariables.push({ sourceVariableId, targetVariable });
          }
        }
      }

      interface PaintableProperties {
        fills: Paint[] | PluginAPI["mixed"];
        strokes: Paint[] | PluginAPI["mixed"];
        [key: string]: any;
      }

      type PaintableNode = SceneNode & PaintableProperties;

      interface VariableMapping {
        sourceVariableId: string;
        targetVariable: Variable;
      }

      function swapVariables(
        node: PaintableNode,
        property: "fills" | "strokes",
        targetArray: VariableMapping[],
      ) {
        const paints = node[property];
        if (paints !== figma.mixed && paints.length > 0) {
          const propsCopy = clone(node[property]);
          for (const { sourceVariableId, targetVariable } of targetArray) {
            if (propsCopy[0].boundVariables?.color?.id === sourceVariableId) {
              propsCopy[0] = figma.variables.setBoundVariableForPaint(
                propsCopy[0],
                "color",
                targetVariable,
              );
            }
          }
          node[property] = propsCopy;
        }
      }
      const selectedNode = figma.currentPage.selection[0] as ChildrenMixin &
        SceneNode;
      const nodes = selectedNode
        .findAll()
        .filter(
          (node): node is PaintableNode => "fills" in node && "strokes" in node,
        );
      for (let node of nodes) {
        swapVariables(node, "fills", targetVariables);
        swapVariables(node, "strokes", targetVariables);
      }
    }
    figma.closePlugin();
  } catch (error) {
    console.error(error);
  }
}

main();
