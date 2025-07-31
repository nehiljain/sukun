import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ConnectionLineType,
} from "reactflow";
import "reactflow/dist/style.css";
import { ChatMessage } from "../types";
import { Clock } from "lucide-react";

// Custom Scene Node component
const SceneNode = ({
  data,
}: {
  data: {
    title: string;
    description: string;
    duration: number;
    narration: string;
  };
}) => {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-md p-3 shadow-md max-w-[250px]">
      <h3 className="font-bold text-sm text-black">{data.title}</h3>
      <p className="text-xs mt-1 text-black">{data.description}</p>
      <div className="flex justify-between items-center mt-2 text-xs text-gray-700">
        <span className="flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {data.duration}s
        </span>
      </div>
      {data.narration && (
        <div className="mt-2 text-xs bg-gray-100 p-2 rounded">
          <p className="italic text-gray-800">"{data.narration}"</p>
        </div>
      )}
    </div>
  );
};

// Define node types
const nodeTypes = {
  sceneNode: SceneNode,
};

interface StoryboardViewProps {
  message: ChatMessage;
}

export const StoryboardView = ({ message }: StoryboardViewProps) => {
  if (!message.storyboard_data) return null;

  const data = message.storyboard_data;

  // Calculate total duration
  const totalDuration = data.nodes.reduce(
    (total, node) => total + (node.data.duration || 0),
    0,
  );

  return (
    <>
      <p className="mb-4 font-medium text-muted-foreground">
        {message.message}
      </p>
      <div className="flex flex-col w-full">
        <div className="text-sm text-muted-foreground mb-2">
          Total video duration: {totalDuration} seconds
        </div>
        <div className="h-[400px] w-full border rounded-md overflow-hidden">
          <ReactFlow
            nodes={data.nodes}
            edges={data.edges}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            minZoom={0.5}
            maxZoom={1.5}
            attributionPosition="bottom-right"
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { stroke: "#667eea", strokeWidth: 2 },
              animated: true,
            }}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitViewOptions={{ padding: 0.3 }}
          >
            <Controls />
            <MiniMap nodeStrokeColor="#667eea" nodeColor="#cbd5e0" />
            <Background color="#f7fafc" gap={16} size={1} />
          </ReactFlow>
        </div>
      </div>
    </>
  );
};
