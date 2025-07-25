import { Component, ElementRef, OnInit, OnDestroy, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';
import { SolverService, SolverProgress, SolverResult } from '../services/solver.service';

@Component({
  selector: 'app-sudoku-demo',
  imports: [CommonModule, FormsModule],
  templateUrl: './sudoku-demo.component.html',
  styleUrl: './sudoku-demo.component.css'
})
export class SudokuDemoComponent implements OnInit, OnDestroy {
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
  private subscriptions = new Subscription();

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
    // Clear any previous progress from other components
    this.solverService.clearProgress();
    this.clearComponentState();

    this.initializeSudokuVisualization();
    this.initializeProgressChart();

    // Subscribe to solver progress
    this.subscriptions.add(
      this.solverService.progress$.subscribe(progress => {
        if (progress) {
          this.currentProgress.set(progress);
          this.updateProgressChart(progress);
          // Note: We don't update visualization from progress as it doesn't contain the solution
          // The solution will be updated when the solving is complete
        }
      })
    );

    // Subscribe to solver running state
    this.subscriptions.add(
      this.solverService.isRunning$.subscribe(running => {
        this.isRunning.set(running);
      })
    );
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.unsubscribe();
    // Clear progress when leaving this component
    this.solverService.clearProgress();
  }

  private clearComponentState() {
    this.currentProgress.set(null);
    this.result.set(null);
    this.progressData = [];
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
    this.clearComponentState();
    this.currentGrid = this.initialGrid.map(row => [...row]);
    this.initializeSudokuVisualization();
    this.initializeProgressChart();

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
    this.clearComponentState();
    this.currentGrid = this.initialGrid.map(row => [...row]);
    this.initializeSudokuVisualization();
    this.initializeProgressChart();
  }
}
