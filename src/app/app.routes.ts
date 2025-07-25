import { Routes } from '@angular/router';
import { HomeComponent } from './components/home.component';
import { SudokuDemoComponent } from './components/sudoku-demo.component';
import { TSPDemoComponent } from './components/tsp-demo.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'sudoku', component: SudokuDemoComponent },
    { path: 'tsp', component: TSPDemoComponent },
    { path: '**', redirectTo: '' }
];
