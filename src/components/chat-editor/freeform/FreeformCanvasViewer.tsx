import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas } from "fabric";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ZoomIn, RotateCcw, Expand, Maximize2, Fullscreen, X, Move } from "lucide-react";
import { FreeformCanvasData } from "./types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FreeformCanvasViewerProps {
  data: FreeformCanvasData;
  className?: string;
}

export const FreeformCanvasViewer = ({
  data,
  className,
}: FreeformCanvasViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [fullscreenFabricCanvas, setFullscreenFabricCanvas] = useState<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fullscreenZoom, setFullscreenZoom] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mainContentRect, setMainContentRect] = useState<DOMRect | null>(null);
  const [containerHeight, setContainerHeight] = useState(300);
  const [zoomPopoverOpen, setZoomPopoverOpen] = useState(false);
  const [fullscreenZoomPopoverOpen, setFullscreenZoomPopoverOpen] = useState(false);
  
  // Pan state for fullscreen
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const baseWidth = data.width || 800;
  const baseHeight = data.height || 400;

  // Initialize main canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: baseWidth,
      height: baseHeight,
      backgroundColor: "#ffffff",
      selection: false,
      interactive: false,
    });

    if (data.canvasJson) {
      try {
        canvas.loadFromJSON(JSON.parse(data.canvasJson)).then(() => {
          canvas.getObjects().forEach((obj) => {
            obj.set({
              selectable: false,
              evented: false,
              hasControls: false,
              hasBorders: false,
            });
          });
          canvas.renderAll();
        });
      } catch (e) {
        console.error("Failed to load canvas data:", e);
      }
    }

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [data.canvasJson, baseWidth, baseHeight]);

  // Initialize fullscreen canvas when dialog opens
  useEffect(() => {
    if (!isFullscreen || !fullscreenCanvasRef.current) return;

    // Small delay to ensure the dialog is fully rendered
    const timer = setTimeout(() => {
      if (!fullscreenCanvasRef.current) return;
      
      const canvas = new FabricCanvas(fullscreenCanvasRef.current, {
        width: baseWidth,
        height: baseHeight,
        backgroundColor: "#ffffff",
        selection: false,
        interactive: false,
      });

      if (data.canvasJson) {
        try {
          canvas.loadFromJSON(JSON.parse(data.canvasJson)).then(() => {
            canvas.getObjects().forEach((obj) => {
              obj.set({
                selectable: false,
                evented: false,
                hasControls: false,
                hasBorders: false,
              });
            });
            canvas.renderAll();
          });
        } catch (e) {
          console.error("Failed to load canvas data:", e);
        }
      }

      setFullscreenFabricCanvas(canvas);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (fullscreenFabricCanvas) {
        fullscreenFabricCanvas.dispose();
        setFullscreenFabricCanvas(null);
      }
    };
  }, [isFullscreen, data.canvasJson, baseWidth, baseHeight]);

  // Fit the main canvas to container
  useEffect(() => {
    if (!fabricCanvas || !containerRef.current) return;

    const el = containerRef.current;

    const applySize = () => {
      const available = el.clientWidth;
      if (!available) return;
      
      const displayWidth = Math.min(available, baseWidth * zoom);
      const aspect = baseHeight / baseWidth;
      const displayHeight = Math.max(180, Math.round(displayWidth * aspect));
      
      fabricCanvas.setDimensions({ width: displayWidth, height: displayHeight }, { cssOnly: true });
      fabricCanvas.renderAll();
    };

    applySize();

    const resizeObserverSupported = typeof ResizeObserver !== "undefined";

    if (resizeObserverSupported) {
      const ro = new ResizeObserver(() => applySize());
      ro.observe(el);
      return () => ro.disconnect();
    }

    const onResize = () => applySize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fabricCanvas, baseWidth, baseHeight, zoom]);

  // Fit fullscreen canvas
  useEffect(() => {
    if (!fullscreenFabricCanvas || !fullscreenContainerRef.current) return;

    const el = fullscreenContainerRef.current;

    const applySize = () => {
      const availableWidth = el.clientWidth - 64;
      const availableHeight = el.clientHeight - 64;
      if (!availableWidth || !availableHeight) return;
      
      const aspect = baseHeight / baseWidth;
      let displayWidth = Math.min(availableWidth, baseWidth * fullscreenZoom);
      let displayHeight = displayWidth * aspect;
      
      if (displayHeight > availableHeight) {
        displayHeight = availableHeight;
        displayWidth = displayHeight / aspect;
      }
      
      fullscreenFabricCanvas.setDimensions({ width: displayWidth, height: displayHeight }, { cssOnly: true });
      fullscreenFabricCanvas.renderAll();
    };

    applySize();

    const ro = new ResizeObserver(() => applySize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullscreenFabricCanvas, baseWidth, baseHeight, fullscreenZoom]);

  // Escape key + resize handler while fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };

    const handleResize = () => {
      const mainEl = document.getElementById("lesson-main-content");
      if (mainEl) setMainContentRect(mainEl.getBoundingClientRect());
    };

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isFullscreen]);

  const openFullscreen = () => {
    const mainEl = document.getElementById("lesson-main-content");
    setMainContentRect(mainEl ? mainEl.getBoundingClientRect() : null);
    setIsFullscreen(true);
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    setZoomPopoverOpen(false);
  };

  const handleFullscreenZoomChange = (newZoom: number) => {
    setFullscreenZoom(newZoom);
    setFullscreenZoomPopoverOpen(false);
  };

  const handleReset = () => {
    setZoom(1);
    setZoomPopoverOpen(false);
  };

  const handleFullscreenReset = () => {
    setFullscreenZoom(1);
    setFullscreenZoomPopoverOpen(false);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan handlers for fullscreen
  const handlePanStart = (e: React.MouseEvent) => {
    if (fullscreenZoom <= 1) return; // Only pan when zoomed in
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setContainerHeight(isExpanded ? 300 : 500);
  };

  const zoomOptions = [
    { label: "50%", value: 0.5 },
    { label: "75%", value: 0.75 },
    { label: "100%", value: 1 },
    { label: "125%", value: 1.25 },
    { label: "150%", value: 1.5 },
    { label: "200%", value: 2 },
  ];

  const ZoomControls = ({ 
    currentZoom, 
    onZoomChange, 
    onReset,
    open,
    onOpenChange,
  }: { 
    currentZoom: number; 
    onZoomChange: (zoom: number) => void; 
    onReset: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5">
          <ZoomIn className="h-3.5 w-3.5" />
          <span className="text-xs">{Math.round(currentZoom * 100)}%</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-2 z-[100]" align="end">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground mb-1">Zoom Level</p>
          {zoomOptions.map((option) => (
            <Button
              key={option.value}
              variant={currentZoom === option.value ? "secondary" : "ghost"}
              size="sm"
              className="justify-start h-8 text-xs"
              onClick={() => onZoomChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
          <div className="border-t border-border my-1" />
          <Button
            variant="ghost"
            size="sm"
            className="justify-start h-8 text-xs"
            onClick={onReset}
          >
            <RotateCcw className="h-3 w-3 mr-1.5" />
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <>
      <div
        className={cn(
          "relative rounded-xl border border-border bg-background shadow-md overflow-hidden group",
          "w-full max-w-full",
          isExpanded && "ring-2 ring-primary/20",
          className
        )}
      >
        {/* Controls bar */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-border/50">
          <ZoomControls 
            currentZoom={zoom} 
            onZoomChange={handleZoomChange} 
            onReset={handleReset}
            open={zoomPopoverOpen}
            onOpenChange={setZoomPopoverOpen}
          />

          <div className="w-px h-4 bg-border mx-1" />
          
          {/* Expand/collapse button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleExpanded}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Expand className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Fullscreen button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={openFullscreen}
            title="Fullscreen"
          >
            <Fullscreen className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Canvas container */}
        <div
          ref={containerRef}
          className="overflow-auto"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(var(--muted)) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            height: isExpanded ? containerHeight : 'auto',
            minHeight: 200,
            maxHeight: isExpanded ? containerHeight : 400,
            transition: 'height 0.3s ease, max-height 0.3s ease',
          }}
        >
          <div
            className="flex items-center justify-center p-4"
            style={{ minWidth: 'fit-content' }}
          >
            <canvas
              ref={canvasRef}
              className="block"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        </div>

        {/* Resize handle when expanded */}
        {isExpanded && (
          <div
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-gradient-to-t from-muted/50 to-transparent hover:from-primary/20 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startHeight = containerHeight;
              
              const handleMouseMove = (moveE: MouseEvent) => {
                const deltaY = moveE.clientY - startY;
                setContainerHeight(Math.max(200, Math.min(800, startHeight + deltaY)));
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        )}

        {/* Visual explanation label */}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/90 backdrop-blur-sm rounded text-xs text-muted-foreground border border-border/50">
          Visual Explanation
        </div>
      </div>

      {/* Fullscreen Modal — covers only #lesson-main-content area between sidebars */}
      {isFullscreen && (
        <div
          className="z-50 bg-background/95 backdrop-blur-sm flex flex-col"
          style={mainContentRect ? {
            position: "fixed",
            top: mainContentRect.top,
            left: mainContentRect.left,
            width: mainContentRect.width,
            height: mainContentRect.height,
          } : {
            position: "fixed",
            inset: 0,
          }}
        >
          {/* Fullscreen header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
            <div className="flex items-center gap-4">
              <span className="text-base font-medium">Visual Explanation</span>
              <ZoomControls 
                currentZoom={fullscreenZoom} 
                onZoomChange={handleFullscreenZoomChange} 
                onReset={handleFullscreenReset}
                open={fullscreenZoomPopoverOpen}
                onOpenChange={setFullscreenZoomPopoverOpen}
              />
              {fullscreenZoom > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Move className="h-3.5 w-3.5" />
                  <span>Drag to pan</span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>

          {/* Fullscreen canvas container */}
          <div
            ref={fullscreenContainerRef}
            className={cn(
              "flex-1 overflow-hidden flex items-center justify-center",
              fullscreenZoom > 1 ? "cursor-grab" : "cursor-default",
              isPanning && "cursor-grabbing"
            )}
            style={{
              backgroundImage: 'radial-gradient(circle, hsl(var(--muted)) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
          >
            <div 
              className="p-8 transition-transform duration-75"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              }}
            >
              <canvas
                ref={fullscreenCanvasRef}
                className="block shadow-lg rounded-lg bg-white select-none"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
