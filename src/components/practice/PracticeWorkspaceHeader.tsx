import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, List, Settings, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformSettingsModal } from "./PlatformSettingsModal";

interface PracticeWorkspaceHeaderProps {
  skillId: string | undefined;
  skillName: string;
  problemTitle: string;
  prevProblem: { slug: string } | null | undefined;
  nextProblem: { slug: string } | null | undefined;
  onPrevProblem: () => void;
  onNextProblem: () => void;
  onOpenDrawer: () => void;
}

export function PracticeWorkspaceHeader({
  skillId,
  skillName,
  problemTitle,
  prevProblem,
  nextProblem,
  onPrevProblem,
  onNextProblem,
  onOpenDrawer,
}: PracticeWorkspaceHeaderProps) {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div className="h-12 flex items-center px-4 border-b border-border/50 bg-card shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(`/practice/${skillId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <button
            onClick={onOpenDrawer}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <List className="h-3.5 w-3.5" />
            <span>{skillName}</span>
          </button>

          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onPrevProblem}
              disabled={!prevProblem}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">{problemTitle}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onNextProblem}
              disabled={!nextProblem}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => document.documentElement.requestFullscreen?.()}
            title="Browser fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <PlatformSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
