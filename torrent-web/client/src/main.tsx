import { render } from 'preact';
import AppWithRouter from './App';
import './styles/main.css';

render(<AppWithRouter />, document.getElementById('app')!);