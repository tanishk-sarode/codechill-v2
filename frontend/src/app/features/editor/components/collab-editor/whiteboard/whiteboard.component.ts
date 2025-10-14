import { AfterViewInit, Component, ElementRef, ViewChild, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

interface DrawingPoint {
  x: number;
  y: number;
}

interface DrawingPath {
  points: DrawingPoint[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser';
}

interface Shape {
  type: 'rectangle' | 'circle' | 'arrow';
  startPoint: DrawingPoint;
  endPoint: DrawingPoint;
  color: string;
  width: number;
}

@Component({
  selector: 'app-whiteboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatSliderModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule
  ],
  template: `
    <div class="whiteboard-container">
      <!-- Compact Toolbar -->
      <div class="toolbar">
        <div class="tool-section">
          <div class="tool-group">
            <button 
              mat-mini-fab 
              [class.active]="currentTool() === 'pen'"
              (click)="setTool('pen')"
              matTooltip="Pen">
              <mat-icon>edit</mat-icon>
            </button>
            <button 
              mat-mini-fab 
              [class.active]="currentTool() === 'eraser'"
              (click)="setTool('eraser')"
              matTooltip="Eraser">
              <mat-icon>auto_fix_normal</mat-icon>
            </button>
          </div>
          
          <div class="shape-group">
            <button 
              mat-mini-fab 
              [class.active]="currentTool() === 'rectangle'"
              (click)="setTool('rectangle')"
              matTooltip="Rectangle">
              <mat-icon>crop_square</mat-icon>
            </button>
            <button 
              mat-mini-fab 
              [class.active]="currentTool() === 'circle'"
              (click)="setTool('circle')"
              matTooltip="Circle">
              <mat-icon>radio_button_unchecked</mat-icon>
            </button>
            <button 
              mat-mini-fab 
              [class.active]="currentTool() === 'arrow'"
              (click)="setTool('arrow')"
              matTooltip="Arrow">
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        </div>

        <div class="control-section">
          <div class="color-controls">
            <button 
              *ngFor="let color of colors"
              class="color-btn"
              [style.backgroundColor]="color"
              [class.active]="currentColor() === color"
              (click)="setColor(color)">
            </button>
          </div>

          
          <div class="size-control">
            <mat-icon>line_weight</mat-icon>
            <input 
              type="range"
              [min]="1" 
              [max]="20" 
              [step]="1" 
              [value]="strokeWidth()"
              (input)="onStrokeWidthChange($event)"
              class="width-slider">
            <span class="size-display">{{strokeWidth()}}</span>
          </div>
        </div>

        <div class="action-section">
          <button 
            mat-mini-fab 
            (click)="undo()" 
            [disabled]="!canUndo()"
            matTooltip="Undo">
            <mat-icon>undo</mat-icon>
          </button>
          <button 
            mat-mini-fab 
            (click)="redo()" 
            [disabled]="!canRedo()"
            matTooltip="Redo">
            <mat-icon>redo</mat-icon>
          </button>
          <button 
            mat-mini-fab 
            (click)="clearBoard()" 
            matTooltip="Clear All"
            color="warn">
            <mat-icon>delete_sweep</mat-icon>
          </button>
        </div>
      </div>

      <!-- Canvas Container -->
      <div class="canvas-container" #canvasContainer>
        <canvas 
          #canvas
          [width]="canvasWidth"
          [height]="canvasHeight"
          (mousedown)="startDrawing($event)"
          (mousemove)="draw($event)"
          (mouseup)="stopDrawing()"
          (mouseleave)="stopDrawing()"
          (touchstart)="startDrawing($event)"
          (touchmove)="draw($event)"
          (touchend)="stopDrawing()">
        </canvas>
        
        <!-- Grid overlay -->
        <div class="grid-overlay" *ngIf="showGrid()"></div>
        
        <!-- Collaboration cursors -->
        <div 
          *ngFor="let cursor of collaboratorCursors" 
          class="collaborator-cursor"
          [style.left.px]="cursor.x"
          [style.top.px]="cursor.y"
          [style.border-color]="cursor.color">
          <div class="cursor-label" [style.background-color]="cursor.color">
            {{cursor.name}}
          </div>
        </div>
      </div>
      
      <!-- Bottom Controls -->
      <div class="bottom-controls">
        <button 
          mat-button
          (click)="toggleGrid()"
          [class.active]="showGrid()">
          <mat-icon>grid_on</mat-icon>
          Grid
        </button>
        <button 
          mat-button
          (click)="exportWhiteboard()">
          <mat-icon>download</mat-icon>
          Export
        </button>
        <div class="zoom-controls">
          <button mat-icon-button (click)="zoomOut()">
            <mat-icon>zoom_out</mat-icon>
          </button>
          <span class="zoom-display">{{Math.round(zoomLevel() * 100)}}%</span>
          <button mat-icon-button (click)="zoomIn()">
            <mat-icon>zoom_in</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .whiteboard-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--panel-bg);
      border-radius: var(--border-radius);
      overflow: hidden;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
      background: linear-gradient(135deg, var(--primary-accent), var(--secondary-accent));
      color: white;
      box-shadow: var(--shadow);
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .tool-section {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .tool-group, .shape-group {
      display: flex;
      gap: 0.25rem;
      padding: 0.2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: var(--border-radius-sm);
      backdrop-filter: blur(10px);
    }

    .control-section {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .color-controls {
      display: flex;
      gap: 0.3rem;
      padding: 0.3rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: var(--border-radius-sm);
      backdrop-filter: blur(10px);
    }

    .color-btn {
      width: 32px !important;
      height: 32px !important;
      min-height: 32px !important;
      border: 3px solid rgba(0, 0, 0, 0.8) !important;
      transition: all 0.2s ease;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4), inset 0 1px 3px rgba(255, 255, 255, 0.3);
      position: relative;
    }

    .color-btn.active {
      border-color: rgba(0, 0, 0, 1) !important;
      border-width: 4px !important;
      transform: scale(1.15);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.6), inset 0 2px 5px rgba(255, 255, 255, 0.4);
    }

    .color-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 3px rgba(255, 255, 255, 0.4);
    }

    .size-control {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.1);
      padding: 0.5rem;
      border-radius: var(--border-radius-sm);
      backdrop-filter: blur(10px);
    }

    .width-slider {
      width: 80px;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      outline: none;
      -webkit-appearance: none;
    }

    .width-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .width-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .size-display {
      font-size: 0.8rem;
      font-weight: 600;
      min-width: 20px;
      text-align: center;
    }

    .action-section {
      display: flex;
      gap: 0.375rem;
    }

    .toolbar button {
      color: white !important;
    //   background: rgba(255, 255, 255, 0.15) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
    }

    .toolbar button:hover {
    //   background: rgba(255, 255, 255, 0.25) !important;
      transform: translateY(-1px);
    }

    .toolbar button.active {
    //   background: rgba(255, 255, 255, 0.3) !important;
      border-color: rgba(255, 255, 255, 0.5) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .toolbar button:disabled {
      opacity: 0.4;
      transform: none !important;
    }

    .canvas-container {
      flex: 1;
      position: relative;
      background: #ffffff;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    canvas {
      display: block;
      cursor: crosshair;
      background: white;
      border-radius: var(--border-radius-sm);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      max-width: 100%;
      max-height: 100%;
      transition: width 0.3s ease, height 0.3s ease;
    }

    .grid-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
      background-size: 20px 20px;
      pointer-events: none;
    }

    .collaborator-cursor {
      position: absolute;
      width: 20px;
      height: 20px;
      border: 2px solid;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      pointer-events: none;
      z-index: 10;
      transition: all 0.1s ease;
    }

    .cursor-label {
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 0.7rem;
      padding: 0.2rem 0.4rem;
      border-radius: var(--border-radius-sm);
      white-space: nowrap;
      font-weight: 600;
    }

    .bottom-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--panel-bg);
      border-top: 1px solid var(--panel-border);
    }

    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .zoom-display {
      font-size: 0.8rem;
      font-weight: 600;
      min-width: 40px;
      text-align: center;
    }

    .bottom-controls button.active {
      background: var(--primary-accent);
      color: white;
    }

    @media (max-width: 768px) {
      .toolbar {
        padding: 0.5rem;
        gap: 0.5rem;
        flex-direction: column;
      }
      
      .tool-section {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .control-section {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
      }
      
      .action-section {
        width: 100%;
        justify-content: center;
      }
      
      .size-control {
        flex-direction: row;
        gap: 0.5rem;
      }
      
      .width-slider {
        width: 80px;
      }
      
      .canvas-container {
        touch-action: none; /* Better touch handling */
      }
      
      canvas {
        touch-action: none;
      }
      
      .bottom-controls {
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .zoom-controls {
        order: -1;
      }
    }
  `]
})
export class WhiteboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  // Signals for reactive state
  currentTool = signal<'pen' | 'eraser' | 'rectangle' | 'circle' | 'arrow'>('pen');
  currentColor = signal('#2563eb');
  strokeWidth = signal(3);
  showGrid = signal(false);
  zoomLevel = signal(1);
  canUndo = signal(false);
  canRedo = signal(false);

  // Canvas properties
  canvasWidth = 1200;
  canvasHeight = 600;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private lastPoint: DrawingPoint | null = null;
  private currentPath: DrawingPath | null = null;
  private currentShape: Shape | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Drawing data
  private paths: DrawingPath[] = [];
  private shapes: Shape[] = [];
  private history: { paths: DrawingPath[], shapes: Shape[] }[] = [];
  private historyIndex = -1;

  // Colors palette - reduced to 3 essential colors
  colors = [
    '#2563eb', // Blue
    '#dc2626', // Red  
    '#000000'  // Black
  ];

  // Collaboration cursors (mock data)
  collaboratorCursors = [
    { name: 'Alice', x: 100, y: 100, color: '#7e57c2' },
    { name: 'Bob', x: 200, y: 150, color: '#42a5f5' }
  ];

  // Expose Math for template
  Math = Math;

  ngAfterViewInit(): void {
    this.initCanvas();
    this.resizeCanvas();
    
    // Set up ResizeObserver for dynamic canvas resizing
    this.resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Debounce resize calls
        setTimeout(() => this.resizeCanvas(), 100);
      }
    });
    
    // Observe both the container and window
    this.resizeObserver.observe(this.containerRef.nativeElement);
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => this.handleKeydown(event));
  }

  ngOnDestroy(): void {
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Clean up event listeners
    window.removeEventListener('resize', () => this.resizeCanvas());
    document.removeEventListener('keydown', (event) => this.handleKeydown(event));
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.saveToHistory();
  }

  private resizeCanvas(): void {
    const container = this.containerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    
    // Calculate optimal canvas size with better responsiveness
    const padding = 40;
    const maxWidth = Math.max(rect.width - padding, 400); // Minimum width
    const maxHeight = Math.max(rect.height - padding, 500); // Minimum height
    
    // Store old dimensions to preserve aspect ratio if needed
    const oldWidth = this.canvasWidth;
    const oldHeight = this.canvasHeight;
    
    this.canvasWidth = Math.min(maxWidth, 1400); // Max width limit
    this.canvasHeight = Math.min(maxHeight, 800); // Max height limit
    
    // Only redraw if dimensions actually changed
    if (oldWidth !== this.canvasWidth || oldHeight !== this.canvasHeight) {
      // Redraw everything after resize with a small delay to ensure DOM updates
      setTimeout(() => this.redrawCanvas(), 50);
    }
  }

  setTool(tool: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'arrow'): void {
    this.currentTool.set(tool);
  }

  setColor(color: string): void {
    this.currentColor.set(color);
  }

  setStrokeWidth(width: number): void {
    this.strokeWidth.set(width);
  }

  onStrokeWidthChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.setStrokeWidth(Number(target.value));
    }
  }

  toggleGrid(): void {
    this.showGrid.update(show => !show);
  }

  zoomIn(): void {
    this.zoomLevel.update(zoom => Math.min(zoom + 0.1, 3));
  }

  zoomOut(): void {
    this.zoomLevel.update(zoom => Math.max(zoom - 0.1, 0.3));
  }

  private getEventPoint(event: MouseEvent | TouchEvent): DrawingPoint {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }
    
    return {
      x: (clientX - rect.left) / this.zoomLevel(),
      y: (clientY - rect.top) / this.zoomLevel()
    };
  }

  startDrawing(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isDrawing = true;
    const point = this.getEventPoint(event);
    this.lastPoint = point;

    if (['pen', 'eraser'].includes(this.currentTool())) {
      this.currentPath = {
        points: [point],
        color: this.currentColor(),
        width: this.strokeWidth(),
        tool: this.currentTool() as 'pen' | 'eraser'
      };
    } else {
      this.currentShape = {
        type: this.currentTool() as 'rectangle' | 'circle' | 'arrow',
        startPoint: point,
        endPoint: point,
        color: this.currentColor(),
        width: this.strokeWidth()
      };
    }
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing) return;
    event.preventDefault();
    
    const point = this.getEventPoint(event);

    if (this.currentPath) {
      this.currentPath.points.push(point);
      this.drawPath(this.currentPath);
    } else if (this.currentShape) {
      this.currentShape.endPoint = point;
      this.redrawCanvas();
      this.drawShape(this.currentShape);
    }

    this.lastPoint = point;
  }

  stopDrawing(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentPath) {
      this.paths.push(this.currentPath);
      this.currentPath = null;
    } else if (this.currentShape) {
      this.shapes.push(this.currentShape);
      this.currentShape = null;
    }

    this.saveToHistory();
    this.lastPoint = null;
  }

  private drawPath(path: DrawingPath): void {
    if (path.points.length < 2) return;

    this.ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
    this.ctx.strokeStyle = path.color;
    this.ctx.lineWidth = path.width;
    this.ctx.globalAlpha = 1;

    this.ctx.beginPath();
    this.ctx.moveTo(path.points[0].x, path.points[0].y);
    
    for (let i = 1; i < path.points.length; i++) {
      this.ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    
    this.ctx.stroke();
    this.ctx.globalCompositeOperation = 'source-over';
  }

  private drawShape(shape: Shape): void {
    this.ctx.strokeStyle = shape.color;
    this.ctx.lineWidth = shape.width;
    this.ctx.fillStyle = 'transparent';

    const { startPoint, endPoint } = shape;
    const width = endPoint.x - startPoint.x;
    const height = endPoint.y - startPoint.y;

    this.ctx.beginPath();
    
    switch (shape.type) {
      case 'rectangle':
        this.ctx.rect(startPoint.x, startPoint.y, width, height);
        break;
      case 'circle':
        const radius = Math.sqrt(width * width + height * height);
        this.ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        break;
      case 'arrow':
        this.drawArrow(startPoint, endPoint);
        break;
    }
    
    this.ctx.stroke();
  }

  private drawArrow(start: DrawingPoint, end: DrawingPoint): void {
    const headLength = 20;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);

    // Draw line
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);

    // Draw arrowhead
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
  }

  private redrawCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Draw all paths
    this.paths.forEach(path => this.drawPath(path));
    
    // Draw all shapes
    this.shapes.forEach(shape => this.drawShape(shape));
  }

  private saveToHistory(): void {
    const state = {
      paths: [...this.paths],
      shapes: [...this.shapes]
    };
    
    // Remove any states after current index
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);
    this.historyIndex = this.history.length - 1;
    
    this.updateUndoRedoState();
  }

  private updateUndoRedoState(): void {
    this.canUndo.set(this.historyIndex > 0);
    this.canRedo.set(this.historyIndex < this.history.length - 1);
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreFromHistory();
    }
  }

  redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreFromHistory();
    }
  }

  private restoreFromHistory(): void {
    const state = this.history[this.historyIndex];
    this.paths = [...state.paths];
    this.shapes = [...state.shapes];
    this.redrawCanvas();
    this.updateUndoRedoState();
  }

  clearBoard(): void {
    this.paths = [];
    this.shapes = [];
    this.redrawCanvas();
    this.saveToHistory();
  }

  exportWhiteboard(): void {
    const canvas = this.canvasRef.nativeElement;
    const link = document.createElement('a');
    link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  private handleKeydown(event: KeyboardEvent): void {
    // Only handle shortcuts when not typing in an input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'p':
        this.setTool('pen');
        break;
      case 'e':
        this.setTool('eraser');
        break;
      case 'r':
        this.setTool('rectangle');
        break;
      case 'c':
        this.setTool('circle');
        break;
      case 'a':
        this.setTool('arrow');
        break;
      case 'g':
        this.toggleGrid();
        break;
      case 'z':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (event.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
        }
        break;
      case 'delete':
      case 'backspace':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.clearBoard();
        }
        break;
    }
  }
}