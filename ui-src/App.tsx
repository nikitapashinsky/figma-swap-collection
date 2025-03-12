import React, { useState, forwardRef, useEffect } from "react";
import "./App.css";
import { Label, Select } from "radix-ui";
import {
  CheckIcon,
  CaretDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TargetIcon,
} from "@radix-ui/react-icons";
import classnames from "classnames";

interface Collection {
  name: string;
  id: string;
}

function App() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [currentCollectionName, setCurrentCollectionName] = useState(
    "No collections found",
  );
  const [targetCollection, setTargetCollection] = useState<Collection | null>(
    null,
  );
  const [availableCollections, setAvailableCollections] = useState<
    Collection[]
  >([]);
  const [isEmptySelection, setIsEmptySelection] = useState(true);

  useEffect(() => {
    setAvailableCollections(
      collections.filter(({ name }) => name !== currentCollectionName),
    );
  }, [collections, currentCollectionName]);

  useEffect(() => {
    // If there are available collections and either:
    // 1. No target is selected, or
    // 2. The current target is now the current collection (after swap)
    if (
      availableCollections.length > 0 &&
      (!targetCollection || targetCollection.name === currentCollectionName)
    ) {
      // Select the first available collection as the new target
      setTargetCollection({
        name: availableCollections[0].name,
        id: availableCollections[0].id,
      });
    }
  }, [availableCollections, currentCollectionName, targetCollection]);

  useEffect(() => {
    const messageHandler = (event) => {
      const message = event.data.pluginMessage;
      if (message.type === "COLLECTIONS") {
        setCollections(message.collections);
      } else if (message.type === "CURRENT_COLLECTION_NAME") {
        console.log("Received current collection name:", message.name);
        setCurrentCollectionName(message.name);
        setIsEmptySelection(false);
      } else if (message.type === "NEW_COLLECTION_NAME") {
        setCurrentCollectionName(message.name);
        console.log("new current collection: ", message.name);
        setIsEmptySelection(false);
        console.log(currentCollectionName);
      } else if (message.type === "EMPTY_SELECTION") {
        console.log("No paints or styles selected");
        setIsEmptySelection(true);
        setCurrentCollectionName("No collections found");
      }
    };

    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, []);

  useEffect(() => {
    parent.postMessage(
      { pluginMessage: { type: "TARGET_COLLECTION", value: targetCollection } },
      "*",
    );
  }, [targetCollection]);

  function handleClick() {
    if (isEmptySelection) {
      return;
    }

    parent.postMessage(
      {
        pluginMessage: {
          type: "SWAP",
          target: targetCollection,
        },
      },
      "*",
    );
    console.log("target: ", targetCollection?.name);
    setTargetCollection(null);
  }

  const SelectItem = forwardRef(
    ({ children, className, ...props }, forwardedRef) => {
      return (
        <Select.Item
          className={classnames("SelectItem", className)}
          {...props}
          ref={forwardedRef}
        >
          <Select.ItemText>{children}</Select.ItemText>
          <Select.ItemIndicator className="SelectItemIndicator">
            <CheckIcon />
          </Select.ItemIndicator>
        </Select.Item>
      );
    },
  );

  return (
    <main>
      <div className="form">
        <Label.Root className="LabelRoot" htmlFor="to">
          From
        </Label.Root>
        <div className="collectionName" data-empty={isEmptySelection}>
          {currentCollectionName}
        </div>
      </div>
      <div className="form">
        <Label.Root className="LabelRoot" htmlFor="to">
          To
        </Label.Root>
        <Select.Root
          value={targetCollection?.name ?? ""}
          onValueChange={(event) => {
            const selected = collections.find(
              (collection) => collection.name === event,
            );
            if (selected) {
              setTargetCollection({ name: selected.name, id: selected.id });
              console.log("selected collection: ", selected.name);
            }
          }}
        >
          <Select.Trigger className="SelectTrigger" aria-label="Collections">
            <Select.Value placeholder="Select collection" />
            <Select.Icon className="SelectIcon">
              <CaretDownIcon />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="SelectContent">
              <Select.ScrollUpButton className="SelectScrollButton">
                <ChevronUpIcon />
              </Select.ScrollUpButton>
              <Select.Viewport className="SelectViewport">
                <Select.Group>
                  {availableCollections.map(({ name }) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </Select.Group>
              </Select.Viewport>
              <Select.ScrollDownButton className="SelectScrollButton">
                <ChevronDownIcon />
              </Select.ScrollDownButton>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
      <footer className="Footer">
        <button onClick={handleClick} className="Button">
          Swap collection
        </button>
      </footer>
    </main>
  );
}

export default App;
