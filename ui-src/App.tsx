import React, { useRef, forwardRef } from "react";
import "./App.css";
import { Label, Select } from "radix-ui";
import {
  CheckIcon,
  CaretDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons";
import classnames from "classnames";

function App() {
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
            <Select.Value placeholder="Gruvbox" />
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
        <Select.Root>
          <Select.Trigger className="SelectTrigger" aria-label="Food">
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
                  <SelectItem value="one">One</SelectItem>
                  <SelectItem value="ayu">Ayu</SelectItem>
                  <SelectItem value="moegi">Moegi</SelectItem>
                  <SelectItem value="github">Github</SelectItem>
                  <SelectItem value="tokyo-night">Tokyo Night</SelectItem>
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
        <button className="Button">Swap collection</button>
      </footer>
    </main>
  );
}

export default App;
