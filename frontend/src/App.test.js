import { render, screen } from '@testing-library/react';
import App from './App';

test('renders DeenGuide brand', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/DeenGuide/i);
  expect(brandElements.length).toBeGreaterThan(0);
});
