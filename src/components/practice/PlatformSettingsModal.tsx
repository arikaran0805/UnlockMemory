import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { X, BookOpen, Code2, Cog, RotateCcw } from "lucide-react";
import {
  usePlatformSettings,
  DEFAULT_LEARNING_EXPERIENCE,
  DEFAULT_CODE_EDITOR,
  DEFAULT_ADVANCED,
} from "@/hooks/usePlatformSettings";
import { usePlatformSettingsContext } from "@/contexts/PlatformSettingsContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ============================================================================
// Types
// ============================================================================

type SettingsCategory = "learning" | "editor" | "advanced";

interface PlatformSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// Sidebar Categories
// ============================================================================

const categories: {
  id: SettingsCategory;
  label: string;
  icon: typeof BookOpen;
  description: string;
}[] = [
  {
    id: "learning",
    label: "Learning Experience",
    icon: BookOpen,
    description: "Optimize readability and reduce visual fatigue",
  },
  {
    id: "editor",
    label: "Code Editor",
    icon: Code2,
    description: "Configure your coding environment",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: Cog,
    description: "Power user settings and reset options",
  },
];

// ============================================================================
// Setting Row Component
// ============================================================================

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 pr-4">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ============================================================================
// Section Components
// ============================================================================

function LearningExperienceSection({
  settings,
  updateCategory,
}: {
  settings: ReturnType<typeof usePlatformSettings>["settings"];
  updateCategory: ReturnType<typeof usePlatformSettings>["updateCategory"];
}) {
  const { learningExperience } = settings;

  return (
    <div className="space-y-1">
      <SettingRow
        label="Font Size"
        description="Larger text reduces eye strain during long sessions"
      >
        <Select
          value={String(learningExperience.fontSize)}
          onValueChange={(v) =>
            updateCategory("learningExperience", { fontSize: Number(v) })
          }
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10px</SelectItem>
            <SelectItem value="12">12px</SelectItem>
            <SelectItem value="14">14px</SelectItem>
            <SelectItem value="16">16px</SelectItem>
            <SelectItem value="18">18px</SelectItem>
            <SelectItem value="20">20px</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Word Wrap"
        description="Prevent horizontal scrolling on long lines"
      >
        <Switch
          checked={learningExperience.wordWrap}
          onCheckedChange={(v) =>
            updateCategory("learningExperience", { wordWrap: v })
          }
        />
      </SettingRow>

      <SettingRow
        label="Show Line Numbers"
        description="Helps with debugging and code references"
      >
        <Switch
          checked={learningExperience.showLineNumbers}
          onCheckedChange={(v) =>
            updateCategory("learningExperience", { showLineNumbers: v })
          }
        />
      </SettingRow>

      <SettingRow
        label="Highlight Active Line"
        description="Keep track of your cursor position"
      >
        <Switch
          checked={learningExperience.highlightActiveLine}
          onCheckedChange={(v) =>
            updateCategory("learningExperience", { highlightActiveLine: v })
          }
        />
      </SettingRow>

      <SettingRow
        label="Show Matching Brackets"
        description="Easier to track nested code blocks"
      >
        <Switch
          checked={learningExperience.showMatchingBrackets}
          onCheckedChange={(v) =>
            updateCategory("learningExperience", { showMatchingBrackets: v })
          }
        />
      </SettingRow>
    </div>
  );
}

function CodeEditorSection({
  settings,
  updateCategory,
}: {
  settings: ReturnType<typeof usePlatformSettings>["settings"];
  updateCategory: ReturnType<typeof usePlatformSettings>["updateCategory"];
}) {
  const { codeEditor } = settings;

  return (
    <div className="space-y-1">
      <SettingRow
        label="Font Family"
        description="JetBrains Mono or Consolas for code; Serif for readability"
      >
        <Select
          value={codeEditor.fontFamily}
          onValueChange={(v: "default" | "monospace" | "serif") =>
            updateCategory("codeEditor", { fontFamily: v })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">JetBrains Mono</SelectItem>
            <SelectItem value="monospace">Consolas</SelectItem>
            <SelectItem value="serif">Serif</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Tab Size"
        description="Number of spaces per indentation level"
      >
        <Select
          value={String(codeEditor.tabSize)}
          onValueChange={(v) =>
            updateCategory("codeEditor", { tabSize: Number(v) })
          }
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 spaces</SelectItem>
            <SelectItem value="4">4 spaces</SelectItem>
            <SelectItem value="8">8 spaces</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Indentation Type"
        description="Spaces are more consistent across editors"
      >
        <Select
          value={codeEditor.indentationType}
          onValueChange={(v: "spaces" | "tabs") =>
            updateCategory("codeEditor", { indentationType: v })
          }
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spaces">Spaces</SelectItem>
            <SelectItem value="tabs">Tabs</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Font Ligatures"
        description="Combine characters like => into single symbols"
      >
        <Switch
          checked={codeEditor.fontLigatures}
          onCheckedChange={(v) =>
            updateCategory("codeEditor", { fontLigatures: v })
          }
        />
      </SettingRow>
    </div>
  );
}

function AdvancedSection({
  settings,
  updateCategory,
  resetSection,
  resetAll,
}: {
  settings: ReturnType<typeof usePlatformSettings>["settings"];
  updateCategory: ReturnType<typeof usePlatformSettings>["updateCategory"];
  resetSection: (category: keyof typeof settings) => void;
  resetAll: () => void;
}) {
  const { advanced } = settings;
  const [resetSectionDialog, setResetSectionDialog] = useState(false);
  const [resetAllDialog, setResetAllDialog] = useState(false);
  const [sectionToReset, setSectionToReset] = useState<keyof typeof settings | null>(null);

  const handleResetSection = (section: keyof typeof settings) => {
    setSectionToReset(section);
    setResetSectionDialog(true);
  };

  const confirmResetSection = () => {
    if (sectionToReset) {
      resetSection(sectionToReset);
    }
    setResetSectionDialog(false);
    setSectionToReset(null);
  };

  const confirmResetAll = () => {
    resetAll();
    setResetAllDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <SettingRow
          label="Minimap"
          description="Shows code overview on the right side"
        >
          <Switch
            checked={advanced.minimap}
            onCheckedChange={(v) =>
              updateCategory("advanced", { minimap: v })
            }
          />
        </SettingRow>

        <SettingRow
          label="Performance Mode"
          description="Disables cursor animations and smooth scrolling for snappier response"
        >
          <Switch
            checked={advanced.performanceMode}
            onCheckedChange={(v) =>
              updateCategory("advanced", { performanceMode: v })
            }
          />
        </SettingRow>

        <SettingRow
          label="Highlight Error Lines"
          description="Visually highlight the line where an error occurred"
        >
          <Switch
            checked={advanced.highlightErrorLines}
            onCheckedChange={(v) =>
              updateCategory("advanced", { highlightErrorLines: v })
            }
          />
        </SettingRow>
      </div>

      {/* Reset Options */}
      <div className="pt-2">
        <div className="rounded-xl border border-border/60 overflow-hidden">
          {/* Section label */}
          <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
            <p className="text-[12px] font-semibold tracking-[0.06em] uppercase text-muted-foreground/70">
              Reset Options
            </p>
          </div>

          {/* Section reset rows */}
          {categories.slice(0, -1).map((cat, idx) => {
            const sectionKey = cat.id === "learning" ? "learningExperience" : "codeEditor";
            const descriptions: Record<string, string> = {
              learning: "Restore font size, line numbers, and readability defaults",
              editor: "Restore font family, tab size, and indentation defaults",
            };
            return (
              <div
                key={cat.id}
                className={cn(
                  "flex items-center justify-between px-4 py-3.5 bg-background",
                  idx < categories.slice(0, -1).length - 1 && "border-b border-border/40"
                )}
              >
                <div className="flex-1 pr-4">
                  <p className="text-[13px] font-medium text-foreground">{cat.label}</p>
                  <p className="text-[11.5px] text-muted-foreground/70 mt-0.5">
                    {descriptions[cat.id]}
                  </p>
                </div>
                <button
                  onClick={() => handleResetSection(sectionKey)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/40 transition-all duration-150"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            );
          })}

          {/* Reset All — danger row */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-red-50/60 border-t border-red-100/80">
            <div className="flex-1 pr-4">
              <p className="text-[13px] font-medium text-red-700">Reset All Settings</p>
              <p className="text-[11.5px] text-red-500/80 mt-0.5">
                Restores every setting to factory defaults — cannot be undone
              </p>
            </div>
            <button
              onClick={() => setResetAllDialog(true)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold bg-red-600 text-white hover:bg-red-700 transition-all duration-150 shadow-sm"
            >
              <RotateCcw className="h-3 w-3" />
              Reset All
            </button>
          </div>
        </div>
      </div>

      {/* Reset Section Dialog */}
      <AlertDialog open={resetSectionDialog} onOpenChange={setResetSectionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Section Settings</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore default settings for this section. Your other
              preferences will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResetSection}>
              Reset Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset All Dialog */}
      <AlertDialog open={resetAllDialog} onOpenChange={setResetAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Settings</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore all settings to their default values. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmResetAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Main Modal Component
// ============================================================================

export function PlatformSettingsModal({
  open,
  onOpenChange,
}: PlatformSettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("learning");
  const {
    settings,
    updateCategory,
    resetSection,
    resetAll,
  } = usePlatformSettingsContext();

  const activeCategoryData = categories.find((c) => c.id === activeCategory);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const renderContent = () => {
    switch (activeCategory) {
      case "learning":
        return (
          <LearningExperienceSection
            settings={settings}
            updateCategory={updateCategory}
          />
        );
      case "editor":
        return (
          <CodeEditorSection
            settings={settings}
            updateCategory={updateCategory}
          />
        );
      case "advanced":
        return (
          <AdvancedSection
            settings={settings}
            updateCategory={updateCategory}
            resetSection={resetSection}
            resetAll={resetAll}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-sm [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Settings</h2>
            <p className="text-sm text-muted-foreground">
              Customize your UnlockMemory experience
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div className="w-56 shrink-0 border-r border-border bg-muted/30 p-3 space-y-1 overflow-y-auto">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Section Header */}
              <div className="mb-6">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  {activeCategoryData && (
                    <activeCategoryData.icon className="h-5 w-5 text-primary" />
                  )}
                  {activeCategoryData?.label}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeCategoryData?.description}
                </p>
              </div>

              {/* Settings Content */}
              {renderContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PlatformSettingsModal;
