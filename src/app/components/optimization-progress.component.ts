import { Component, ElementRef, Input, OnInit, OnDestroy, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';
import { SolverService, SolverProgress, SolverResult } from '../services/solver.service';

export type ProgressType = 'sudoku' | 'tsp';

@Component({
    selector: 'app-optimization-progress',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="progress-container">
      <div class="progress-info">
        <h3>Optimization Progress</h3>
        
        @if (currentProgress(); as progress) {
          <div class="progress-stats">
            <div class="stat">
              <label>Iteration:</label>
              <span>{{ progress.iteration }}</span>
            </div>
            <div class="stat">
              <label>{{ progressType === 'sudoku' ? 'Fitness' : 'Best Distance' }}:</label>
              <span>{{ getDisplayValue(progress.bestFitness) }}</span>
            </div>
            @if (progressType === 'tsp' && improvement() > 0) {
              <div class="stat improvement">
                <label>Improvement:</label>
                <span>{{ improvement().toFixed(1) }}%</span>
              </div>
            }
          </div>
        }
        
        @if (result(); as res) {
          <div class="final-results">
            <h4>Final Results</h4>
            <div class="stat">
              <label>Execution Time:</label>
              <span>{{ res.executionTime.toFixed(0) }}ms</span>
            </div>
            <div class="stat">
              <label>Total Iterations:</label>
              <span>{{ res.iterations }}</span>
            </div>
            <div class="stat">
              <label>Final {{ progressType === 'sudoku' ? 'Fitness' : 'Distance' }}:</label>
              <span>{{ getDisplayValue(res.fitness) }}</span>
            </div>
            @if (progressType === 'tsp' && finalImprovement() > 0) {
              <div class="stat improvement">
                <label>Total Improvement:</label>
                <span>{{ finalImprovement().toFixed(1) }}%</span>
              </div>
            }
          </div>
        }
      </div>
      
      <div class="chart-container">
        <div #progressChart class="progress-chart"></div>
      </div>
    </div>
  `,
    styles: [`
    .progress-container {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .progress-info h3 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 18px;
    }

    .progress-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat {
      display: flex;
      flex-direction: column;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .stat.improvement {
      background: #d4edda;
      color: #155724;
    }

    .stat label {
      font-size: 12px;
      font-weight: 600;
      color: #666;
      margin-bottom: 4px;
    }

    .stat span {
      font-size: 16px;
      font-weight: 700;
      color: #333;
    }

    .improvement span {
      color: #155724;
    }

    .final-results {
      border-top: 1px solid #eee;
      padding-top: 16px;
      margin-top: 16px;
    }

    .final-results h4 {
      margin: 0 0 12px 0;
      color: #28a745;
      font-size: 16px;
    }

    .chart-container {
      margin-top: 16px;
    }

    .progress-chart {
      width: 100%;
      height: 200px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
  `]
})
export class OptimizationProgressComponent implements OnInit, OnDestroy {
    @ViewChild('progressChart', { static: true }) progressChartRef!: ElementRef;
    @Input() progressType: ProgressType = 'sudoku';
    @Input() initialValue?: number; // For TSP initial distance

    // State signals
    currentProgress = signal<SolverProgress | null>(null);
    result = signal<SolverResult | null>(null);
    improvement = signal<number>(0);
    finalImprovement = signal<number>(0);

    // Internal data
    private progressData: { iteration: number; value: number }[] = [];
    private progressChart: any;
    private subscriptions = new Subscription();

    constructor(private solverService: SolverService) { }

    ngOnInit() {
        this.initializeChart();
        this.subscribeToProgress();
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    /**
     * Clears all progress data and resets the chart
     */
    clearProgress() {
        this.currentProgress.set(null);
        this.result.set(null);
        this.improvement.set(0);
        this.finalImprovement.set(0);
        this.progressData = [];
        this.initializeChart();
    }

    /**
     * Sets the initial value for improvement calculations (TSP only)
     */
    setInitialValue(value: number) {
        this.initialValue = value;
    }

    private subscribeToProgress() {
        // Subscribe to progress updates
        this.subscriptions.add(
            this.solverService.progress$.subscribe(progress => {
                if (progress) {
                    this.currentProgress.set(progress);
                    this.updateChart(progress);
                    this.calculateImprovement(progress);
                }
            })
        );

        // Clear progress when solver service clears it
        this.subscriptions.add(
            this.solverService.progress$.subscribe(progress => {
                if (progress === null) {
                    this.clearProgress();
                }
            })
        );
    }

    private calculateImprovement(progress: SolverProgress) {
        if (this.progressType === 'tsp' && this.initialValue) {
            const currentValue = -progress.bestFitness; // TSP fitness is negative distance
            const improvementPercent = ((this.initialValue - currentValue) / this.initialValue) * 100;
            this.improvement.set(Math.max(0, improvementPercent));
        }
    }

    private updateChart(progress: SolverProgress) {
        const value = this.progressType === 'sudoku' ?
            progress.bestFitness :
            -progress.bestFitness; // Convert negative fitness back to positive distance for TSP

        this.progressData.push({
            iteration: progress.iteration,
            value: value
        });

        // Keep only last 100 points for performance
        if (this.progressData.length > 100) {
            this.progressData = this.progressData.slice(-100);
        }

        this.renderChart();
    }

    private initializeChart() {
        const container = d3.select(this.progressChartRef.nativeElement);
        container.selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = 320 - margin.left - margin.right;
        const height = 200 - margin.top - margin.bottom;

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
            .text(this.progressType === 'sudoku' ? 'Fitness' : 'Distance');
    }

    private renderChart() {
        if (this.progressData.length === 0) return;

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = 320 - margin.left - margin.right;
        const height = 200 - margin.top - margin.bottom;

        const xExtent = d3.extent(this.progressData, d => d.iteration) as [number, number];
        const yExtent = d3.extent(this.progressData, d => d.value) as [number, number];

        // For Sudoku, use fixed scale for better visualization
        const yDomain = this.progressType === 'sudoku' ?
            [0, 243] : // Sudoku max fitness is around 243
            yExtent;

        const xScale = d3.scaleLinear()
            .domain(xExtent)
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(yDomain)
            .range([height, 0]);

        const line = d3.line<{ iteration: number; value: number }>()
            .x(d => xScale(d.iteration))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);

        // Update axes
        this.progressChart.select('.x-axis')
            .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

        this.progressChart.select('.y-axis')
            .call(d3.axisLeft(yScale).tickFormat(d3.format(this.progressType === 'tsp' ? '.1f' : 'd')));

        // Update line
        const path = this.progressChart.selectAll('.progress-line')
            .data([this.progressData]);

        const color = this.progressType === 'sudoku' ? '#007acc' : '#28a745';

        path.enter()
            .append('path')
            .attr('class', 'progress-line')
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 2)
            .merge(path)
            .attr('d', line);
    }

    getDisplayValue(fitness: number): string {
        if (this.progressType === 'sudoku') {
            return fitness.toString();
        } else {
            // For TSP, convert negative fitness back to positive distance
            return (-fitness).toFixed(1);
        }
    }

    /**
     * Sets the final result and calculates final improvement
     */
    setResult(result: SolverResult) {
        this.result.set(result);

        if (this.progressType === 'tsp' && this.initialValue) {
            const finalValue = -result.fitness;
            const improvementPercent = ((this.initialValue - finalValue) / this.initialValue) * 100;
            this.finalImprovement.set(Math.max(0, improvementPercent));
        }
    }
}
