import { Component, ElementRef, OnInit, OnDestroy, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';
import { SolverService, SolverProgress, SolverResult, City } from '../services/solver.service';

@Component({
  selector: 'app-tsp-demo',
  imports: [CommonModule, FormsModule],
  templateUrl: './tsp-demo.component.html',
  styleUrl: './tsp-demo.component.css'
})
export class TSPDemoComponent implements OnInit, OnDestroy {
  @ViewChild('tspMap', { static: true }) tspMapRef!: ElementRef;
  @ViewChild('progressChart', { static: true }) progressChartRef!: ElementRef;

  // Parameters
  maxIterations = 10000;
  numWorkers = 4;
  numberOfCities = 20;

  // State
  isRunning = signal(false);
  currentProgress = signal<SolverProgress | null>(null);
  result = signal<SolverResult | null>(null);

  // Data
  private cities: City[] = [];
  private currentTour: number[] = [];
  private bestTour: number[] = [];
  private initialDistance = 0;
  private progressData: { iteration: number; distance: number }[] = [];
  private progressChart: any;
  private subscriptions = new Subscription();

  constructor(private solverService: SolverService) { }

  ngOnInit() {
    // Clear any previous progress from other components
    this.solverService.clearProgress();
    this.clearComponentState();

    this.loadSpainCities();
    this.initializeTSPVisualization();
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
    this.currentTour = [];
    this.bestTour = [];
    this.initialDistance = 0;
  }

  loadSpainCities() {
    this.cities = this.solverService.getSpainCities(this.numberOfCities);
    this.updateTSPVisualization();
  }

  generateNewCities() {
    this.cities = this.solverService.generateRandomCities(this.numberOfCities, 700, 450);
    this.updateTSPVisualization();
  }

  updateCities() {
    // Always load Spain cities when the number changes
    // The user can use "New Random Cities" if they want random ones
    this.loadSpainCities();
  }

  private initializeTSPVisualization() {
    const container = d3.select(this.tspMapRef.nativeElement);
    container.selectAll('*').remove();

    const width = 800;
    const height = 550;

    const svg = container
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    this.updateTSPVisualization();
  }

  private updateTSPVisualization(tour?: number[]) {
    const container = d3.select(this.tspMapRef.nativeElement);
    const svg = container.select('svg');

    if (svg.empty()) return;

    svg.selectAll('*').remove();

    const width = 800;
    const height = 550;

    // Draw tour path
    if (tour && tour.length > 0) {
      const pathData = tour.map(i => this.cities[i])
        .concat([this.cities[tour[0]]]); // Close the loop

      const line = d3.line<City>()
        .x(d => d.x)
        .y(d => d.y);

      svg.append('path')
        .datum(pathData)
        .attr('d', line)
        .attr('stroke', '#007acc')
        .attr('stroke-width', 2)
        .attr('fill', 'none');
    }

    // Draw cities
    svg.selectAll('.city')
      .data(this.cities)
      .enter()
      .append('circle')
      .attr('class', 'city')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 6)
      .attr('fill', '#ff6b6b')
      .attr('stroke', '#333')
      .attr('stroke-width', 1);

    // Draw city labels
    svg.selectAll('.city-label')
      .data(this.cities)
      .enter()
      .append('text')
      .attr('class', 'city-label')
      .attr('x', d => d.x)
      .attr('y', d => d.y - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text(d => d.name);

    // Highlight start city
    if (tour && tour.length > 0) {
      svg.append('circle')
        .attr('cx', this.cities[tour[0]].x)
        .attr('cy', this.cities[tour[0]].y)
        .attr('r', 8)
        .attr('fill', 'none')
        .attr('stroke', '#28a745')
        .attr('stroke-width', 3);
    }
  }

  private initializeProgressChart() {
    const container = d3.select(this.progressChartRef.nativeElement);
    container.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
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
      .text('Distance');
  }

  private updateProgressChart(progress: SolverProgress) {
    this.progressData.push({
      iteration: progress.iteration,
      distance: -progress.bestFitness
    });

    // Keep only last 100 points for performance
    if (this.progressData.length > 100) {
      this.progressData = this.progressData.slice(-100);
    }

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 300 - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;

    const xExtent = d3.extent(this.progressData, d => d.iteration) as [number, number];
    const yExtent = d3.extent(this.progressData, d => d.distance) as [number, number];

    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([height, 0]);

    const line = d3.line<{ iteration: number; distance: number }>()
      .x(d => xScale(d.iteration))
      .y(d => yScale(d.distance))
      .curve(d3.curveMonotoneX);

    // Update axes
    this.progressChart.select('.x-axis')
      .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

    this.progressChart.select('.y-axis')
      .call(d3.axisLeft(yScale).tickFormat(d3.format('.1f')));

    // Update line
    const path = this.progressChart.selectAll('.progress-line')
      .data([this.progressData]);

    path.enter()
      .append('path')
      .attr('class', 'progress-line')
      .attr('fill', 'none')
      .attr('stroke', '#28a745')
      .attr('stroke-width', 2)
      .merge(path)
      .attr('d', line);
  }

  startSolving() {
    this.clearComponentState();

    // Calculate initial distance with random tour
    const initialTour = [...Array(this.cities.length).keys()];
    this.shuffleArray(initialTour);
    this.initialDistance = this.calculateDistance(initialTour);
    this.updateTSPVisualization(initialTour);
    this.initializeProgressChart();

    this.solverService.solveTSP(this.cities, {
      maxIterations: this.maxIterations,
      numWorkers: this.numWorkers
    }).then(result => {
      this.result.set(result);
      this.bestTour = result.solution;
      // Update the visualization with the final solution
      if (result.solution) {
        this.updateTSPVisualization(result.solution);
      }
    }).catch(error => {
      console.error('Solving failed:', error);
    });
  }

  private calculateDistance(tour: number[]): number {
    let distance = 0;
    for (let i = 0; i < tour.length; i++) {
      const current = this.cities[tour[i]];
      const next = this.cities[tour[(i + 1) % tour.length]];
      distance += Math.sqrt(
        Math.pow(current.x - next.x, 2) + Math.pow(current.y - next.y, 2)
      );
    }
    return distance;
  }

  private shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  getImprovementPercentage(): number {
    const progress = this.currentProgress();
    if (!progress || this.initialDistance === 0) return 0;

    const currentDistance = -progress.bestFitness;
    return ((this.initialDistance - currentDistance) / this.initialDistance) * 100;
  }

  getFinalImprovementPercentage(): number {
    const result = this.result();
    if (!result || this.initialDistance === 0) return 0;

    const finalDistance = -result.fitness;
    return ((this.initialDistance - finalDistance) / this.initialDistance) * 100;
  }
}
