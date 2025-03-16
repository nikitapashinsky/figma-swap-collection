import { clone } from "./clone";

async function getCollectionNameFromSelection() {
  try {
    const selectionColors = figma.getSelectionColors();
    let sourceCollection: VariableCollection | null = null;

    if (selectionColors) {
      const paintsArray = selectionColors.paints;

      for (const paint of paintsArray) {
        if (paint.type === "SOLID" && paint.boundVariables?.color) {
          const sourceVariables = await getSourceVariables();
          if (sourceVariables && sourceVariables.length > 0) {
            const sourceCollectionId = sourceVariables[0].variableCollectionId;

            sourceCollection =
              await figma.variables.getVariableCollectionByIdAsync(
                sourceCollectionId!,
              );

            if (sourceCollection) {
              figma.ui.postMessage({
                type: "CURRENT_COLLECTION_NAME",
                name: sourceCollection.name,
              });
              break;
            }
          }
        }
      }
    }
    return sourceCollection;
  } catch (error) {
    console.log(error);
  }
}

async function getSourceVariables() {
  const selectionColors = figma.getSelectionColors();
  let sourceVariables: Variable[] = [];

  if (selectionColors) {
    const paintsArray = selectionColors.paints;

    for (const paint of paintsArray) {
      if (paint.type === "SOLID" && paint.boundVariables?.color) {
        const sourceVariableId = paint.boundVariables.color.id;
        if (sourceVariableId) {
          const sourceVariable =
            await figma.variables.getVariableByIdAsync(sourceVariableId);
          if (sourceVariable) {
            sourceVariables.push(sourceVariable);
          }
        }
      }
    }
  }
  return sourceVariables;
}

async function main() {
  await getCollectionNameFromSelection();
  try {
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();

    figma.ui.postMessage({
      type: "COLLECTIONS",
      collections: collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
      })),
    });

    let targetVariables: VariableMappingUpdated[] = [];

    interface PaintableProperties {
      fills: Paint[] | PluginAPI["mixed"];
      strokes: Paint[] | PluginAPI["mixed"];
      [key: string]: any;
    }

    type PaintableNode = SceneNode & PaintableProperties;

    interface VariableMappingUpdated {
      sourceVariable: Variable;
      targetVariable: Variable;
    }

    function swapVariables(
      node: PaintableNode,
      property: "fills" | "strokes",
      variableMappings: VariableMappingUpdated[],
    ) {
      const paints = node[property];
      if (paints !== figma.mixed) {
        if (!paints || paints.length === 0) {
          return;
        }
        if (paints.length > 0) {
          const propsCopy = clone(node[property]);

          for (let i = 0; i < propsCopy.length; i++) {
            if (!propsCopy[i] || !propsCopy[i].boundVariables?.color) continue;

            const boundVariableId = propsCopy[i].boundVariables.color.id;
            const mapping = variableMappings.find(
              (m) => m.sourceVariable.id === boundVariableId,
            );

            if (mapping) {
              propsCopy[i] = figma.variables.setBoundVariableForPaint(
                propsCopy[i],
                "color",
                mapping.targetVariable,
              );
            }
          }
          node[property] = propsCopy;
        }
      }
    }

    async function performSwap(nodes: PaintableNode[]) {
      for (let node of nodes) {
        swapVariables(
          node,
          "fills",
          targetVariables as VariableMappingUpdated[],
        );
        swapVariables(
          node,
          "strokes",
          targetVariables as VariableMappingUpdated[],
        );
      }
    }

    async function processVariables(message: any) {
      const targetCollectionId = message.value?.id;
      const targetCollection =
        await figma.variables.getVariableCollectionByIdAsync(
          targetCollectionId,
        );
      if (targetCollection) {
        const targetVariablesPromises = targetCollection.variableIds.map((id) =>
          figma.variables.getVariableByIdAsync(id),
        );
        const targetVariablesArray = await Promise.all(targetVariablesPromises);
        const sourceVariables = await getSourceVariables();
        targetVariables = [];

        for (const sourceVariable of sourceVariables) {
          const targetVariable = targetVariablesArray.find(
            (targetVariable) => targetVariable?.name === sourceVariable.name,
          );
          if (targetVariable) {
            targetVariables.push({ sourceVariable, targetVariable });
          }
        }
      }
    }

    figma.ui.onmessage = async (message) => {
      if (message.type === "TARGET_COLLECTION") {
        await processVariables(message);
      }
      if (message.type === "SWAP") {
        const targetCollectionId = message.target?.id;
        const targetCollection =
          await figma.variables.getVariableCollectionByIdAsync(
            targetCollectionId,
          );

        function isContainerNode(
          node: SceneNode,
        ): node is SceneNode & ChildrenMixin {
          return (
            "findAll" in node && typeof (node as any).findAll === "function"
          );
        }

        function isPaintableNode(node: SceneNode): node is PaintableNode {
          return "fills" in node && "strokes" in node;
        }

        let nodesToSwap = <PaintableNode[]>[];

        const selection = figma.currentPage.selection;

        if (selection.length > 0) {
          const selectedNode = selection[0];
          if (isContainerNode(selectedNode)) {
            nodesToSwap = selectedNode.findAll().filter(isPaintableNode);
            if (isPaintableNode(selectedNode)) {
              nodesToSwap.push(selectedNode);
            }
          }
        }

        if (targetCollection && targetVariables.length > 0) {
          performSwap(nodesToSwap);
          figma.ui.postMessage({
            type: "NEW_COLLECTION_NAME",
            name: targetCollection.name,
          });
          figma.closePlugin();
        }
      }
    };
  } catch (error) {
    console.error(error);
  }
}

figma.showUI(__html__, { themeColors: true, width: 240, height: 384 });

main();

figma.on("selectionchange", async () => {
  try {
    const selection = figma.currentPage.selection;

    if (selection.length > 1) {
      figma.ui.postMessage({ type: "MULTIPLE_SELECTED" });
      return;
    }

    if (selection.length === 0) {
      figma.ui.postMessage({ type: "EMPTY_SELECTION" });
      return;
    }

    if (selection[0].type === "SECTION" && selection[0].children.length > 1) {
      figma.ui.postMessage({ type: "MULTIPLE_SELECTED" });
    }

    await getCollectionNameFromSelection();
  } catch (error) {
    console.error("Error in selection change handler: ", error);
  }
});
