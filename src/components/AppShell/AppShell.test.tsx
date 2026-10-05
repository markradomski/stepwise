import { render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders the Stepwise heading and tagline', () => {
    render(<AppShell />);
    expect(screen.getByRole('heading', { level: 1, name: 'Stepwise' })).toBeInTheDocument();
    expect(screen.getByText('Adaptive maths practice.')).toBeInTheDocument();
  });
});
