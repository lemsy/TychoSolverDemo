import { Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';
import { SolverService, SolverProgress, SolverResult } from '../services/solver.service';

@Component({
  selector: 'app-sudoku-demo',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sudoku-demo">
      <h2>Sudoku Solver Demo</h2>
      <p>Watch as the genetic algorithm solves a 9x9 Sudoku puzzle in real-time!</p>
      
      <div class="demo-container">
        <!-- Controls -->
        <div class="controls">
          <div class="parameter-group">
            <label>Population Size:</label>
            <input type="number" [(ngModel)]="populationSize" [disabled]="isRunning()" min="10" max="200" step="10">
          </div>
          
          <div class="parameter-group">
            <label>Max Iterations:</label>
            <input type="number" [(ngModel)]="maxIterations" [disabled]="isRunning()" min="100" max="10000" step="100">
          </div>
          
          <div class="parameter-group">
            <label>Mutation Rate:</label>
            <input type="number" [(ngModel)]="mutationRate" [disabled]="isRunning()" min="0.01" max="0.5" step="0.01">
          </div>
          
          <div class="button-group">
            <button (click)="startSolving()" [disabled]="isRunning()" class="btn-primary">
              {{isRunning() ? 'Solving...' : 'Start Solving'}}
            </button>
            
            <button (click)="resetPuzzle()" [disabled]="isRunning()" class="btn-secondary">
              Reset Puzzle
            </button>
          </div>
        </div>

        <!-- Sudoku Grid -->
        <div class="sudoku-container">
          <div class="sudoku-grid" #sudokuGrid></div>
        </div>

        <!-- Progress Chart -->
        <div class="progress-container">
          <h3>Evolution Progress</h3>
          <div class="chart" #progressChart></div>
          
          @if (currentProgress()) {
            <div class="progress-info">
              <div class="progress-item">
                <span class="label">Iteration:</span>
                <span class="value">{{currentProgress()?.iteration}}</span>
              </div>
              <div class="progress-item">
                <span class="label">Current Fitness:</span>
                <span class="value">{{currentProgress()?.currentFitness}}</span>
              </div>
              <div class="progress-item">
                <span class="label">Best Fitness:</span>
                <span class="value">{{currentProgress()?.bestFitness}}</span>
              </div>
              <div class="progress-item">
                <span class="label">Progress:</span>
                <span class="value">{{((currentProgress()?.bestFitness || 0) / 243 * 100).toFixed(1)}}%</span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Results -->
      @if (result()) {
        <div class="results">
          <h3>Solution Found!</h3>
          <div class="result-stats">
            <div class="stat">
              <span class="label">Final Fitness:</span>
              <span class="value">{{result()?.fitness}}</span>
            </div>
            <div class="stat">
              <span class="label">Iterations:</span>
              <span class="value">{{result()?.iterations}}</span>
            </div>
            <div class="stat">
              <span class="label">Execution Time:</span>
              <span class="value">{{result()?.executionTime}}ms</span>
            </div>
            <div class="stat">
              <span class="label">Success Rate:</span>
              <span class="value">{{((result()?.fitness || 0) / 243 * 100).toFixed(1)}}%</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .sudoku-demo {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .demo-container {
      display: grid;
      grid-template-columns: 300px 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }

    .controls {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
    }

    .parameter-group {
      margin-bottom: 15px;
    }

    .parameter-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }

    .parameter-group input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .button-group {
      margin-top: 20px;
    }

    .btn-primary, .btn-secondary {
      width: 100%;
      padding: 10px;
      margin-bottom: 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }

    .btn-primary {
      background: #007acc;
      color: white;
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .sudoku-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .progress-container {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
    }

    .chart {
      width: 100%;
      height: 200px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
    }

    .progress-info {
      margin-top: 15px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .progress-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      background: white;
      border-radius: 4px;
    }

    .progress-item .label {
      font-weight: bold;
    }

    .progress-item .value {
      color: #007acc;
      font-weight: bold;
    }

    .results {
      margin-top: 20px;
      padding: 20px;
      background: #e8f5e8;
      border-radius: 8px;
      border: 2px solid #28a745;
    }

    .result-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }

    .stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background: white;
      border-radius: 4px;
    }

    .stat .label {
      font-weight: bold;
    }

    .stat .value {
      color: #28a745;
      font-weight: bold;
    }

    @media (max-width: 768px) {
      .demo-container {
        grid-template-columns: 1fr;
        gap: 15px;
      }
      
      .result-stats {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SudokuDemoComponent implements OnInit {
  @ViewChild('sudokuGrid', { static: true }) sudokuGridRef!: ElementRef;
  @ViewChild('progressChart', { static: true }) progressChartRef!: ElementRef;

  // Parameters
  populationSize = 50;
  maxIterations = 1000;
  mutationRate = 0.1;

  // State
  isRunning = signal(false);
  currentProgress = signal<SolverProgress | null>(null);
  result = signal<SolverResult | null>(null);

  // Data
  private progressData: { iteration: number; fitness: number }[] = [];
  private progressChart: any;

  // Initial Sudoku puzzle
  private initialGrid = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
  ];

  private currentGrid = this.initialGrid.map(row => [...row]);

  constructor(private solverService: SolverService) { }

  ngOnInit() {
    this.initializeSudokuVisualization();
    this.initializeProgressChart();

    // Subscribe to solver progress
    this.solverService.progress$.subscribe(progress => {
      if (progress) {
        this.currentProgress.set(progress);
        this.updateProgressChart(progress);
        // Note: We don't update visualization from progress as it doesn't contain the solution
        // The solution will be updated when the solving is complete
      }
    });

    // Subscribe to solver running state
    this.solverService.isRunning$.subscribe(running => {
      this.isRunning.set(running);
    });
  }

  private initializeSudokuVisualization() {
    const container = d3.select(this.sudokuGridRef.nativeElement);
    container.selectAll('*').remove();

    const size = 360;
    const cellSize = size / 9;

    const svg = container
      .append('svg')
      .attr('width', size)
      .attr('height', size)
      .style('border', '2px solid #333');

    // Create grid lines
    for (let i = 0; i <= 9; i++) {
      const strokeWidth = i % 3 === 0 ? 2 : 1;

      // Vertical lines
      svg.append('line')
        .attr('x1', i * cellSize)
        .attr('y1', 0)
        .attr('x2', i * cellSize)
        .attr('y2', size)
        .attr('stroke', '#333')
        .attr('stroke-width', strokeWidth);

      // Horizontal lines
      svg.append('line')
        .attr('x1', 0)
        .attr('y1', i * cellSize)
        .attr('x2', size)
        .attr('y2', i * cellSize)
        .attr('stroke', '#333')
        .attr('stroke-width', strokeWidth);
    }

    // Create cells
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const cell = svg.append('g')
          .attr('class', `cell-${i}-${j}`);

        cell.append('rect')
          .attr('x', j * cellSize + 1)
          .attr('y', i * cellSize + 1)
          .attr('width', cellSize - 2)
          .attr('height', cellSize - 2)
          .attr('fill', this.initialGrid[i][j] === 0 ? '#fff' : '#f0f0f0');

        if (this.currentGrid[i][j] !== 0) {
          cell.append('text')
            .attr('class', 'cell-text')
            .attr('x', j * cellSize + cellSize / 2)
            .attr('y', i * cellSize + cellSize / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '20px')
            .attr('font-weight', this.initialGrid[i][j] === 0 ? 'normal' : 'bold')
            .attr('fill', this.initialGrid[i][j] === 0 ? '#007acc' : '#333')
            .text(this.currentGrid[i][j]);
        }
      }
    }
  }

  private updateSudokuVisualization(grid: number[][]) {
    const container = d3.select(this.sudokuGridRef.nativeElement);
    const cellSize = 360 / 9;

    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const cell = container.select(`.cell-${i}-${j}`);

        // Update text
        cell.select('.cell-text').remove();

        if (grid[i][j] !== 0) {
          cell.append('text')
            .attr('class', 'cell-text')
            .attr('x', j * cellSize + cellSize / 2)
            .attr('y', i * cellSize + cellSize / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '20px')
            .attr('font-weight', this.initialGrid[i][j] === 0 ? 'normal' : 'bold')
            .attr('fill', this.initialGrid[i][j] === 0 ? '#007acc' : '#333')
            .text(grid[i][j]);
        }
      }
    }

    this.currentGrid = grid.map(row => [...row]);
  }

  private initializeProgressChart() {
    const container = d3.select(this.progressChartRef.nativeElement);
    container.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 300 - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;

    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    this.progressChart = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add axes
    this.progressChart.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`);

    this.progressChart.append('g')
      .attr('class', 'y-axis');

    // Add labels
    svg.append('text')
      .attr('x', width / 2 + margin.left)
      .attr('y', height + margin.top + margin.bottom - 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Iteration');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(height / 2 + margin.top))
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Fitness');
  }

  private updateProgressChart(progress: SolverProgress) {
    this.progressData.push({
      iteration: progress.iteration,
      fitness: progress.bestFitness
    });

    // Keep only last 100 points for performance
    if (this.progressData.length > 100) {
      this.progressData = this.progressData.slice(-100);
    }

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 300 - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
      .domain(d3.extent(this.progressData, d => d.iteration) as [number, number])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, 243])
      .range([height, 0]);

    const line = d3.line<{ iteration: number; fitness: number }>()
      .x(d => xScale(d.iteration))
      .y(d => yScale(d.fitness))
      .curve(d3.curveMonotoneX);

    // Update axes
    this.progressChart.select('.x-axis')
      .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

    this.progressChart.select('.y-axis')
      .call(d3.axisLeft(yScale));

    // Update line
    const path = this.progressChart.selectAll('.progress-line')
      .data([this.progressData]);

    path.enter()
      .append('path')
      .attr('class', 'progress-line')
      .attr('fill', 'none')
      .attr('stroke', '#007acc')
      .attr('stroke-width', 2)
      .merge(path)
      .attr('d', line);
  }

  startSolving() {
    this.result.set(null);
    this.progressData = [];
    this.currentGrid = this.initialGrid.map(row => [...row]);
    this.initializeSudokuVisualization();

    this.solverService.solveSudoku(this.initialGrid, {
      populationSize: this.populationSize,
      maxIterations: this.maxIterations,
      mutationRate: this.mutationRate
    }).then(result => {
      this.result.set(result);
      // Update the visualization with the final solution
      if (result.solution) {
        this.updateSudokuVisualization(result.solution);
      }
    }).catch(error => {
      console.error('Solving failed:', error);
    });
  }

  resetPuzzle() {
    this.result.set(null);
    this.currentProgress.set(null);
    this.progressData = [];
    this.currentGrid = this.initialGrid.map(row => [...row]);
    this.initializeSudokuVisualization();
    this.initializeProgressChart();
  }
}
