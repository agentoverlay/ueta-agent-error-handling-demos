import React from 'react';
import { UetaLiabilityCalculator } from './components/UetaLiabilityCalculator';
import './App.css';

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F3F4F6',
      padding: '20px'
    }}>
      <UetaLiabilityCalculator />
    </div>
  );
}

export default App;