import { clone } from "./clone";

async function getCollectionName() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  const collection = collections[0].name;
  console.log(collection);
  return collection;
}

async function main() {
  try {
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();
    const collectionNames = collections.map((collection) => collection.name);
    figma.ui.postMessage({
      type: "COLLECTIONS",
      collections: collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
      })),
    });
    console.log("collections on plugin: ", collections);
    let targetCollection: VariableCollection;
    let targetVariables = [];
    let nodes;

    // Move these interface/type definitions to the top level
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
      if (!paints || paints === figma.mixed || paints.length === 0) {
        return;
      }
      if (paints !== figma.mixed && paints.length > 0) {
        const propsCopy = clone(node[property]);
        if (!propsCopy || !propsCopy[0]) {
          return;
        }
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

    function performSwap(nodes: PaintableNode[]) {
      console.log("TEST");
      for (let node of nodes) {
        // console.log(node);
        swapVariables(node, "fills", targetVariables as VariableMapping[]);
        swapVariables(node, "strokes", targetVariables as VariableMapping[]);
      }
    }

    async function processVariables() {
      const selectionColors = figma.getSelectionColors();
      if (selectionColors) {
        const paintsArray = selectionColors.paints;
        // const targetVariables = [];

        for (const paint of paintsArray) {
          if (paint.type === "SOLID" && paint.boundVariables?.color) {
            // console.log(paint);
            const sourceVariableId = paint.boundVariables.color.id;
            const sourceVariable =
              await figma.variables.getVariableByIdAsync(sourceVariableId);
            const sourceCollectionId = sourceVariable?.variableCollectionId;
            const sourceCollection =
              await figma.variables.getVariableCollectionByIdAsync(
                sourceCollectionId!,
              );
            if (sourceCollection) {
              figma.ui.postMessage({
                type: "CURRENT_COLLECTION_NAME",
                name: sourceCollection.name,
              });
            }

            const sourceVariableIndex = sourceCollection?.variableIds.findIndex(
              (id) => {
                return id === sourceVariableId;
              },
            );

            if (targetCollection !== undefined) {
              const targetCollectionIds = targetCollection?.variableIds;
              const targetVariableId =
                targetCollectionIds[sourceVariableIndex!];
              const targetVariable =
                await figma.variables.getVariableByIdAsync(targetVariableId);
              if (targetVariable) {
                targetVariables.push({ sourceVariableId, targetVariable });
              }
            }
          }
        }
      }
    }

    // Move message handler here, at main function level
    figma.ui.onmessage = async (message) => {
      if (message.type === "TARGET_COLLECTION") {
        const targetCollectionId = message.value?.id;
        targetCollection =
          await figma.variables.getVariableCollectionByIdAsync(
            targetCollectionId,
          );
        if (targetCollection) {
          await processVariables();
        }
      }
      if (message.type === "SWAP") {
        // console.log("click");
        const selectedNode = figma.currentPage.selection[0] as ChildrenMixin &
          SceneNode;
        nodes = selectedNode
          .findAll()
          .filter(
            (node): node is PaintableNode =>
              "fills" in node && "strokes" in node,
          );

        if (targetCollection && targetVariables.length > 0) {
          performSwap(nodes);
        }
      }
    };
  } catch (error) {
    console.error(error);
  }
}

figma.showUI(__html__, { themeColors: true, width: 240, height: 152 });
main();

// const collection = getCollectionName();
// figma.ui.postMessage(collection);
