import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule],
  template: `
    <div class="home">
      <header class="hero">
        <h1>Tycho Solver Demo</h1>
        <p class="subtitle">Interactive Metaheuristic Algorithm Demonstrations</p>
        <p class="description">
          Explore the power of metaheuristic algorithms through interactive browser-based demos. 
          Watch as local search algorithms solve complex optimization problems in real-time.
        </p>
      </header>

      <section class="demos">
        <h2>Available Demos</h2>
        
        <div class="demo-grid">
          <div class="demo-card">
            <div class="demo-icon">🧩</div>
            <h3>Sudoku Solver</h3>
            <p>
              Watch a local search algorithm iteratively improve candidate solutions 
              to solve a challenging 9x9 Sudoku puzzle. Visualize the search process 
              and fitness improvement in real-time.
            </p>
            <div class="demo-features">
              <span class="feature">Local Search</span>
              <span class="feature">Real-time Search</span>
              <span class="feature">D3.js Visualization</span>
            </div>
            <a routerLink="/sudoku" class="demo-button">Try Sudoku Demo</a>
          </div>

          <div class="demo-card">
            <div class="demo-icon">🗺️</div>
            <h3>Traveling Salesman Problem</h3>
            <p>
              Experience parallel local search as it finds the shortest route through 
              Spanish cities. Watch the algorithm explore neighborhoods and converge 
              to near-optimal solutions.
            </p>
            <div class="demo-features">
              <span class="feature">Parallel Local Search</span>
              <span class="feature">Interactive Map</span>
              <span class="feature">Real Cities Data</span>
            </div>
            <a routerLink="/tsp" class="demo-button">Try TSP Demo</a>
          </div>
        </div>
      </section>

      <section class="about">
        <h2>About Tycho Solver</h2>
        <div class="about-content">
          <div class="about-text">
            <p>
              Tycho Solver is a modern metaheuristic optimization framework that brings 
              the power of evolutionary algorithms, local search, and hybrid methods to 
              JavaScript and TypeScript environments.
            </p>
            
            <h3>Key Features</h3>
            <ul>
              <li><strong>Multiple Algorithms:</strong> Local Search, Parallel Local Search</li>
              <li><strong>Browser Compatible:</strong> Run optimization algorithms directly in the browser</li>
              <li><strong>TypeScript Support:</strong> Full type safety and modern development experience</li>
              <li><strong>Flexible Architecture:</strong> Easy to extend and customize for specific problems</li>
              <li><strong>Real-time Visualization:</strong> Monitor algorithm progress with interactive charts</li>
            </ul>
            
            <h3>Installation</h3>
            <div class="code-block">
              <code>npm install tycho-solver</code>
            </div>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-number">3</div>
              <div class="stat-label">Core Algorithms</div>
            </div>
            <div class="stat">
              <div class="stat-number">100%</div>
              <div class="stat-label">TypeScript</div>
            </div>
            <div class="stat">
              <div class="stat-number">0</div>
              <div class="stat-label">Dependencies</div>
            </div>
          </div>
        </div>
      </section>

      <section class="getting-started">
        <h2>Getting Started</h2>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>Choose a Demo</h3>
              <p>Select either the Sudoku or TSP demo to see metaheuristics in action</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>Adjust Parameters</h3>
              <p>Experiment with algorithm parameters to see how they affect performance</p>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>Watch & Learn</h3>
              <p>Observe real-time visualization of the optimization process</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .hero {
      text-align: center;
      padding: 80px 20px;
      color: white;
    }

    .hero h1 {
      font-size: 3.5rem;
      margin-bottom: 1rem;
      font-weight: 300;
    }

    .subtitle {
      font-size: 1.4rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }

    .description {
      font-size: 1.1rem;
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
      opacity: 0.8;
    }

    .demos {
      padding: 80px 20px;
      background: white;
    }

    .demos h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 3rem;
      color: #333;
    }

    .demo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 2rem;
      max-width: 1000px;
      margin: 0 auto;
    }

    .demo-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .demo-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .demo-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .demo-card h3 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #333;
    }

    .demo-card p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .demo-features {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
      margin-bottom: 2rem;
    }

    .feature {
      background: #667eea;
      color: white;
      padding: 0.3rem 0.8rem;
      border-radius: 15px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .demo-button {
      display: inline-block;
      background: #28a745;
      color: white;
      padding: 0.8rem 2rem;
      border-radius: 25px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.3s ease;
    }

    .demo-button:hover {
      background: #218838;
    }

    .about {
      padding: 80px 20px;
      background: #f8f9fa;
    }

    .about h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 3rem;
      color: #333;
    }

    .about-content {
      max-width: 1000px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 3rem;
      align-items: start;
    }

    .about-text h3 {
      color: #333;
      margin: 2rem 0 1rem 0;
    }

    .about-text ul {
      list-style: none;
      padding: 0;
    }

    .about-text li {
      margin-bottom: 0.8rem;
      padding-left: 1.5rem;
      position: relative;
    }

    .about-text li:before {
      content: "✓";
      color: #28a745;
      font-weight: bold;
      position: absolute;
      left: 0;
    }

    .code-block {
      background: #2d3748;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      margin: 1rem 0;
    }

    .stats {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .stat {
      text-align: center;
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .stat-number {
      font-size: 2.5rem;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: #666;
      font-weight: 500;
    }

    .getting-started {
      padding: 80px 20px;
      background: white;
    }

    .getting-started h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 3rem;
      color: #333;
    }

    .steps {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .step {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .step-number {
      width: 60px;
      height: 60px;
      background: #667eea;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: bold;
      flex-shrink: 0;
    }

    .step-content h3 {
      margin-bottom: 0.5rem;
      color: #333;
    }

    .step-content p {
      color: #666;
      line-height: 1.6;
    }

    @media (max-width: 768px) {
      .hero h1 {
        font-size: 2.5rem;
      }

      .demo-grid {
        grid-template-columns: 1fr;
      }

      .about-content {
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .stats {
        flex-direction: row;
        justify-content: space-around;
      }

      .step {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class HomeComponent {
}
