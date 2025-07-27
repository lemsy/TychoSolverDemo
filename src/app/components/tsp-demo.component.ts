import { Component, ElementRef, OnInit, OnDestroy, ViewChild, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import * as d3 from 'd3';
import { SolverService, SolverProgress, SolverResult, City } from '../services/solver.service';
import { OptimizationProgressComponent } from './optimization-progress.component';
import { TSPMapComponent } from './tsp-map.component';

@Component({
  selector: 'app-tsp-demo',
  imports: [CommonModule, FormsModule, OptimizationProgressComponent, TSPMapComponent],
  templateUrl: './tsp-demo.component.html',
  styleUrl: './tsp-demo.component.css'
})
export class TSPDemoComponent implements OnInit, OnDestroy {
  public showLabels = false;
  // @ViewChild('tspMap', { static: true }) tspMapRef!: ElementRef;
  @ViewChild(OptimizationProgressComponent) progressComponent!: OptimizationProgressComponent;

  // Parameters
  maxIterations = 10000;
  numWorkers = 4;
  numberOfCities = 20;

  // State
  isRunning = signal(false);
  result = signal<SolverResult | null>(null);

  // Data
  private cities: City[] = [];
  public get bestTour(): number[] {
    return this.result()?.solution ?? [];
  }
  private initialDistance = 0;

  constructor(private solverService: SolverService) {
    // Use effect to automatically react to running state changes for TSP
    effect(() => {
      this.isRunning.set(this.solverService.getIsRunning('tsp')());
    });
  }

  ngOnInit() {
    this.loadSpainCities();
    // this.initializeTSPVisualization();
  }

  ngOnDestroy() {
    // No longer needed since we're using effects instead of subscriptions
  }

  private clearComponentState() {
    this.result.set(null);
    this.initialDistance = 0;
    this.progressComponent?.clearProgress();
  }

  loadSpainCities() {
    this.cities = this.solverService.getSpainCities(this.numberOfCities);
    this.result.set(null); // Reset result so map clears tour
    this.progressComponent?.clearProgress(); // Also clear progress chart
    this.showLabels = false;
  }



  updateCities() {
    // Only update cities if the number of cities actually changed
    if (this.cities.length !== this.numberOfCities) {
      this.loadSpainCities();
    }
  }

  // Leaflet expects {name, lat, lng}
  get leafletCities() {
    return this.cities.map(city => {
      // Prefer lat/lon if present, else fallback to y/x (for random cities)
      const lat = typeof (city as any).lat === 'number' ? (city as any).lat : city.y;
      const lng = typeof (city as any).lon === 'number' ? (city as any).lon : city.x;
      return {
        name: city.name,
        lat,
        lng
      };
    });
  }

  startSolving() {
    // Ensure progressType is set to 'tsp' before starting
    if (this.progressComponent) {
      this.progressComponent.progressType = 'tsp';
    } else {
      alert('Progress component is not initialized! The chart may not update correctly.');
    }
    this.solverService.clearProgress('tsp');
    this.clearComponentState();

    // Calculate initial distance with random tour
    const initialTour = [...Array(this.cities.length).keys()];
    this.shuffleArray(initialTour);
    this.calculateDistance(initialTour).then(dist => {
      this.initialDistance = dist;
      this.progressComponent?.setInitialValue(this.initialDistance);
    });
    // this.updateTSPVisualization(initialTour);

    // Set initial distance for improvement calculations
    this.progressComponent?.setInitialValue(this.initialDistance);

    this.solverService.solveTSP(this.cities, {
      maxIterations: this.maxIterations,
      numWorkers: this.numWorkers
    }).then(result => {
      this.result.set(result);
      this.progressComponent?.setResult(result);
      // Update the visualization with the final solution
      // if (result.solution) {
      //   this.updateTSPVisualization(result.solution);
      // }
    }).catch(error => {
      console.error('Solving failed:', error);
    });
  }

  // Calculates total tour distance using real driving distances if available
  private async calculateDistance(tour: number[]): Promise<number> {
    let distance = 0;
    for (let i = 0; i < tour.length; i++) {
      const current = this.cities[tour[i]];
      const next = this.cities[tour[(i + 1) % tour.length]];
      distance += await new Promise<number>(resolve => {
        this.solverService.getDistance(current, next).subscribe(resolve);
      });
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
