import { useState, useEffect } from "react";
import "./App.css";
import { RadioGroup, ScrollArea } from "radix-ui";
import { CheckIcon, InfoCircledIcon, TokensIcon } from "@radix-ui/react-icons";

type Collection = {
  name: string;
  id: string;
};

function App() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [currentCollectionName, setCurrentCollectionName] = useState("");
  const [targetCollection, setTargetCollection] = useState<Collection | null>(
    null,
  );
  const [availableCollections, setAvailableCollections] = useState<
    Collection[]
  >([]);
  const [selectionError, setSelectionError] = useState<
    false | "EMPTY" | "MULTIPLE" | "NO_VARIABLES"
  >("EMPTY");
  const [showSelectionError, setShowSelectionError] = useState<
    false | "EMPTY" | "MULTIPLE" | "NO_VARIABLES"
  >(false);

  useEffect(() => {
    setAvailableCollections(
      collections.filter(({ name }) => name !== currentCollectionName),
    );
  }, [collections, currentCollectionName]);

  useEffect(() => {
    if (
      availableCollections.length > 0 &&
      (!targetCollection || targetCollection.name === currentCollectionName)
    ) {
      setTargetCollection({
        name: availableCollections[0].name,
        id: availableCollections[0].id,
      });
    }
  }, [availableCollections, currentCollectionName, targetCollection]);

  useEffect(() => {
    onmessage = (event) => {
      const message = event.data.pluginMessage;

      switch (message.type) {
        case "COLLECTIONS":
          setCollections(message.collections);
          break;
        case "CURRENT_COLLECTION_NAME":
          setCurrentCollectionName(message.name);
          setSelectionError(false);
          setShowSelectionError(false);
          break;
        case "NEW_COLLECTION_NAME":
          setCurrentCollectionName(message.name);
          setSelectionError(false);
          setShowSelectionError(false);
          break;
        case "EMPTY_SELECTION":
          setSelectionError("EMPTY");
          setShowSelectionError(false);
          break;
        case "MULTIPLE_SELECTED":
          setSelectionError("MULTIPLE");
          setShowSelectionError(false);
          break;
        case "NO_VARIABLES":
          setSelectionError("NO_VARIABLES");
          setShowSelectionError(false);
          break;
      }
    };
  }, []);

  useEffect(() => {
    parent.postMessage(
      { pluginMessage: { type: "TARGET_COLLECTION", value: targetCollection } },
      "*",
    );
  }, [targetCollection]);

  function handleSelectCollection(value: string) {
    const selected = collections.find(
      (collection) => collection.name === value,
    );
    if (selected) {
      setTargetCollection({ name: selected.name, id: selected.id });
    }
  }

  function handleSwap() {
    if (selectionError) {
      setShowSelectionError(selectionError);
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

    setTargetCollection(null);
  }

  return (
    <main>
      <section className="section">
        <label className="label">From</label>
        <div className="collectionNameWrapper">
          <div
            className="collectionName"
            data-invalid={selectionError !== false}
            data-error={showSelectionError ? "true" : "false"}
          >
            {selectionError === "EMPTY" ? (
              <>
                <div className="IconWrapper">
                  <InfoCircledIcon />
                </div>
                <span>Empty selection</span>
              </>
            ) : selectionError === "MULTIPLE" ? (
              <>
                <div className="IconWrapper">
                  <InfoCircledIcon />
                </div>
                <span>Multiple frames selected</span>
              </>
            ) : selectionError === "NO_VARIABLES" ? (
              <>
                <div className="IconWrapper">
                  <InfoCircledIcon />
                </div>
                <span>No collections in selection</span>
              </>
            ) : (
              <>
                <div className="IconWrapper">
                  <TokensIcon />
                </div>
                <span>{currentCollectionName}</span>
              </>
            )}
          </div>
        </div>
        <div className="errorWrapper">
          {showSelectionError && (
            <strong className="error">
              {showSelectionError === "EMPTY"
                ? "Please select a frame."
                : showSelectionError === "NO_VARIABLES"
                  ? "Please select a frame containing color variables"
                  : showSelectionError === "MULTIPLE"
                    ? "Please select a single frame"
                    : null}
            </strong>
          )}
        </div>
        {/* {showSelectionError === "EMPTY" ? (
          <strong className="error">Please select a frame.</strong>
        ) : showSelectionError === "NO_VARIABLES" ? (
          <strong className="error">
            Please select a frame containing color variables.
          </strong>
        ) : showSelectionError === "MULTIPLE" ? (
          <strong className="error">Please select a single frame.</strong>
        ) : null} */}
      </section>
      <form className="collections-list">
        <legend className="label">To</legend>
        <ScrollArea.Root className="ScrollAreaRoot" scrollHideDelay={0}>
          <ScrollArea.Viewport className="ScrollAreaViewport">
            <RadioGroup.Root
              className="RadioGroupRoot"
              aria-label="Select collection"
              value={targetCollection?.name}
              onValueChange={handleSelectCollection}
            >
              {availableCollections.map(({ name }) => (
                <div className="RadioGroupItemWrapper">
                  <RadioGroup.Item
                    value={name}
                    id={name}
                    className="RadioGroupItem"
                  >
                    <RadioGroup.Indicator className="RadioGroupItemIndicator">
                      <CheckIcon />
                    </RadioGroup.Indicator>
                  </RadioGroup.Item>
                  <label className="RadioGroupItemLabel" htmlFor={name}>
                    {name}
                  </label>
                </div>
              ))}
            </RadioGroup.Root>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar className="ScrollAreaScrollbar">
            <ScrollArea.Thumb className="ScrollAreaThumb" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </form>
      <footer className="footer test">
        <button onClick={handleSwap} className="button">
          Swap collection
        </button>
      </footer>
    </main>
  );
}

export default App;
