import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodemirrorModule, CodemirrorComponent } from '@ctrl/ngx-codemirror';

// Import CodeMirror modes
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike';

// Import CodeMirror addons
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/brace-fold';

@Component({
  selector: 'app-code-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatTooltipModule,
    CodemirrorModule
  ],
  template: `
    <div class="code-editor-container">
      <div class="editor-header">
        <mat-icon>code</mat-icon>
        <h4>Collaborative Code Editor</h4>
        <div class="language-selector">
          <mat-form-field appearance="outline" class="compact-field header-field">
            <mat-select [(value)]="selectedLanguage" (selectionChange)="onLanguageChange()">
              <mat-option *ngFor="let lang of languages" [value]="lang.value">
                {{ lang.name }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <div class="editor-content">
        <ngx-codemirror
          #codeEditor
          [(ngModel)]="code"
          [options]="codeMirrorOptions"
          class="code-mirror">
        </ngx-codemirror>
      </div>

      <div class="editor-footer">
        <div class="footer-content">
          <div class="input-section">
            <mat-form-field appearance="outline" class="input-field">
              <mat-label>Program Input</mat-label>
              <mat-icon matPrefix>input</mat-icon>
              <textarea 
                matInput 
                [(ngModel)]="input" 
                placeholder="Enter your input here..." 
                rows="3"
                class="input-textarea">
              </textarea>
              <mat-hint>Provide input for your program execution</mat-hint>
            </mat-form-field>
          </div>

          <div class="actions-section">
            <div class="primary-actions">
              <!-- Note: Use direct mat-icon and span elements within Material buttons -->
              <!-- Avoid wrapper divs to prevent text duplication issues -->
              <button 
                mat-raised-button 
                color="primary" 
                (click)="runCode()" 
                [disabled]="isRunning"
                class="run-button"
                [class.loading]="isRunning">
                <mat-icon class="button-icon" [class.spinning]="isRunning">
                  {{ isRunning ? 'sync' : 'play_arrow' }}
                </mat-icon>
                <span class="button-text">{{ isRunning ? 'Running...' : 'Run Code' }}</span>
              </button>
              
              <button 
                mat-stroked-button 
                (click)="clearCode()"
                class="clear-button"
                matTooltip="Clear all code and output">
                <mat-icon class="button-icon">clear_all</mat-icon>
                <span class="button-text">Clear All</span>
              </button>
            </div>
            
            <div class="utility-actions">
              <button 
                mat-icon-button 
                (click)="copyCode()"
                class="copy-code-button"
                matTooltip="Copy code to clipboard">
                <mat-icon>content_copy</mat-icon>
              </button>
              
              <button 
                mat-icon-button 
                (click)="downloadCode()"
                class="download-button"
                matTooltip="Download code as file">
                <mat-icon>download</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="output-section" *ngIf="output || error || isRunning">
        <div class="output-header">
          <mat-icon>terminal</mat-icon>
          <h5>Program Output</h5>
          <button mat-icon-button (click)="clearOutput()" *ngIf="output || error" matTooltip="Clear output">
            <mat-icon>clear</mat-icon>
          </button>
        </div>
        <div class="output-content" [class.error]="error" [class.running]="isRunning">
          <div *ngIf="isRunning" class="running-indicator">
            <mat-icon class="spinning">sync</mat-icon>
            <span>Executing code...</span>
          </div>
          <pre *ngIf="!isRunning">{{ error || output || 'No output' }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .code-editor-container {
      background: var(--panel-bg);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 80vh;
    }

    .editor-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.375rem 0.75rem;
      background: linear-gradient(135deg, var(--primary-accent), var(--secondary-accent));
      color: white;
      min-height: 32px;
    }

    .editor-header h4 {
      margin: 0;
      flex: 1;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .language-selector {
      min-width: 100px;
    }

    .compact-field {
      font-size: 0.8rem;
    }

    .compact-field ::ng-deep .mat-mdc-form-field {
      height: 28px;
      line-height: 28px;
    }

    .compact-field ::ng-deep .mat-mdc-form-field-wrapper {
      padding-bottom: 0;
      height: 28px;
    }

    .compact-field ::ng-deep .mat-mdc-form-field-infix {
      padding: 0.2rem 0;
      min-height: 28px;
      line-height: 28px;
    }

    .compact-field ::ng-deep .mat-mdc-form-field-outline {
      color: rgba(255, 255, 255, 0.3);
    }

    .compact-field ::ng-deep .mat-mdc-form-field-outline-thick {
      color: rgba(255, 255, 255, 0.7);
    }

    .compact-field ::ng-deep .mat-mdc-select {
      color: white;
      font-size: 0.75rem;
      line-height: 28px;
    }

    .compact-field ::ng-deep .mat-mdc-select-value {
      color: white;
      font-weight: 500;
    }

    .compact-field ::ng-deep .mat-mdc-select-arrow {
      color: rgba(255, 255, 255, 0.7);
    }

    .header-field ::ng-deep .mat-mdc-form-field {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      backdrop-filter: blur(10px);
    }

    .header-field ::ng-deep .mat-mdc-form-field-outline {
      border-color: rgba(255, 255, 255, 0.2) !important;
    }

    .header-field ::ng-deep .mat-mdc-form-field-outline-thick {
      border-color: rgba(255, 255, 255, 0.5) !important;
    }

    .header-field ::ng-deep .mat-mdc-form-field:hover .mat-mdc-form-field-outline {
      border-color: rgba(255, 255, 255, 0.4) !important;
    }    .editor-content {
      flex: 1;
      min-height: 350px;
    }

    .code-mirror {
      height: 100%;
    }

    .code-mirror ::ng-deep .CodeMirror {
      height: 100%;
      font-family: var(--font-code);
      font-size: 14px;
      background: var(--panel-bg);
      color: var(--text-primary);
    }

    .editor-footer {
      padding: 1rem 1.5rem;
      background: var(--primary-bg);
      border-top: 1px solid var(--panel-border);
    }

    .footer-content {
      display: flex;
      gap: 1.5rem;
      align-items: flex-start;
    }

    .input-section {
      flex: 1;
      min-width: 0;
    }

    .input-field {
      width: 100%;
      background: var(--panel-bg);
      border-radius: var(--border-radius-sm);
    }

    .input-field ::ng-deep .mat-mdc-form-field {
      background: var(--panel-bg);
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--panel-border);
      transition: all 0.3s ease;
    }

    .input-field ::ng-deep .mat-mdc-form-field:hover {
      border-color: var(--primary-accent);
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.1);
    }

    .input-field ::ng-deep .mat-mdc-form-field.mat-focused {
      border-color: var(--primary-accent);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
    }

    .input-field ::ng-deep .mat-mdc-form-field-outline {
      border: none;
    }

    .input-field ::ng-deep .mat-mdc-form-field-outline-thick {
      border: none;
    }

    .input-textarea {
      min-height: 60px !important;
      font-family: var(--font-code);
      font-size: 0.875rem;
      line-height: 1.4;
      background: var(--panel-bg);
      color: var(--text-primary);
      border: none;
      resize: vertical;
    }

    .input-field ::ng-deep .mat-mdc-form-field-label {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .input-field ::ng-deep .mat-mdc-form-field-label.mat-focused {
      color: var(--primary-accent);
    }

    .input-field ::ng-deep .mat-hint {
      color: var(--text-secondary);
      font-size: 0.75rem;
    }

    .actions-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .primary-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .utility-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      justify-content: center;
    }

    .run-button {
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, var(--primary-accent), var(--secondary-accent)) !important;
      border: none !important;
      border-radius: 25px !important;
      min-width: 130px;
      height: 40px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
      display: flex !important;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .run-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
    }

    .run-button:disabled {
      opacity: 0.8;
      cursor: not-allowed;
    }

    .run-button.loading {
      animation: pulse 2s infinite;
    }

    .clear-button {
      position: relative;
      border-radius: 25px !important;
      min-width: 110px;
      height: 40px;
      transition: all 0.3s ease;
      border-color: var(--danger) !important;
      color: var(--danger) !important;
      display: flex !important;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .clear-button:hover {
      background-color: var(--danger) !important;
      color: white !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
    }

    .copy-code-button, .download-button {
      background: var(--panel-bg) !important;
      border: 2px solid var(--panel-border);
      color: var(--text-secondary) !important;
      transition: all 0.3s ease;
      border-radius: 50%;
      width: 36px;
      height: 36px;
    }

    .copy-code-button:hover, .download-button:hover {
      background: var(--primary-accent) !important;
      color: white !important;
      border-color: var(--primary-accent);
      transform: translateY(-1px) scale(1.05);
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
    }

    .button-icon {
      font-size: 1.25rem !important;
      transition: transform 0.3s ease;
    }

    .button-text {
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: none;
    }

    .output-section {
      padding: 0;
      background: var(--primary-bg);
      border-top: 1px solid var(--panel-border);
      max-height: 250px;
      display: flex;
      flex-direction: column;
      border-radius: 0 0 var(--border-radius) var(--border-radius);
    }

    .output-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.5rem 0.75rem;
      background: var(--panel-bg);
      border-bottom: 1px solid var(--panel-border);
    }

    .output-header mat-icon {
      color: var(--primary-accent);
      font-size: 1.25rem;
    }

    .output-section h5 {
      margin: 0;
      color: var(--text-heading);
      font-weight: 600;
      flex: 1;
      font-size: 0.95rem;
    }

    .output-header button {
      color: var(--text-secondary) !important;
      background: rgba(239, 68, 68, 0.1) !important;
      border: 1px solid rgba(239, 68, 68, 0.2) !important;
      transition: all 0.3s ease;
      width: 32px !important;
      height: 32px !important;
    }

    .output-header button:hover {
      background: var(--danger) !important;
      color: white !important;
      border-color: var(--danger) !important;
      transform: scale(1.05);
    }

    .output-content {
      flex: 1;
      background: var(--panel-bg);
      border: 2px solid var(--panel-border);
      border-radius: var(--border-radius-sm);
      margin: 0 1.5rem 1.5rem;
      padding: 1.25rem;
      font-family: var(--font-code);
      font-size: 0.875rem;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-y: auto;
      position: relative;
      min-height: 80px;
      transition: all 0.3s ease;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .output-content:focus-within {
      border-color: var(--primary-accent);
      box-shadow: inset 0 2px 4px rgba(139, 92, 246, 0.1);
    }

    .output-content.error {
      background: rgba(239, 68, 68, 0.05);
      border-color: rgba(239, 68, 68, 0.3);
      color: var(--danger);
      box-shadow: inset 0 2px 4px rgba(239, 68, 68, 0.1);
    }

    .output-content.running {
      background: rgba(59, 130, 246, 0.05);
      border-color: rgba(59, 130, 246, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 2px 4px rgba(59, 130, 246, 0.1);
    }

    .running-indicator {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--primary-accent);
      font-weight: 500;
      padding: 1rem;
      background: rgba(59, 130, 246, 0.1);
      border-radius: var(--border-radius-sm);
      border: 1px solid rgba(59, 130, 246, 0.2);
    }

    .running-indicator mat-icon {
      color: var(--primary-accent);
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .output-content pre {
      margin: 0;
      white-space: pre-wrap;
      color: var(--text-primary);
      font-family: var(--font-code);
      line-height: 1.5;
    }
  `]
})
export class CodeEditorComponent implements OnInit {
  @ViewChild('codeEditor') codeEditor!: CodemirrorComponent;
  
  code = `// Welcome to the collaborative code editor!
// Start coding here...

function hello() {
    console.log("Hello, World!");
}

hello();`;

  input = '';
  output = '';
  error = '';
  isRunning = false;
  selectedLanguage = 'javascript';

  languages = [
    { value: 'javascript', name: 'JavaScript' },
    { value: 'python', name: 'Python' },
    { value: 'cpp', name: 'C++' },
    { value: 'java', name: 'Java' },
    { value: 'csharp', name: 'C#' }
  ];

  codeMirrorOptions: any = {
    theme: 'default',
    lineNumbers: true,
    lineWrapping: true,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    mode: 'javascript',
    readOnly: false,
    autofocus: true
  };

  ngOnInit(): void {
    this.updateCodeMirrorMode();
  }

  onLanguageChange(): void {
    this.updateCodeMirrorMode();
    // Force CodeMirror to refresh with new mode
    if (this.codeEditor && this.codeEditor.codeMirror) {
      const newMode = this.getModeForLanguage(this.selectedLanguage);
      this.codeEditor.codeMirror.setOption('mode', newMode);
      this.codeEditor.codeMirror.refresh();
    }
  }

  private getModeForLanguage(language: string): string {
    const modeMap: { [key: string]: string } = {
      javascript: 'javascript',
      python: 'python',
      cpp: 'text/x-c++src',
      java: 'text/x-java',
      csharp: 'text/x-csharp'
    };
    return modeMap[language] || 'javascript';
  }

  updateCodeMirrorMode(): void {
    this.codeMirrorOptions = {
      ...this.codeMirrorOptions,
      mode: this.getModeForLanguage(this.selectedLanguage)
    };
  }

  async runCode(): Promise<void> {
    if (!this.code.trim()) {
      return;
    }

    this.isRunning = true;
    this.output = '';
    this.error = '';

    try {
      await this.simulateExecution();
    } catch (err) {
      this.error = 'Failed to execute code. Please try again.';
    } finally {
      this.isRunning = false;
    }
  }

  private async simulateExecution(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (this.selectedLanguage === 'javascript') {
      this.output = 'Hello, World!\n';
    } else if (this.selectedLanguage === 'python') {
      this.output = 'Hello, World!\n';
    } else {
      this.output = 'Code executed successfully!\n';
    }
  }

  clearCode(): void {
    this.code = '';
    this.input = '';
    this.output = '';
    this.error = '';
  }

  clearOutput(): void {
    this.output = '';
    this.error = '';
  }

  copyCode(): void {
    navigator.clipboard.writeText(this.code).then(() => {
      // Show success notification - you might want to inject a notification service
      console.log('Code copied to clipboard!');
    }).catch(() => {
      console.error('Failed to copy code');
    });
  }

  downloadCode(): void {
    const languageExtensions: { [key: string]: string } = {
      javascript: 'js',
      python: 'py',
      cpp: 'cpp',
      java: 'java',
      csharp: 'cs'
    };
    
    const extension = languageExtensions[this.selectedLanguage] || 'txt';
    const filename = `code.${extension}`;
    
    const blob = new Blob([this.code], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
