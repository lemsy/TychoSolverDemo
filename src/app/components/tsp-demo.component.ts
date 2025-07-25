import { Component, ElementRef, OnInit, OnDestroy, ViewChild, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';
import { SolverService, SolverProgress, SolverResult, City } from '../services/solver.service';
import { OptimizationProgressComponent } from './optimization-progress.component';

@Component({
  selector: 'app-tsp-demo',
  imports: [CommonModule, FormsModule, OptimizationProgressComponent],
  templateUrl: './tsp-demo.component.html',
  styleUrl: './tsp-demo.component.css'
})
export class TSPDemoComponent implements OnInit, OnDestroy {
  @ViewChild('tspMap', { static: true }) tspMapRef!: ElementRef;
  @ViewChild(OptimizationProgressComponent) progressComponent!: OptimizationProgressComponent;

  // Parameters
  maxIterations = 10000;
  numWorkers = 4;
  numberOfCities = 20;

  // State
  isRunning = signal(false);
  result = signal<SolverResult | null>(null);
  isProgressActive = signal(false); // New signal to control progress component

  // Data
  private cities: City[] = [];
  private currentTour: number[] = [];
  private bestTour: number[] = [];
  private initialDistance = 0;

  constructor(private solverService: SolverService) {
    // Use effect to automatically react to running state changes
    effect(() => {
      this.isRunning.set(this.solverService.isRunning$());
    });
  }

  ngOnInit() {
    this.loadSpainCities();
    this.initializeTSPVisualization();
  }

  ngOnDestroy() {
    // No longer needed since we're using effects instead of subscriptions
  }

  private clearComponentState() {
    this.result.set(null);
    this.currentTour = [];
    this.bestTour = [];
    this.initialDistance = 0;
    this.isProgressActive.set(false);
    this.progressComponent?.clearProgress();
  } loadSpainCities() {
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

  startSolving() {
    // Clear any previous progress
    this.solverService.clearProgress();
    this.clearComponentState();

    // Calculate initial distance with random tour
    const initialTour = [...Array(this.cities.length).keys()];
    this.shuffleArray(initialTour);
    this.initialDistance = this.calculateDistance(initialTour);
    this.updateTSPVisualization(initialTour);

    // Activate progress component and set initial distance
    this.isProgressActive.set(true);
    this.progressComponent?.setInitialValue(this.initialDistance);

    this.solverService.solveTSP(this.cities, {
      maxIterations: this.maxIterations,
      numWorkers: this.numWorkers
    }).then(result => {
      this.result.set(result);
      this.bestTour = result.solution;
      this.progressComponent?.setResult(result);
      this.isProgressActive.set(false); // Deactivate after completion
      // Update the visualization with the final solution
      if (result.solution) {
        this.updateTSPVisualization(result.solution);
      }
    }).catch(error => {
      console.error('Solving failed:', error);
      this.isProgressActive.set(false); // Deactivate on error
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
}
