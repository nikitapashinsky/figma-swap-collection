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
              console.log("GOT SOURCE COLLECTION: ", sourceCollection.name);
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

    // console.log("collections on plugin: ", collections);
    let targetCollection: VariableCollection;
    let targetVariables: VariableMappingUpdated[] = [];
    let nodes;

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
      // const selectionColors = figma.getSelectionColors();
      const paints = node[property];
      if (!paints || paints === figma.mixed || paints.length === 0) {
        return;
      }
      if (paints !== figma.mixed && paints.length > 0) {
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

    function performSwap(nodes: PaintableNode[]) {
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

    async function processVariables(message) {
      const targetCollectionId = message.value?.id;
      const targetCollection =
        await figma.variables.getVariableCollectionByIdAsync(
          targetCollectionId,
        );
      if (targetCollection) {
        // console.log("GOT TARGET COLLECTION: ", targetCollection.name);
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
        // console.log("Swapping");
        const targetCollectionId = message.target?.id;
        // console.log("target collection id: ", targetCollectionId);
        const targetCollection =
          await figma.variables.getVariableCollectionByIdAsync(
            targetCollectionId,
          );
        const selectedNode = figma.currentPage.selection[0] as ChildrenMixin &
          SceneNode;
        nodes = selectedNode
          .findAll()
          .filter(
            (node): node is PaintableNode =>
              "fills" in node && "strokes" in node,
          );

        if (targetCollection && targetVariables.length > 0) {
          // console.log("perform swap ?");
          performSwap(nodes);
          figma.ui.postMessage({
            type: "NEW_COLLECTION_NAME",
            name: targetCollection.name,
          });
        }
      }
    };
  } catch (error) {
    console.error(error);
  }
}

figma.showUI(__html__, { themeColors: true, width: 240, height: 152 });

main();

figma.on("selectionchange", async () => {
  console.log("asd");
  try {
    await getCollectionNameFromSelection();
    console.log("asd?");
  } catch (error) {
    console.error("Error in selection change handler: ", error);
  }
});
