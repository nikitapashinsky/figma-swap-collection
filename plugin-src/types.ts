type PaintableProperties = {
  fills: Paint[] | PluginAPI["mixed"];
  strokes: Paint[] | PluginAPI["mixed"];
  [key: string]: any;
};

export type PaintableNode = SceneNode & PaintableProperties;

export type VariableMapping = {
  sourceVariable: Variable;
  targetVariable: Variable;
};
