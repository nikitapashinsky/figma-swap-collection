import React, { useRef, useState, forwardRef, useEffect } from "react";
import "./App.css";
import { Label, Select } from "radix-ui";
import {
  CheckIcon,
  CaretDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import classnames from "classnames";

interface Collection {
  name: string;
  id: string;
}

function App() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [currentCollectionName, setCurrentCollectionName] = useState("");
  const [targetCollection, setTargetCollection] = useState<Collection | null>(
    null,
  );

  function findNextAvailable(currentName: string) {
    console.log("Finding next available. Current:", currentName);
    console.log("Available collections:", collections);

    // Instead of find, let's try filter first to see all available options
    const available = collections.filter((c) => c.name !== currentName);
    console.log("Available options:", available);

    return available[0]; // or you could pick a random one
  }

  useEffect(() => {
    if (collections.length > 0 && !targetCollection) {
      const firstAvailable = collections.find(
        (collection) => collection.name !== currentCollectionName,
      );
      if (firstAvailable) {
        setTargetCollection({
          name: firstAvailable.name,
          id: firstAvailable.id,
        });
      }
    }
  }, [collections]);

  useEffect(() => {
    onmessage = (event) => {
      const message = event.data.pluginMessage;
      if (message.type === "COLLECTIONS") {
        setCollections(message.collections);
      } else if (message.type === "CURRENT_COLLECTION_NAME") {
        if (message.name !== currentCollectionName) {
          setCurrentCollectionName(message.name);
        }
      }
    };
  }, [currentCollectionName]);

  useEffect(() => {
    parent.postMessage(
      { pluginMessage: { type: "TARGET_COLLECTION", value: targetCollection } },
      "*",
    );
  }, [targetCollection]);

  function handleClick() {
    if (targetCollection) {
      parent.postMessage({ pluginMessage: { type: "SWAP" } }, "*");
      setCurrentCollectionName(targetCollection.name);
      setTargetCollection(null);
    }
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
        <Label.Root className="LabelRoot" htmlFor="firstName">
          From
        </Label.Root>
        <Select.Root disabled>
          <Select.Trigger className="SelectTrigger" aria-label="Food">
            <Select.Value placeholder={currentCollectionName} />
            {/* <Select.Icon className="SelectIcon">
              <CaretDownIcon />
            </Select.Icon> */}
          </Select.Trigger>
        </Select.Root>
      </div>
      <div className="form">
        <Label.Root className="LabelRoot" htmlFor="firstName">
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
                  {collections.map(
                    ({ name }) =>
                      name !== currentCollectionName && (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ),
                  )}
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
