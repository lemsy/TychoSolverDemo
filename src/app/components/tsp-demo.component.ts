import { Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';
import { SolverService, SolverProgress, SolverResult } from '../services/solver.service';

interface City {
    name: string;
    x: number;
    y: number;
}

@Component({
    selector: 'app-tsp-demo',
    imports: [CommonModule, FormsModule],
    template: `
    <div class="tsp-demo">
      <h2>Traveling Salesman Problem (TSP) Demo</h2>
      <p>Watch as simulated annealing finds the shortest route through Spanish cities!</p>
      
      <div class="demo-container">
        <!-- Controls -->
        <div class="controls">
          <div class="parameter-group">
            <label>Max Iterations:</label>
            <input type="number" [(ngModel)]="maxIterations" [disabled]="isRunning()" min="1000" max="50000" step="1000">
          </div>
          
          <div class="parameter-group">
            <label>Initial Temperature:</label>
            <input type="number" [(ngModel)]="initialTemperature" [disabled]="isRunning()" min="10" max="1000" step="10">
          </div>
          
          <div class="parameter-group">
            <label>Number of Cities:</label>
            <select [(ngModel)]="numberOfCities" [disabled]="isRunning()" (change)="updateCities()">
              <option value="10">10 Cities</option>
              <option value="20">20 Cities</option>
              <option value="30">30 Cities</option>
              <option value="40">40 Cities</option>
            </select>
          </div>
          
          <div class="button-group">
            <button (click)="startSolving()" [disabled]="isRunning()" class="btn-primary">
              {{isRunning() ? 'Optimizing...' : 'Start Optimization'}}
            </button>
            
            <button (click)="generateNewCities()" [disabled]="isRunning()" class="btn-secondary">
              New Random Cities
            </button>
            
            <button (click)="loadSpainCities()" [disabled]="isRunning()" class="btn-secondary">
              Load Spain Cities
            </button>
          </div>
        </div>

        <!-- TSP Visualization -->
        <div class="tsp-container">
          <div class="tsp-map" #tspMap></div>
        </div>

        <!-- Progress Chart -->
        <div class="progress-container">
          <h3>Optimization Progress</h3>
          <div class="chart" #progressChart></div>
          
          @if (currentProgress()) {
            <div class="progress-info">
              <div class="progress-item">
                <span class="label">Iteration:</span>
                <span class="value">{{currentProgress()?.iteration}}</span>
              </div>
              <div class="progress-item">
                <span class="label">Current Distance:</span>
                <span class="value">{{(-currentProgress()?.currentFitness || 0).toFixed(1)}}</span>
              </div>
              <div class="progress-item">
                <span class="label">Best Distance:</span>
                <span class="value">{{(-currentProgress()?.bestFitness || 0).toFixed(1)}}</span>
              </div>
              <div class="progress-item">
                <span class="label">Improvement:</span>
                <span class="value">{{getImprovementPercentage().toFixed(1)}}%</span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Results -->
      @if (result()) {
        <div class="results">
          <h3>Optimization Complete!</h3>
          <div class="result-stats">
            <div class="stat">
              <span class="label">Final Distance:</span>
              <span class="value">{{(-result()?.fitness || 0).toFixed(1)}}</span>
            </div>
            <div class="stat">
              <span class="label">Iterations:</span>
              <span class="value">{{result()?.iteration}}</span>
            </div>
            <div class="stat">
              <span class="label">Execution Time:</span>
              <span class="value">{{result()?.executionTime}}ms</span>
            </div>
            <div class="stat">
              <span class="label">Improvement:</span>
              <span class="value">{{getFinalImprovementPercentage().toFixed(1)}}%</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    .tsp-demo {
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

    .parameter-group input,
    .parameter-group select {
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
      background: #28a745;
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

    .tsp-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .tsp-map {
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #f9f9f9;
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
      color: #28a745;
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
export class TSPDemoComponent implements OnInit {
    @ViewChild('tspMap', { static: true }) tspMapRef!: ElementRef;
    @ViewChild('progressChart', { static: true }) progressChartRef!: ElementRef;

    // Parameters
    maxIterations = 10000;
    initialTemperature = 100;
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

    // Spain cities data
    private spainCities = [
        { name: "Madrid", x: 400, y: 300 },
        { name: "Barcelona", x: 650, y: 200 },
        { name: "Valencia", x: 550, y: 350 },
        { name: "Sevilla", x: 250, y: 450 },
        { name: "Zaragoza", x: 500, y: 250 },
        { name: "Málaga", x: 300, y: 500 },
        { name: "Murcia", x: 550, y: 420 },
        { name: "Bilbao", x: 450, y: 150 },
        { name: "Alicante", x: 550, y: 400 },
        { name: "Córdoba", x: 300, y: 420 },
        { name: "Valladolid", x: 350, y: 250 },
        { name: "Vigo", x: 200, y: 200 },
        { name: "Gijón", x: 350, y: 150 },
        { name: "Granada", x: 350, y: 470 },
        { name: "Vitoria", x: 450, y: 180 },
        { name: "Pamplona", x: 500, y: 180 },
        { name: "Santander", x: 400, y: 150 },
        { name: "Burgos", x: 400, y: 220 },
        { name: "Salamanca", x: 300, y: 250 },
        { name: "A Coruña", x: 150, y: 180 }
    ];

    constructor(private solverService: SolverService) { }

    ngOnInit() {
        this.loadSpainCities();
        this.initializeTSPVisualization();
        this.initializeProgressChart();

        // Subscribe to solver progress
        this.solverService.progress$.subscribe(progress => {
            if (progress) {
                this.currentProgress.set(progress);
                this.updateProgressChart(progress);
                this.updateTSPVisualization(progress.solution);
            }
        });

        // Subscribe to solver running state
        this.solverService.isRunning$.subscribe(running => {
            this.isRunning.set(running);
        });
    }

    loadSpainCities() {
        this.cities = this.spainCities.slice(0, this.numberOfCities);
        this.updateTSPVisualization();
    }

    generateNewCities() {
        this.cities = [];
        for (let i = 0; i < this.numberOfCities; i++) {
            this.cities.push({
                name: `City ${i + 1}`,
                x: Math.random() * 700 + 50,
                y: Math.random() * 450 + 50
            });
        }
        this.updateTSPVisualization();
    }

    updateCities() {
        if (this.cities.length === this.spainCities.length) {
            this.loadSpainCities();
        } else {
            this.generateNewCities();
        }
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
        this.result.set(null);
        this.progressData = [];

        // Calculate initial distance with random tour
        const initialTour = [...Array(this.cities.length).keys()];
        this.shuffleArray(initialTour);
        this.initialDistance = this.calculateDistance(initialTour);
        this.updateTSPVisualization(initialTour);

        this.solverService.solveTSP(this.cities, {
            maxIterations: this.maxIterations,
            temperature: this.initialTemperature
        }).then(result => {
            this.result.set(result);
            this.bestTour = result.solution;
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
