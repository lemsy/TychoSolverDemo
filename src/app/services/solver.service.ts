import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GeneticAlgorithm } from 'tycho-solver';
import { LocalSearch } from 'tycho-solver';
import type {
    FitnessFunction,
    EvolutionaryConfig,
    ObjectiveFunction,
    NeighborhoodFunction,
    LocalSearchOptions,
    LocalSearchResult
} from 'tycho-solver';

export interface SolverResult {
    solution: any;
    fitness: number;
    iteration: number;
    executionTime: number;
}

export interface SolverProgress {
    iteration: number;
    currentFitness: number;
    bestFitness: number;
    solution: any;
}

@Injectable({
    providedIn: 'root'
})
export class SolverService {
    private progressSubject = new BehaviorSubject<SolverProgress | null>(null);
    public progress$ = this.progressSubject.asObservable();

    private isRunningSubject = new BehaviorSubject<boolean>(false);
    public isRunning$ = this.isRunningSubject.asObservable();

    constructor() { }

    updateProgress(progress: SolverProgress): void {
        this.progressSubject.next(progress);
    }

    setRunning(running: boolean): void {
        this.isRunningSubject.next(running);
    }

    // Sudoku-specific methods (using TychoSolver GeneticAlgorithm)
    solveSudoku(
        initialGrid: number[][],
        options: {
            populationSize?: number;
            maxIterations?: number;
            mutationRate?: number;
        } = {}
    ): Promise<SolverResult> {
        return new Promise(async (resolve, reject) => {
            try {
                this.setRunning(true);
                const startTime = Date.now();

                // Initialize parameters
                const {
                    populationSize = 100,
                    maxIterations = 100,
                    mutationRate = 0.2
                } = options;

                // Get empty cells positions for constraint handling
                const emptyCells: [number, number][] = [];
                for (let row = 0; row < 9; row++) {
                    for (let col = 0; col < 9; col++) {
                        if (initialGrid[row][col] === 0) {
                            emptyCells.push([row, col]);
                        }
                    }
                }

                // Helper to deep copy a grid
                const copyGrid = (grid: number[][]): number[][] => {
                    return grid.map(row => [...row]);
                };

                // Fitness function: count non-conflicting cells (from original demo)
                const sudokuFitness: FitnessFunction<number[][]> = (individual: number[][]): number => {
                    let score = 0;
                    // Rows
                    for (let i = 0; i < 9; i++) {
                        const seen = new Set();
                        for (let j = 0; j < 9; j++) seen.add(individual[i][j]);
                        score += seen.size;
                    }
                    // Columns
                    for (let j = 0; j < 9; j++) {
                        const seen = new Set();
                        for (let i = 0; i < 9; i++) seen.add(individual[i][j]);
                        score += seen.size;
                    }
                    // Subgrids (3x3 boxes)
                    for (let bi = 0; bi < 9; bi += 3) {
                        for (let bj = 0; bj < 9; bj += 3) {
                            const seen = new Set();
                            for (let i = 0; i < 3; i++) {
                                for (let j = 0; j < 3; j++) {
                                    seen.add(individual[bi + i][bj + j]);
                                }
                            }
                            score += seen.size;
                        }
                    }
                    return score;
                };

                // Create initial population
                const initialPopulation: number[][][] = [];
                for (let i = 0; i < populationSize; i++) {
                    const grid = copyGrid(initialGrid);
                    emptyCells.forEach(([row, col]) => {
                        grid[row][col] = Math.floor(Math.random() * 9) + 1;
                    });
                    initialPopulation.push(grid);
                }

                // Configure evolutionary algorithm
                const config: EvolutionaryConfig = {
                    populationSize: populationSize,
                    maxGenerations: maxIterations,
                    mutationRate: mutationRate,
                    crossoverRate: 0.8,
                    elitism: Math.floor(populationSize * 0.1)
                };

                // Create GeneticAlgorithm instance
                const ga = new GeneticAlgorithm(initialPopulation, sudokuFitness, config);

                // Monitor progress during evolution
                let generation = 0;
                const maxFitness = 243; // Perfect Sudoku score (9*9*3)

                const evolveWithProgress = async () => {
                    while (generation < maxIterations) {
                        const currentBest = ga.getBestSolution();
                        const currentFitness = ga.getBestFitness();

                        // Update progress
                        this.updateProgress({
                            iteration: generation,
                            currentFitness: currentFitness,
                            bestFitness: currentFitness,
                            solution: currentBest
                        });

                        // Check if solved
                        if (currentFitness >= maxFitness) {
                            this.setRunning(false);
                            return {
                                solution: currentBest,
                                fitness: currentFitness,
                                iteration: generation,
                                executionTime: Date.now() - startTime
                            };
                        }

                        // Evolve one generation
                        await ga.evolve(1);
                        generation++;

                        // Small delay for visualization
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }

                    // Final solution
                    const finalSolution = ga.getBestSolution();
                    const finalFitness = ga.getBestFitness();
                    this.setRunning(false);

                    return {
                        solution: finalSolution,
                        fitness: finalFitness,
                        iteration: generation,
                        executionTime: Date.now() - startTime
                    };
                };

                const result = await evolveWithProgress();
                resolve(result);

            } catch (error) {
                this.setRunning(false);
                reject(error);
            }
        });
    }
    const parent2 = this.tournamentSelection(population, 3);

    // Crossover
    const child = this.sudokuCrossover(parent1.genome, parent2.genome, initialGrid);

    // Mutation
    if(Math.random() < mutationRate) {
    this.sudokuMutation(child, initialGrid);
}

newPopulation.push({
    genome: child,
    fitness: sudokuFitness(child)
});
          }

// Replace population
population.splice(0, population.length, ...newPopulation);
population.sort((a, b) => b.fitness - a.fitness);

// Update best solution
if (population[0].fitness > bestSolution.fitness) {
    bestSolution = population[0];
}

// Update progress
this.updateProgress({
    iteration: generation,
    currentFitness: population[0].fitness,
    bestFitness: bestSolution.fitness,
    solution: bestSolution.genome
});

generation++;
setTimeout(evolve, 10);
        };

evolve();
        
      } catch (error) {
    this.setRunning(false);
    reject(error);
}
    });
  }

// TSP-specific methods (following original demo patterns with simulated annealing)
solveTSP(
    cities: { name: string; x: number; y: number }[],
    options: {
        maxIterations?: number;
        temperature?: number;
    } = {}
): Promise < SolverResult > {
    return new Promise((resolve, reject) => {
        try {
            this.setRunning(true);
            const startTime = Date.now();

            const {
                maxIterations = 10000,
                temperature = 100
            } = options;

            // TSP objective function (from original demo pattern)
            const tspObjective = (tour: number[]): number => {
                let distance = 0;
                for (let i = 0; i < tour.length; i++) {
                    const current = cities[tour[i]];
                    const next = cities[tour[(i + 1) % tour.length]];
                    distance += Math.sqrt(
                        Math.pow(current.x - next.x, 2) + Math.pow(current.y - next.y, 2)
                    );
                }
                return distance;
            };

            // TSP neighborhood function (2-opt swap, from original demo pattern)
            const tspNeighborhood = (tour: number[]): number[][] => {
                const neighbors = [];
                for (let i = 0; i < tour.length - 1; i++) {
                    for (let j = i + 1; j < tour.length; j++) {
                        const neighbor = [...tour];
                        // Reverse the segment between i and j
                        const segment = neighbor.slice(i, j + 1).reverse();
                        neighbor.splice(i, j - i + 1, ...segment);
                        neighbors.push(neighbor);
                    }
                }
                return neighbors;
            };

            // Initialize with random tour
            let currentTour = [...Array(cities.length).keys()];
            this.shuffleArray(currentTour);

            let bestTour = [...currentTour];
            let currentDistance = tspObjective(currentTour);
            let bestDistance = currentDistance;

            let iteration = 0;
            let temp = temperature;
            const coolingRate = 0.995; // From original demo

            // Simulated Annealing search (following original demo pattern)
            const search = () => {
                if (iteration >= maxIterations) {
                    this.setRunning(false);
                    resolve({
                        solution: bestTour,
                        fitness: -bestDistance, // Negative because we want to minimize distance
                        iteration,
                        executionTime: Date.now() - startTime
                    });
                    return;
                }

                // Generate random neighbor using 2-opt
                const newTour = this.twoOptSwap(currentTour);
                const newDistance = tspObjective(newTour);

                // Simulated annealing acceptance criteria
                const delta = newDistance - currentDistance;
                const acceptanceProbability = delta < 0 ? 1 : Math.exp(-delta / temp);

                if (Math.random() < acceptanceProbability) {
                    currentTour = newTour;
                    currentDistance = newDistance;

                    // Update best solution if improved
                    if (currentDistance < bestDistance) {
                        bestTour = [...currentTour];
                        bestDistance = currentDistance;
                    }
                }

                // Cool down temperature
                temp *= coolingRate;

                // Update progress
                this.updateProgress({
                    iteration,
                    currentFitness: -currentDistance,
                    bestFitness: -bestDistance,
                    solution: bestTour
                });

                iteration++;

                // Continue search asynchronously (small delay for visualization)
                setTimeout(search, 1);
            };

            search();

        } catch (error) {
            this.setRunning(false);
            reject(error);
        }
    });
}

  // Helper methods for Sudoku (following original demo patterns)
  private tournamentSelection(population: { genome: number[][], fitness: number }[], tournamentSize: number): { genome: number[][], fitness: number } {
    let best = population[Math.floor(Math.random() * population.length)];

    for (let i = 1; i < tournamentSize; i++) {
        const candidate = population[Math.floor(Math.random() * population.length)];
        if (candidate.fitness > best.fitness) {
            best = candidate;
        }
    }

    return best;
}

  private sudokuCrossover(parent1: number[][], parent2: number[][], initialGrid: number[][]): number[][] {
    const child = initialGrid.map(row => [...row]);

    // For each cell that's not a clue, randomly choose from parent1 or parent2
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (child[i][j] === 0) {
                child[i][j] = Math.random() < 0.5 ? parent1[i][j] : parent2[i][j];
            }
        }
    }

    return child;
}

  private sudokuMutation(individual: number[][], initialGrid: number[][]): void {
    // Find all empty cells in the original grid
    const emptyCells: [number, number][] = [];
    for(let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
        if (initialGrid[i][j] === 0) {
            emptyCells.push([i, j]);
        }
    }
}

// Mutate 1-3 random empty cells
const mutationCount = Math.floor(Math.random() * 3) + 1;
for (let m = 0; m < mutationCount && emptyCells.length > 0; m++) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const [i, j] = emptyCells[randomIndex];
    individual[i][j] = Math.floor(Math.random() * 9) + 1;
}
  }

  // Legacy helper methods (keeping for compatibility but not using the complex ones)
  private initializeSudokuPopulation(initialGrid: number[][], size: number): number[][][] {
    const population = [];
    for (let i = 0; i < size; i++) {
        const individual = this.createRandomSudoku(initialGrid);
        population.push(individual);
    }
    return population;
}

  private createRandomSudoku(initialGrid: number[][]): number[][] {
    const grid = initialGrid.map(row => [...row]);
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (grid[i][j] === 0) {
                grid[i][j] = Math.floor(Math.random() * 9) + 1;
            }
        }
    }
    return grid;
}

  private calculateSudokuFitness(grid: number[][]): number {
    let conflicts = 0;

    // Check rows
    for (let i = 0; i < 9; i++) {
        const seen = new Set();
        for (let j = 0; j < 9; j++) {
            if (seen.has(grid[i][j])) conflicts++;
            seen.add(grid[i][j]);
        }
    }

    // Check columns
    for (let j = 0; j < 9; j++) {
        const seen = new Set();
        for (let i = 0; i < 9; i++) {
            if (seen.has(grid[i][j])) conflicts++;
            seen.add(grid[i][j]);
        }
    }

    // Check 3x3 boxes
    for (let box = 0; box < 9; box++) {
        const seen = new Set();
        const startRow = Math.floor(box / 3) * 3;
        const startCol = (box % 3) * 3;

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const val = grid[startRow + i][startCol + j];
                if (seen.has(val)) conflicts++;
                seen.add(val);
            }
        }
    }

    return 243 - conflicts; // 243 is maximum possible (9*9*3)
}

  private selectParent(population: number[][][]): number[][] {
    // Tournament selection
    const tournamentSize = 3;
    let best = population[Math.floor(Math.random() * population.length)];
    let bestFitness = this.calculateSudokuFitness(best);

    for (let i = 1; i < tournamentSize; i++) {
        const candidate = population[Math.floor(Math.random() * population.length)];
        const fitness = this.calculateSudokuFitness(candidate);
        if (fitness > bestFitness) {
            best = candidate;
            bestFitness = fitness;
        }
    }

    return best;
}

  private crossoverSudoku(parent1: number[][], parent2: number[][], initialGrid: number[][]): number[][] {
    const child = initialGrid.map(row => [...row]);

    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (child[i][j] === 0) {
                child[i][j] = Math.random() < 0.5 ? parent1[i][j] : parent2[i][j];
            }
        }
    }

    return child;
}

  private mutateSudoku(individual: number[][], initialGrid: number[][]): number[][] {
    const mutated = individual.map(row => [...row]);

    // Find empty cells in original
    const emptyCells = [];
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (initialGrid[i][j] === 0) {
                emptyCells.push([i, j]);
            }
        }
    }

    // Mutate random empty cell
    if (emptyCells.length > 0) {
        const [i, j] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        mutated[i][j] = Math.floor(Math.random() * 9) + 1;
    }

    return mutated;
}

  // Helper methods for TSP
  private calculateTSPDistance(tour: number[], cities: { x: number; y: number }[]): number {
    let distance = 0;
    for (let i = 0; i < tour.length; i++) {
        const current = cities[tour[i]];
        const next = cities[tour[(i + 1) % tour.length]];
        distance += Math.sqrt(
            Math.pow(current.x - next.x, 2) + Math.pow(current.y - next.y, 2)
        );
    }
    return distance;
}

  private twoOptSwap(tour: number[]): number[] {
    const newTour = [...tour];
    const i = Math.floor(Math.random() * tour.length);
    const j = Math.floor(Math.random() * tour.length);

    if (i !== j) {
        const start = Math.min(i, j);
        const end = Math.max(i, j);

        // Reverse the segment between start and end
        const segment = newTour.slice(start, end + 1).reverse();
        newTour.splice(start, end - start + 1, ...segment);
    }

    return newTour;
}

  private shuffleArray(array: any[]): void {
    for(let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
}
  }
}
