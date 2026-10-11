import ConversationHistory from "../voice/ConversationHistory";
import {
  Sparkles,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

const SAMPLE_COMMANDS = [
  "2 Coke",
  "1 Dairy Milk",
  "5 Biscuits",
  "Checkout",
  "Cancel Item",
  "What is total?",
];

export default function RightSidebar({
  voice,
  onSampleCommand,
}) {
  return (
    <div className="space-y-5">
      {/* ... */}

      <div className="p-5 h-[420px] overflow-y-auto">
        <ConversationHistory />
      </div>

      {/* ... */}
    </div>
  );
}