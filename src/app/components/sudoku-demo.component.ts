import { Component, ElementRef, OnInit, OnDestroy, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';
import { SolverService, SolverProgress, SolverResult } from '../services/solver.service';
import { OptimizationProgressComponent } from './optimization-progress.component';

@Component({
  selector: 'app-sudoku-demo',
  imports: [CommonModule, FormsModule, OptimizationProgressComponent],
  templateUrl: './sudoku-demo.component.html',
  styleUrl: './sudoku-demo.component.css'
})
export class SudokuDemoComponent implements OnInit, OnDestroy {
  @ViewChild('sudokuGrid', { static: true }) sudokuGridRef!: ElementRef;
  @ViewChild(OptimizationProgressComponent) progressComponent!: OptimizationProgressComponent;

  // Parameters
  populationSize = 50;
  maxIterations = 1000;
  mutationRate = 0.1;

  // State
  isRunning = signal(false);
  result = signal<SolverResult | null>(null);

  // Data
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
    this.result.set(null);
    this.progressComponent?.clearProgress();
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

  startSolving() {
    this.clearComponentState();
    this.currentGrid = this.initialGrid.map(row => [...row]);
    this.initializeSudokuVisualization();

    this.solverService.solveSudoku(this.initialGrid, {
      populationSize: this.populationSize,
      maxIterations: this.maxIterations,
      mutationRate: this.mutationRate
    }).then(result => {
      this.result.set(result);
      this.progressComponent?.setResult(result);
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
  }
}
