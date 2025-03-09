import { clone } from "./clone";

async function main() {
  try {
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();

    const collection2 = collections[1];

    for (let node of figma.currentPage.selection) {
      if ("children" in node) {
        for (let child of node.children) {
          if (
            child.type === "RECTANGLE" ||
            child.type === "TEXT" ||
            child.type === "FRAME" ||
            child.type === "VECTOR" ||
            child.type === "INSTANCE"
          ) {
            if (child.fills !== figma.mixed && child.fills.length > 0) {
              const fillsCopy = clone(child.fills);

              const currentVariableId = fillsCopy[0].boundVariables.color.id;

              const currentVariable =
                await figma.variables.getVariableByIdAsync(currentVariableId);

              const currentCollectionId = currentVariable?.variableCollectionId;

              const currentCollection =
                await figma.variables.getVariableCollectionByIdAsync(
                  currentCollectionId!,
                );

              const currentVariableIndex =
                currentCollection?.variableIds.findIndex((id) => {
                  return id === currentVariableId;
                });

              console.log(
                `Input variable at index ${currentVariableIndex} is ${currentVariableId}`,
              );

              const targetCollectionIds = collection2.variableIds;

              const targetVariableId =
                targetCollectionIds[currentVariableIndex!];

              const targetVariable =
                await figma.variables.getVariableByIdAsync(targetVariableId);

              console.log(
                `Target variable at index ${currentVariableIndex} is ${targetVariableId}`,
              );

              fillsCopy[0] = figma.variables.setBoundVariableForPaint(
                fillsCopy[0],
                "color",
                targetVariable,
              );
              child.fills = fillsCopy;
            }
          }
        }
      }
    }
    figma.closePlugin();
  } catch (error) {
    console.error(error);
  }
}

main();
