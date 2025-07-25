import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Import Tycho solver components
import {
    LocalSearch,
    ParallelLocalSearch,
} from 'tycho-solver';

export interface SolverProgress {
    iteration: number;
    currentFitness: number;
    bestFitness: number;
    improvement?: number;
    isComplete?: boolean;
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
    private progressSubject = new BehaviorSubject<SolverProgress | null>(null);
    public progress$ = this.progressSubject.asObservable();

    private isRunningSubject = new BehaviorSubject<boolean>(false);
    public isRunning$ = this.isRunningSubject.asObservable();

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
     * Solves a Sudoku puzzle using Genetic Algorithm (alternative implementation)
     */
    async solveSudokuWithGA(
        initialGrid?: SudokuGrid,
        options: {
            populationSize?: number;
            maxIterations?: number;
            mutationRate?: number;
            crossoverRate?: number;
        } = {}
    ): Promise<SolverResult> {
        const startTime = performance.now();
        this.isRunningSubject.next(true);

        const grid = initialGrid || this.copyGrid(this.DEFAULT_SUDOKU);
        const {
            populationSize = 50,
            maxIterations = 100,
            mutationRate = 0.1,
            crossoverRate = 0.8
        } = options;

        try {
            // Simple GA implementation for Sudoku
            let population: SudokuGrid[] = [];

            // Initialize population
            for (let i = 0; i < populationSize; i++) {
                population.push(this.createSudokuIndividual(grid));
            }

            let bestSolution = population[0];
            let bestFitness = this.sudokuFitness(bestSolution);
            let generation = 0;

            // Report initial progress
            this.progressSubject.next({
                iteration: generation,
                currentFitness: bestFitness,
                bestFitness: bestFitness,
                isComplete: false
            });

            // Evolution loop
            for (generation = 0; generation < maxIterations; generation++) {
                // Evaluate population
                const evaluated = population.map(individual => ({
                    individual,
                    fitness: this.sudokuFitness(individual)
                }));

                // Update best
                const currentBest = evaluated.reduce((prev, curr) =>
                    curr.fitness > prev.fitness ? curr : prev
                );

                if (currentBest.fitness > bestFitness) {
                    bestFitness = currentBest.fitness;
                    bestSolution = this.copyGrid(currentBest.individual);
                }

                // Report progress after each generation
                this.progressSubject.next({
                    iteration: generation + 1,
                    currentFitness: currentBest.fitness,
                    bestFitness: bestFitness,
                    isComplete: false
                });

                // Check if solved
                if (bestFitness >= this.SUDOKU_SIZE * 3) break;

                // Selection and reproduction
                const newPopulation: SudokuGrid[] = [];

                // Elitism - keep best 10%
                const eliteCount = Math.floor(populationSize * 0.1);
                const elite = evaluated
                    .sort((a, b) => b.fitness - a.fitness)
                    .slice(0, eliteCount)
                    .map(e => this.copyGrid(e.individual));

                newPopulation.push(...elite);

                // Generate rest of population
                while (newPopulation.length < populationSize) {
                    // Tournament selection
                    const parent1 = this.tournamentSelection(evaluated, 3);
                    const parent2 = this.tournamentSelection(evaluated, 3);

                    // Crossover
                    if (Math.random() < crossoverRate) {
                        const [child1, child2] = this.sudokuCrossover(parent1.individual, parent2.individual, grid);
                        newPopulation.push(child1);
                        if (newPopulation.length < populationSize) {
                            newPopulation.push(child2);
                        }
                    } else {
                        newPopulation.push(this.copyGrid(parent1.individual));
                        if (newPopulation.length < populationSize) {
                            newPopulation.push(this.copyGrid(parent2.individual));
                        }
                    }
                }

                // Mutation
                newPopulation.forEach(individual => {
                    if (Math.random() < mutationRate) {
                        this.sudokuMutate(individual, grid);
                    }
                });

                population = newPopulation;
            }

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            const solverResult: SolverResult = {
                solution: bestSolution,
                fitness: bestFitness,
                iterations: generation,
                executionTime
            };

            this.progressSubject.next({
                iteration: generation,
                currentFitness: bestFitness,
                bestFitness: bestFitness,
                isComplete: true
            });

            return solverResult;
        } finally {
            this.isRunningSubject.next(false);
        }
    }

    /**
     * Tournament selection for GA
     */
    private tournamentSelection(population: Array<{ individual: SudokuGrid, fitness: number }>, tournamentSize: number) {
        let best = population[Math.floor(Math.random() * population.length)];
        for (let i = 1; i < tournamentSize; i++) {
            const candidate = population[Math.floor(Math.random() * population.length)];
            if (candidate.fitness > best.fitness) {
                best = candidate;
            }
        }
        return best;
    }

    /**
     * Crossover for Sudoku (row-based)
     */
    private sudokuCrossover(parent1: SudokuGrid, parent2: SudokuGrid, initialGrid: SudokuGrid): [SudokuGrid, SudokuGrid] {
        const child1 = this.copyGrid(parent1);
        const child2 = this.copyGrid(parent2);

        // Single-point crossover at row level
        const crossoverPoint = Math.floor(Math.random() * this.SUDOKU_SIZE);

        for (let i = crossoverPoint; i < this.SUDOKU_SIZE; i++) {
            for (let j = 0; j < this.SUDOKU_SIZE; j++) {
                if (initialGrid[i][j] === 0) { // Only change non-clue cells
                    [child1[i][j], child2[i][j]] = [child2[i][j], child1[i][j]];
                }
            }
        }

        return [child1, child2];
    }

    /**
     * Mutation for Sudoku
     */
    private sudokuMutate(individual: SudokuGrid, initialGrid: SudokuGrid): void {
        const mutations = Math.floor(Math.random() * 3) + 1; // 1-3 mutations

        for (let m = 0; m < mutations; m++) {
            let i, j;
            do {
                i = Math.floor(Math.random() * this.SUDOKU_SIZE);
                j = Math.floor(Math.random() * this.SUDOKU_SIZE);
            } while (initialGrid[i][j] !== 0); // Only mutate non-clue cells

            individual[i][j] = Math.floor(Math.random() * this.SUDOKU_SIZE) + 1;
        }
    }

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
        this.isRunningSubject.next(true);

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
            this.progressSubject.next({
                iteration: 0,
                currentFitness: bestFitnessFound,
                bestFitness: bestFitnessFound,
                isComplete: false
            });

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

                        this.progressSubject.next({
                            iteration: iter,
                            currentFitness: fitness,
                            bestFitness: bestFitnessFound,
                            isComplete: false
                        });
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

            this.progressSubject.next({
                iteration: result.iterations,
                currentFitness: result.fitness,
                bestFitness: Math.max(bestFitnessFound, result.fitness),
                isComplete: true
            });

            return solverResult;
        } finally {
            this.isRunningSubject.next(false);
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
        this.isRunningSubject.next(true);

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
            let bestFitness = -this.calculateTourDistance(initialSolutions[0], cities);

            const results = await parallelLocalSearch.search(
                initialSolutions,
                (tour: number[]) => -this.calculateTourDistance(tour, cities), // Negative because we want to minimize distance
                (tour: number[]) => this.tspNeighborhood(tour),
                {
                    maxIterations,
                    maximize: true, // Maximize negative distance (minimize actual distance)
                    onClimb: async (solution, fitness, iter) => {
                        iteration = iter;
                        this.progressSubject.next({
                            iteration,
                            currentFitness: -fitness, // Convert back to positive distance
                            bestFitness: -fitness,
                            isComplete: false
                        });
                    }
                }
            );

            // Find the best result from all parallel searches
            const bestResult = results.reduce((best, current) =>
                current.fitness > best.fitness ? current : best
            );

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            const solverResult: SolverResult = {
                solution: bestResult.solution,
                fitness: -bestResult.fitness, // Convert back to distance (positive)
                iterations: bestResult.iterations,
                executionTime
            };

            this.progressSubject.next({
                iteration: bestResult.iterations,
                currentFitness: -bestResult.fitness,
                bestFitness: -bestResult.fitness,
                isComplete: true
            });

            return solverResult;
        } finally {
            this.isRunningSubject.next(false);
        }
    }

    /**
     * Solves TSP using regular Local Search (single-threaded)
     */
    async solveTSPSingleThreaded(
        cities: City[],
        options: {
            maxIterations?: number;
        } = {}
    ): Promise<SolverResult> {
        const startTime = performance.now();
        this.isRunningSubject.next(true);

        const { maxIterations = 10000 } = options;

        try {
            // Create initial solution (random permutation)
            const initialSolution = [...Array(cities.length).keys()].sort(() => Math.random() - 0.5);

            // Setup Local Search
            const localSearch = new LocalSearch<number[]>();

            let iteration = 0;
            let bestFitness = -this.calculateTourDistance(initialSolution, cities);

            const result = await localSearch.search(
                initialSolution,
                (tour: number[]) => -this.calculateTourDistance(tour, cities), // Negative because we want to minimize distance
                (tour: number[]) => this.tspNeighborhood(tour),
                {
                    maxIterations,
                    maximize: true, // Maximize negative distance (minimize actual distance)
                    onClimb: async (solution, fitness, iter) => {
                        iteration = iter;
                        this.progressSubject.next({
                            iteration,
                            currentFitness: -fitness, // Convert back to positive distance
                            bestFitness: -fitness,
                            isComplete: false
                        });
                    }
                }
            );

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            const solverResult: SolverResult = {
                solution: result.solution,
                fitness: -result.fitness, // Convert back to distance (positive)
                iterations: result.iterations,
                executionTime
            };

            this.progressSubject.next({
                iteration: result.iterations,
                currentFitness: -result.fitness,
                bestFitness: -result.fitness,
                isComplete: true
            });

            return solverResult;
        } finally {
            this.isRunningSubject.next(false);
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
    private calculateTourDistance(tour: number[], cities: City[]): number {
        let totalDistance = 0;
        for (let i = 0; i < tour.length; i++) {
            const from = cities[tour[i]];
            const to = cities[tour[(i + 1) % tour.length]];
            totalDistance += this.calculateDistance(from, to);
        }
        return totalDistance;
    }

    /**
     * Calculates Euclidean distance between two cities
     */
    private calculateDistance(city1: City, city2: City): number {
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
     * Clears current progress and resets running state
     * Should be called when switching between different solver types
     */
    clearProgress(): void {
        this.progressSubject.next(null);
        this.isRunningSubject.next(false);
    }

    /**
     * Gets current running state
     */
    isRunning(): boolean {
        return this.isRunningSubject.value;
    }
}
