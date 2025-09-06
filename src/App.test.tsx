import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders WG Casting app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/WG Casting/i);
  expect(titleElement).toBeInTheDocument();
});
