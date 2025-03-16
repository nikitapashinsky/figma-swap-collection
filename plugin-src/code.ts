import { clone } from "./utils/clone";
import { PaintableNode, VariableMapping } from "./types";
import {
  hasBoundVariables,
  isContainerNode,
  isPaintableNode,
} from "./utils/helpers";

let targetVariables: VariableMapping[] = [];
let nodesToSwap = <PaintableNode[]>[];

async function main() {
  try {
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();

    await getCollectionNameFromSelection();

    figma.ui.postMessage({
      type: "COLLECTIONS",
      collections: collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
      })),
    });

    figma.ui.onmessage = async (message) => {
      if (message.type === "TARGET_COLLECTION") {
        await processTargetCollection(message);
      }

      if (message.type === "SWAP") {
        const targetCollectionId = message.target?.id;
        const targetCollection =
          await figma.variables.getVariableCollectionByIdAsync(
            targetCollectionId,
          );

        const currentSelection = figma.currentPage.selection;

        console.log("Target variables before swap: ", targetVariables);
        console.log("Target collection ID: ", targetCollectionId);
        console.log("Target collection name: ", message.target?.name);

        if (currentSelection.length > 0) {
          const selectedNode = currentSelection[0];
          if (isContainerNode(selectedNode)) {
            nodesToSwap = selectedNode.findAll().filter(isPaintableNode);
            if (isPaintableNode(selectedNode)) {
              nodesToSwap.push(selectedNode);
            }
          }
        }

        if (targetCollection && targetVariables.length > 0) {
          const currentCollection = await getCollectionNameFromSelection();
          const currentCollectionName = currentCollection?.name;
          swapCollection(nodesToSwap);

          figma.ui.postMessage({
            type: "NEW_COLLECTION_NAME",
            name: targetCollection.name,
          });

          figma.notify(
            `Swapped from ${currentCollectionName} to ${targetCollection.name}`,
            {
              timeout: 2000,
            },
          );
          figma.closePlugin();
        }
      }
    };
  } catch (error) {
    console.error(error);
  }
}

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
            }
          }
        }
      }
    }
    return sourceCollection;
  } catch (error) {
    console.error(error);
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

function swapVariables(
  node: PaintableNode,
  property: "fills" | "strokes",
  variableMappings: VariableMapping[],
) {
  console.log(`Trying to swap ${property} on node ${node.name}`);
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

async function swapCollection(nodes: PaintableNode[]) {
  for (let node of nodes) {
    swapVariables(node, "fills", targetVariables as VariableMapping[]);
    swapVariables(node, "strokes", targetVariables as VariableMapping[]);
  }
}

async function processTargetCollection(message: any) {
  const targetCollectionId = message.value?.id;
  const targetCollection =
    await figma.variables.getVariableCollectionByIdAsync(targetCollectionId);
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

figma.on("selectionchange", async () => {
  try {
    targetVariables = [];
    const selection = figma.currentPage.selection;

    if (selection.length > 0) {
      if (
        selection.length > 1 ||
        (selection[0].type === "SECTION" && selection[0].children.length > 1)
      ) {
        figma.ui.postMessage({ type: "MULTIPLE_SELECTED" });
        return;
      }
      const selectedNode = selection[0];
      const hasVariablesOnParent =
        selectedNode.boundVariables &&
        (selectedNode.boundVariables.fills !== undefined ||
          selectedNode.boundVariables.strokes !== undefined);

      const hasVariablesOnChildren =
        "children" in selectedNode
          ? selectedNode.children.some(hasBoundVariables)
          : false;

      if (!hasVariablesOnParent && !hasVariablesOnChildren) {
        figma.ui.postMessage({ type: "NO_VARIABLES" });
        return;
      }
    } else {
      figma.ui.postMessage({ type: "EMPTY_SELECTION" });
      return;
    }
    await getCollectionNameFromSelection();
  } catch (error) {
    console.error("Error in selection change handler: ", error);
  }
});

figma.showUI(__html__, { themeColors: true, width: 240, height: 384 });
console.clear();
main();
