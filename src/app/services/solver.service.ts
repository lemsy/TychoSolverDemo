import { Injectable, signal, inject } from '@angular/core';
import { RouteDistanceService } from './route-distance.service';
import { of } from 'rxjs';

// Import Tycho solver components
import {
    LocalSearch,
    ParallelLocalSearch,
} from 'tycho-solver';

export interface SolverProgress {
    iteration: number;
    fitness: number;
}

export interface SolverResult {
    solution: any;
    fitness: number;
    iterations: number;
    executionTime: number;
}

export interface City {
    name: string;
    x: number;
    y: number;
    lat?: number;
    lon?: number;
}

export interface SudokuGrid extends Array<Array<number>> { }

@Injectable({
    providedIn: 'root'
})
export class SolverService {
    private routeDistanceService = inject(RouteDistanceService);
    // Sudoku progress tracking
    private sudokuProgressSignal = signal<SolverProgress | null>(null);
    private sudokuProgressHistorySignal = signal<SolverProgress[]>([]);
    private sudokuIsRunningSignal = signal<boolean>(false);

    // TSP progress tracking
    private tspProgressSignal = signal<SolverProgress | null>(null);
    private tspProgressHistorySignal = signal<SolverProgress[]>([]);
    private tspIsRunningSignal = signal<boolean>(false);

    // Public readonly accessors for progress by type
    public getProgress(type: 'sudoku' | 'tsp') {
        return type === 'sudoku' ? this.sudokuProgressSignal.asReadonly() : this.tspProgressSignal.asReadonly();
    }

    public getProgressHistory(type: 'sudoku' | 'tsp') {
        return type === 'sudoku' ? this.sudokuProgressHistorySignal.asReadonly() : this.tspProgressHistorySignal.asReadonly();
    }

    public getIsRunning(type: 'sudoku' | 'tsp') {
        return type === 'sudoku' ? this.sudokuIsRunningSignal.asReadonly() : this.tspIsRunningSignal.asReadonly();
    }

    // Legacy getters for backward compatibility (will be removed)
    public progress = this.sudokuProgressSignal.asReadonly();
    public progressHistory = this.sudokuProgressHistorySignal.asReadonly();
    public isRunning$ = this.sudokuIsRunningSignal.asReadonly();

    // Sudoku constants
    private readonly SUDOKU_SIZE = 9;
    private readonly SUDOKU_SUBGRID = 3;

    // Default Sudoku puzzle (0 = empty cell)
    private readonly DEFAULT_SUDOKU: SudokuGrid = [
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

    // Spain cities data for TSP
    private readonly SPAIN_CITIES_DATA = [
        ["Madrid", 40.4168, -3.7038],
        ["Barcelona", 41.3874, 2.1686],
        ["Valencia", 39.4699, -0.3763],
        ["Sevilla", 37.3886, -5.9823],
        ["Zaragoza", 41.6488, -0.8891],
        ["Málaga", 36.7213, -4.4214],
        ["Murcia", 37.9847, -1.1285],
        ["Bilbao", 43.2630, -2.9350],
        ["Alicante", 38.3452, -0.4810],
        ["Córdoba", 37.8882, -4.7794],
        ["Valladolid", 41.6523, -4.7245],
        ["Vigo", 42.2406, -8.7207],
        ["Gijón", 43.5322, -5.6611],
        ["A Coruña", 43.3623, -8.4115],
        ["Vitoria-Gasteiz", 42.8467, -2.6727],
        ["Granada", 37.1773, -3.5986],
        ["Elche", 38.2699, -0.7126],
        ["Oviedo", 43.3619, -5.8494],
        ["Cartagena", 37.6257, -0.9966],
        ["Jerez", 36.6850, -6.1261],
        ["Pamplona", 42.8125, -1.6458],
        ["Almería", 36.8340, -2.4637],
        ["Santander", 43.4623, -3.8099],
        ["Castellón", 39.9864, -0.0513],
        ["Logroño", 42.4627, -2.4449],
        ["Badajoz", 38.8794, -6.9707],
        ["Salamanca", 40.9701, -5.6635],
        ["Huelva", 37.2614, -6.9447],
        ["Marbella", 36.5101, -4.8825],
        ["Lleida", 41.6176, 0.6200],
        ["Tarragona", 41.1189, 1.2445],
        ["León", 42.5987, -5.5671],
        ["Cádiz", 36.5271, -6.2886],
        ["Jaén", 37.7796, -3.7849],
        ["Ourense", 42.3367, -7.8641],
        ["Santiago de Compostela", 42.8782, -8.5448],
        ["Toledo", 39.8628, -4.0273],
        ["Girona", 41.9794, 2.8214],
        ["Cáceres", 39.4765, -6.3723],
        ["Ciudad Real", 38.9861, -3.9272]
    ];

    constructor() { }

    // SUDOKU METHODS


    /**
     * Solves a Sudoku puzzle using Local Search (default method)
     */
    async solveSudoku(
        initialGrid?: SudokuGrid,
        options: {
            populationSize?: number;
            maxIterations?: number;
            mutationRate?: number;
            crossoverRate?: number;
        } = {}
    ): Promise<SolverResult> {
        const startTime = performance.now();
        this.sudokuIsRunningSignal.set(true);

        const grid = initialGrid || this.copyGrid(this.DEFAULT_SUDOKU);
        const {
            populationSize = 100,
            maxIterations = 100,
            mutationRate = 0.2,
            crossoverRate = 0.7
        } = options;

        try {
            // For this simple implementation, let's use a basic local search approach
            const localSearch = new LocalSearch<SudokuGrid>();

            const initialSolution = this.createSudokuIndividual(grid);
            let bestFitnessFound = this.sudokuFitness(initialSolution);

            // Report initial progress
            const initialProgress = {
                iteration: 0,
                fitness: bestFitnessFound
            };
            this.sudokuProgressSignal.set(initialProgress);
            this.sudokuProgressHistorySignal.update((history: SolverProgress[]) => [...history, initialProgress]);

            const result = await localSearch.search(
                initialSolution,
                (solution: SudokuGrid) => this.sudokuFitness(solution),
                (solution: SudokuGrid) => this.sudokuNeighborhood(solution, grid),
                {
                    maxIterations,
                    maximize: true,
                    onClimb: async (solution, fitness, iter) => {
                        // Update best fitness if we found a better one
                        if (fitness > bestFitnessFound) {
                            bestFitnessFound = fitness;
                        }

                        const progressUpdate = {
                            iteration: iter,
                            fitness: bestFitnessFound
                        };
                        this.sudokuProgressSignal.set(progressUpdate);
                        this.sudokuProgressHistorySignal.update((history: SolverProgress[]) => [...history, progressUpdate]);
                    }
                }
            );

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            const solverResult: SolverResult = {
                solution: result.solution,
                fitness: result.fitness,
                iterations: result.iterations,
                executionTime
            };

            const finalProgress = {
                iteration: result.iterations,
                fitness: Math.max(bestFitnessFound, result.fitness)
            };
            this.sudokuProgressSignal.set(finalProgress);
            this.sudokuProgressHistorySignal.update((history: SolverProgress[]) => {
                // Update the last entry or add a new one if needed
                const lastEntry = history[history.length - 1];
                if (lastEntry && lastEntry.iteration === result.iterations) {
                    return [...history.slice(0, -1), finalProgress];
                } else {
                    return [...history, finalProgress];
                }
            });

            return solverResult;
        } finally {
            this.sudokuIsRunningSignal.set(false);
        }
    }

    /**
     * Creates a valid Sudoku individual by filling empty cells randomly
     */
    private createSudokuIndividual(initialGrid: SudokuGrid): SudokuGrid {
        const grid = this.copyGrid(initialGrid);
        for (let i = 0; i < this.SUDOKU_SIZE; i++) {
            for (let j = 0; j < this.SUDOKU_SIZE; j++) {
                if (grid[i][j] === 0) {
                    grid[i][j] = Math.floor(Math.random() * this.SUDOKU_SIZE) + 1;
                }
            }
        }
        return grid;
    }

    /**
     * Calculates Sudoku fitness (higher is better)
     */
    private sudokuFitness(grid: SudokuGrid): number {
        let score = 0;

        // Check rows
        for (let i = 0; i < this.SUDOKU_SIZE; i++) {
            const seen = new Set();
            for (let j = 0; j < this.SUDOKU_SIZE; j++) {
                seen.add(grid[i][j]);
            }
            score += seen.size;
        }

        // Check columns
        for (let j = 0; j < this.SUDOKU_SIZE; j++) {
            const seen = new Set();
            for (let i = 0; i < this.SUDOKU_SIZE; i++) {
                seen.add(grid[i][j]);
            }
            score += seen.size;
        }

        // Check subgrids
        for (let bi = 0; bi < this.SUDOKU_SIZE; bi += this.SUDOKU_SUBGRID) {
            for (let bj = 0; bj < this.SUDOKU_SIZE; bj += this.SUDOKU_SUBGRID) {
                const seen = new Set();
                for (let i = 0; i < this.SUDOKU_SUBGRID; i++) {
                    for (let j = 0; j < this.SUDOKU_SUBGRID; j++) {
                        seen.add(grid[bi + i][bj + j]);
                    }
                }
                score += seen.size;
            }
        }

        return score;
    }

    /**
     * Generates neighborhood solutions for local search
     */
    private sudokuNeighborhood(grid: SudokuGrid, initialGrid: SudokuGrid): SudokuGrid[] {
        const neighbors: SudokuGrid[] = [];

        for (let i = 0; i < this.SUDOKU_SIZE; i++) {
            for (let j = 0; j < this.SUDOKU_SIZE; j++) {
                if (initialGrid[i][j] === 0) { // Only change non-clue cells
                    for (let v = 1; v <= this.SUDOKU_SIZE; v++) {
                        if (grid[i][j] !== v) {
                            const neighbor = this.copyGrid(grid);
                            neighbor[i][j] = v;
                            neighbors.push(neighbor);
                        }
                    }
                }
            }
        }

        return neighbors;
    }

    /**
     * Gets the default Sudoku puzzle
     */
    getDefaultSudoku(): SudokuGrid {
        return this.copyGrid(this.DEFAULT_SUDOKU);
    }

    /**
     * Validates if a Sudoku grid is completely solved
     */
    isSudokuSolved(grid: SudokuGrid): boolean {
        return this.sudokuFitness(grid) === this.SUDOKU_SIZE * 3;
    }

    // TSP METHODS

    /**
     * Solves TSP using Parallel Local Search
     */
    async solveTSP(
        cities: City[],
        options: {
            maxIterations?: number;
            numWorkers?: number;
        } = {}
    ): Promise<SolverResult> {
        const startTime = performance.now();
        this.tspIsRunningSignal.set(true);

        const {
            maxIterations = 10000,
            numWorkers = 4
        } = options;

        try {
            // Create multiple initial solutions for parallel search
            const initialSolutions: number[][] = [];
            for (let i = 0; i < numWorkers; i++) {
                initialSolutions.push([...Array(cities.length).keys()].sort(() => Math.random() - 0.5));
            }

            // Setup Parallel Local Search
            const parallelLocalSearch = new ParallelLocalSearch<number[]>();

            let iteration = 0;
            // Use async real driving distance for initial fitness
            let bestFitness = await this.calculateTourDistanceAsync(initialSolutions[0], cities);

            // Report initial progress
            const initialProgress = {
                iteration: 0,
                fitness: bestFitness
            };
            this.tspProgressSignal.set(initialProgress);
            this.tspProgressHistorySignal.update((history: SolverProgress[]) => [...history, initialProgress]);

            const results = await parallelLocalSearch.search(
                initialSolutions,
                (tour: number[]) => this.calculateTourDistanceAsync(tour, cities), // Minimize real driving distance
                (tour: number[]) => this.tspNeighborhood(tour),
                {
                    maxIterations,
                    maximize: false, // Minimize distance
                    onClimb: async (solution, fitness, iter) => {
                        iteration = iter;
                        const progressUpdate = {
                            iteration,
                            fitness: fitness // Already positive distance
                        };
                        this.tspProgressSignal.set(progressUpdate);
                        this.tspProgressHistorySignal.update((history: SolverProgress[]) => [...history, progressUpdate]);
                    }
                }
            );

            // Find the best result from all parallel searches
            const bestResult = results.reduce((best, current) =>
                current.fitness < best.fitness ? current : best
            );

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            const solverResult: SolverResult = {
                solution: bestResult.solution,
                fitness: bestResult.fitness, // Already positive distance
                iterations: bestResult.iterations,
                executionTime
            };

            const finalProgress = {
                iteration: bestResult.iterations,
                fitness: bestResult.fitness
            };
            this.tspProgressSignal.set(finalProgress);
            this.tspProgressHistorySignal.update((history: SolverProgress[]) => {
                // Update the last entry or add a new one if needed
                const lastEntry = history[history.length - 1];
                if (lastEntry && lastEntry.iteration === bestResult.iterations) {
                    return [...history.slice(0, -1), finalProgress];
                } else {
                    return [...history, finalProgress];
                }
            });

            return solverResult;
        } finally {
            this.tspIsRunningSignal.set(false);
        }
    }

    /**
     * Creates a TSP instance from cities
     */
    private createTSPInstance(cities: City[]) {
        return {
            cities,
            evaluate: (tour: number[]) => this.calculateTourDistance(tour, cities)
        };
    }

    /**
     * Calculates total distance of a tour
     */

    /**
     * Calculates total distance of a tour (async, uses real driving distance if available)
     */
    public async calculateTourDistanceAsync(tour: number[], cities: City[]): Promise<number> {
        let totalDistance = 0;
        for (let i = 0; i < tour.length; i++) {
            const from = cities[tour[i]];
            const to = cities[tour[(i + 1) % tour.length]];
            totalDistance += await this.getDistance(from, to);
        }
        return totalDistance;
    }

    /**
     * Calculates total distance of a tour (Euclidean, sync, fallback)
     */
    private calculateTourDistance(tour: number[], cities: City[]): number {
        let totalDistance = 0;
        for (let i = 0; i < tour.length; i++) {
            const from = cities[tour[i]];
            const to = cities[tour[(i + 1) % tour.length]];
            const dx = from.x - to.x;
            const dy = from.y - to.y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
        }
        return totalDistance;
    }

    /**
     * Calculates Euclidean distance between two cities
     */
    /**
     * Calculates real driving distance between two cities if lat/lon available, else Euclidean
     * Returns an Observable<number> (meters)
     */
    public async getDistance(city1: City, city2: City): Promise<number> {
        if (city1.lat != null && city1.lon != null && city2.lat != null && city2.lon != null) {
            const result = await this.routeDistanceService.getDrivingDistance(
                { lat: city1.lat, lon: city1.lon },
                { lat: city2.lat, lon: city2.lon }
            ).toPromise();
            return result ?? 0;
        }
        // Fallback to Euclidean
        const dx = city1.x - city2.x;
        const dy = city1.y - city2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Generates neighborhood solutions using 2-opt
     */
    private tspNeighborhood(tour: number[]): number[][] {
        const neighbors: number[][] = [];
        const n = tour.length;

        // Generate some 2-opt neighbors (limited for performance)
        const maxNeighbors = Math.min(20, n * (n - 1) / 2);
        const attempts = Math.min(100, maxNeighbors * 2);

        for (let attempt = 0; attempt < attempts && neighbors.length < maxNeighbors; attempt++) {
            const i = Math.floor(Math.random() * n);
            const j = Math.floor(Math.random() * n);

            if (i !== j) {
                const neighbor = this.twoOptSwap(tour, Math.min(i, j), Math.max(i, j));
                neighbors.push(neighbor);
            }
        }

        return neighbors;
    }

    /**
     * Performs 2-opt swap on a tour
     */
    private twoOptSwap(tour: number[], i: number, j: number): number[] {
        const newTour = [...tour];
        // Reverse the segment between i and j
        while (i < j) {
            [newTour[i], newTour[j]] = [newTour[j], newTour[i]];
            i++;
            j--;
        }
        return newTour;
    }

    /**
     * Generates random cities
     */
    generateRandomCities(count: number, width: number = 800, height: number = 600): City[] {
        const cities: City[] = [];
        for (let i = 0; i < count; i++) {
            cities.push({
                name: `City ${i + 1}`,
                x: Math.random() * width,
                y: Math.random() * height
            });
        }
        return cities;
    }

    /**
     * Gets Spanish cities data
     */
    getSpainCities(count?: number): City[] {
        const citiesToUse = count ? this.SPAIN_CITIES_DATA.slice(0, count) : this.SPAIN_CITIES_DATA;

        return citiesToUse.map(([name, lat, lon]) => ({
            name: name as string,
            x: this.lonToX(lon as number),
            y: this.latToY(lat as number),
            lat: lat as number,
            lon: lon as number
        }));
    }

    /**
     * Converts longitude to X coordinate (simple projection)
     */
    private lonToX(lon: number): number {
        // Spain longitude range: approximately -9.3 to 4.3
        const minLon = -9.3;
        const maxLon = 4.3;
        const width = 800;
        return ((lon - minLon) / (maxLon - minLon)) * width;
    }

    /**
     * Converts latitude to Y coordinate (simple projection)
     */
    private latToY(lat: number): number {
        // Spain latitude range: approximately 35.2 to 43.8
        const minLat = 35.2;
        const maxLat = 43.8;
        const height = 600;
        return height - ((lat - minLat) / (maxLat - minLat)) * height; // Invert Y axis
    }

    // UTILITY METHODS

    /**
     * Deep copies a 2D grid
     */
    private copyGrid(grid: SudokuGrid): SudokuGrid {
        return grid.map(row => [...row]);
    }

    /**
     * Clears progress for a specific solver type
     */
    clearProgress(type: 'sudoku' | 'tsp'): void {
        if (type === 'sudoku') {
            this.sudokuProgressSignal.set(null);
            this.sudokuProgressHistorySignal.set([]);
            this.sudokuIsRunningSignal.set(false);
        } else {
            this.tspProgressSignal.set(null);
            this.tspProgressHistorySignal.set([]);
            this.tspIsRunningSignal.set(false);
        }
    }

    /**
     * Clears all progress data for all solver types
     */
    clearAllProgress(): void {
        this.clearProgress('sudoku');
        this.clearProgress('tsp');
    }

    /**
     * Gets current running state for a specific solver type
     */
    isRunning(type: 'sudoku' | 'tsp'): boolean {
        return type === 'sudoku' ? this.sudokuIsRunningSignal() : this.tspIsRunningSignal();
    }
}

